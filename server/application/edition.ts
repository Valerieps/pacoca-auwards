// The year's edition and its calendar (docs/spec/premiacao.md, "A edição e o calendário").
import type { EditionView } from '../../src/application/api-contract';
import { fromBrasiliaLocal } from '../../src/domain/award/brasilia';
import {
  checkCalendar,
  isPhase,
  mergeCalendar,
  PHASES,
  startNow,
  stateAt,
  TIMED_PHASES,
  type Calendar,
  type Phase,
  type PhaseState,
} from '../../src/domain/award/phases';
import { isOrganizer } from '../../src/domain/group/roles';
import { failure, type CommandResult, type Context } from './context';
import type { Member } from './members';

interface EditionRow {
  year: number;
  name: string;
  phase: string;
  phase_ended: number;
  phase_starts_at: string;
  phase_ends_at: string;
}

function toView(row: EditionRow): EditionView {
  return {
    year: row.year,
    name: row.name,
    phase: isPhase(row.phase) ? row.phase : 'collection',
    ended: row.phase_ended === 1,
    startsAt: JSON.parse(row.phase_starts_at) as Calendar['startsAt'],
    endsAt: JSON.parse(row.phase_ends_at) as Calendar['endsAt'],
  };
}

/** The latest edition, which every member sees; what every phase-dependent rule reads. */
export function currentEdition(ctx: Context): EditionView {
  const [row] = ctx.sql.all<EditionRow>('SELECT * FROM editions ORDER BY year DESC LIMIT 1');
  return toView(row);
}

/** One side of the calendar asked for, in Brasília time; null when a date is not a time. */
function parseDates<P extends Phase>(phases: readonly P[], asked: unknown): Partial<Record<P, string>> | null {
  if (asked === undefined) return {};
  if (typeof asked !== 'object' || asked === null || Array.isArray(asked)) return null;
  const dates: Partial<Record<P, string>> = {};
  for (const phase of phases) {
    const value = (asked as Record<string, unknown>)[phase];
    if (value === undefined || value === null || value === '') continue;
    const at = typeof value === 'string' ? fromBrasiliaLocal(value) : null;
    if (!at) return null;
    dates[phase] = at;
  }
  return dates;
}

function save(ctx: Context, edition: EditionView, state: PhaseState, calendar: Calendar): CommandResult<EditionView> {
  ctx.sql.run(
    'UPDATE editions SET phase = ?, phase_ended = ?, phase_starts_at = ?, phase_ends_at = ? WHERE year = ?',
    state.phase,
    state.ended ? 1 : 0,
    JSON.stringify(calendar.startsAt),
    JSON.stringify(calendar.endsAt),
    edition.year,
  );
  return { ok: true, value: { ...edition, phase: state.phase, ended: state.ended, ...calendar }, changed: ['edition'] };
}

/** Organizador only: when each phase starts and ends, in Brasília time. */
export function setCalendar(
  ctx: Context,
  actor: Member,
  input: { startsAt?: unknown; endsAt?: unknown },
): CommandResult<EditionView> {
  if (!isOrganizer(actor)) return failure('forbidden');
  if (input.startsAt === undefined && input.endsAt === undefined) return failure('invalid');
  const startsAt = parseDates(PHASES, input.startsAt);
  const endsAt = parseDates(TIMED_PHASES, input.endsAt);
  if (!startsAt || !endsAt) return failure('invalid');

  const edition = currentEdition(ctx);
  const calendar = mergeCalendar(edition, edition, { startsAt, endsAt });
  if (checkCalendar(edition, calendar, ctx.clock.now())) return failure('invalid');
  return save(ctx, edition, edition, calendar);
}

/** Organizador only: "Iniciar agora" starts the next phase now, whatever its date. */
export function startPhase(ctx: Context, actor: Member, input: { phase?: unknown }): CommandResult<EditionView> {
  if (!isOrganizer(actor)) return failure('forbidden');
  if (!isPhase(input.phase)) return failure('invalid');
  const edition = currentEdition(ctx);
  const now = ctx.clock.now();
  // A date the cron has not seen yet counts first, so only the real next phase can start.
  const state = stateAt(edition, edition, now);
  const calendar = startNow(state, edition, input.phase, now);
  if (!calendar) return failure('invalid');
  return save(ctx, edition, stateAt(state, calendar, now), calendar);
}

/**
 * Moves the edition on when a start or an end has passed (the cron calls it). Returns whether it
 * changed. What a phase change causes (registering the nominations at the end of Fase 2, making
 * the votes official at the end of Fase 4) joins this transaction when those phases are built.
 */
export function advancePhase(ctx: Context): boolean {
  const edition = currentEdition(ctx);
  const state = stateAt(edition, edition, ctx.clock.now());
  if (state.phase === edition.phase && state.ended === edition.ended) return false;
  ctx.sql.run('UPDATE editions SET phase = ?, phase_ended = ? WHERE year = ?', state.phase, state.ended ? 1 : 0, edition.year);
  return true;
}
