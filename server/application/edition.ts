// The year's edition and its calendar (docs/spec/premiacao.md, "A edição e o calendário").
import type { EditionView } from '../../src/application/api-contract';
import { fromBrasiliaLocal } from '../../src/domain/award/brasilia';
import { checkCalendar, isPhase, mergeCalendar, phaseAt, TIMED_PHASES, type Calendar, type Phase } from '../../src/domain/award/phases';
import { isOrganizer } from '../../src/domain/group/roles';
import { failure, type CommandResult, type Context } from './context';
import type { Member } from './members';

interface EditionRow {
  year: number;
  name: string;
  phase: string;
  phase_ends_at: string;
}

function toView(row: EditionRow): EditionView {
  return {
    year: row.year,
    name: row.name,
    phase: isPhase(row.phase) ? row.phase : 'collection',
    endsAt: JSON.parse(row.phase_ends_at) as Calendar,
  };
}

/** The latest edition, which every member sees; what every phase-dependent rule reads. */
export function currentEdition(ctx: Context): EditionView {
  const [row] = ctx.sql.all<EditionRow>('SELECT * FROM editions ORDER BY year DESC LIMIT 1');
  return toView(row);
}

/** Organizador only: the ends of the current and future phases, in Brasília time. */
export function setCalendar(ctx: Context, actor: Member, input: { endsAt?: unknown }): CommandResult<EditionView> {
  if (!isOrganizer(actor)) return failure('forbidden');
  if (typeof input.endsAt !== 'object' || input.endsAt === null || Array.isArray(input.endsAt)) return failure('invalid');
  const asked = input.endsAt as Record<string, unknown>;

  const requested: Calendar = {};
  for (const phase of TIMED_PHASES) {
    const value = asked[phase];
    if (value === undefined || value === null || value === '') continue;
    const end = typeof value === 'string' ? fromBrasiliaLocal(value) : null;
    if (!end) return failure('invalid');
    requested[phase] = end;
  }

  const edition = currentEdition(ctx);
  const calendar = mergeCalendar(edition.phase, edition.endsAt, requested);
  if (checkCalendar(edition.phase, calendar, ctx.clock.now())) return failure('invalid');
  ctx.sql.run('UPDATE editions SET phase_ends_at = ? WHERE year = ?', JSON.stringify(calendar), edition.year);
  return { ok: true, value: { ...edition, endsAt: calendar }, changed: ['edition'] };
}

/**
 * Moves the edition on when the end of its phase has passed (the cron calls it). Returns the phase
 * it entered, or null when nothing changed. What a phase change causes (registering the
 * nominations at the end of Fase 2, making the votes official at the end of Fase 4) joins this
 * transaction when those phases are built.
 */
export function advancePhase(ctx: Context): Phase | null {
  const edition = currentEdition(ctx);
  const phase = phaseAt(edition.phase, edition.endsAt, ctx.clock.now());
  if (phase === edition.phase) return null;
  ctx.sql.run('UPDATE editions SET phase = ? WHERE year = ?', phase, edition.year);
  return phase;
}
