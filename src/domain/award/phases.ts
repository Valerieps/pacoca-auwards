// The edition's phases and its calendar (docs/spec/premiacao.md, "A edição e o calendário").
// Each phase ends on its own at the time the Organizador set, and the next one starts.

export type Phase = 'collection' | 'registration' | 'open' | 'voting' | 'announcement';

export const PHASES: readonly Phase[] = ['collection', 'registration', 'open', 'voting', 'announcement'];

/** The phases with an end date; the Anúncio ends when the Organizador reveals the winners. */
export type TimedPhase = Exclude<Phase, 'announcement'>;

export const TIMED_PHASES: readonly TimedPhase[] = ['collection', 'registration', 'open', 'voting'];

/** When each phase starts and ends, as UTC ISO instants. The Anúncio only starts. */
export interface Calendar {
  /** A phase without a start starts when the one before it ends. */
  readonly startsAt: Partial<Record<Phase, string>>;
  /** A phase without an end does not end. */
  readonly endsAt: Partial<Record<TimedPhase, string>>;
}

/** Where the edition is: in `phase`, or, when `ended`, in the break after it. */
export interface PhaseState {
  readonly phase: Phase;
  readonly ended: boolean;
}

export function isPhase(value: unknown): value is Phase {
  return typeof value === 'string' && (PHASES as readonly string[]).includes(value);
}

/** 1 to 4 for the numbered phases, null for the Anúncio. */
export function phaseNumber(phase: Phase): number | null {
  return phase === 'announcement' ? null : PHASES.indexOf(phase) + 1;
}

export function nextPhase(phase: Phase): Phase | null {
  return PHASES[PHASES.indexOf(phase) + 1] ?? null;
}

/** Whether `phase` already ended while the edition is at `state`. */
export function hasEnded(phase: Phase, state: PhaseState): boolean {
  const order = PHASES.indexOf(phase) - PHASES.indexOf(state.phase);
  return order < 0 || (order === 0 && state.ended);
}

/** Whether `phase` already started while the edition is at `state`. */
export function hasStarted(phase: Phase, state: PhaseState): boolean {
  return PHASES.indexOf(phase) <= PHASES.indexOf(state.phase);
}

/** The phase "Iniciar agora" can start: only the next one, so no phase is skipped. */
export function startablePhase(state: PhaseState): Phase | null {
  return nextPhase(state.phase);
}

/**
 * Where the edition is at `now`: every start and end that has passed moves it on, so a cron that
 * missed several catches up in one step.
 */
export function stateAt(state: PhaseState, calendar: Calendar, now: Date): PhaseState {
  let { phase, ended } = state;
  for (;;) {
    if (!ended) {
      const end = phase === 'announcement' ? undefined : calendar.endsAt[phase];
      if (!end || Date.parse(end) > now.getTime()) break;
      ended = true;
    }
    const next = nextPhase(phase);
    if (!next) break;
    // Ended, so the end is set: a next phase without a start starts right then.
    const start = calendar.startsAt[next] ?? calendar.endsAt[phase as TimedPhase]!;
    if (Date.parse(start) > now.getTime()) break;
    phase = next;
    ended = false;
  }
  return { phase, ended };
}

export type CalendarError = 'past' | 'out_of_order';

/**
 * The calendar the Organizador asked for, with the dates that already happened kept as they were:
 * those cannot change.
 */
export function mergeCalendar(state: PhaseState, previous: Calendar, requested: Calendar): Calendar {
  const startsAt: Partial<Record<Phase, string>> = {};
  const endsAt: Partial<Record<TimedPhase, string>> = {};
  for (const phase of PHASES) {
    const start = hasStarted(phase, state) ? previous.startsAt[phase] : requested.startsAt[phase];
    if (start) startsAt[phase] = start;
    if (phase === 'announcement') continue;
    const end = hasEnded(phase, state) ? previous.endsAt[phase] : requested.endsAt[phase];
    if (end) endsAt[phase] = end;
  }
  return { startsAt, endsAt };
}

/**
 * The dates still to come must be in the future, and in order: each phase ends after it starts, and
 * starts at or after the end of the one before it.
 */
export function checkCalendar(state: PhaseState, calendar: Calendar, now: Date): CalendarError | null {
  let last = -Infinity;
  let lastWasEnd = false;
  const check = (iso: string | undefined, happened: boolean, isEnd: boolean): CalendarError | null => {
    if (!iso) return null;
    const at = Date.parse(iso);
    if (!happened && at <= now.getTime()) return 'past';
    if (at < last || (at === last && (isEnd || !lastWasEnd))) return 'out_of_order';
    last = at;
    lastWasEnd = isEnd;
    return null;
  };
  for (const phase of PHASES) {
    const error =
      check(calendar.startsAt[phase], hasStarted(phase, state), false) ??
      (phase === 'announcement' ? null : check(calendar.endsAt[phase], hasEnded(phase, state), true));
    if (error) return error;
  }
  return null;
}

/**
 * "Iniciar agora": the next phase starts at `now`, and the current one, if still open, ends then.
 * Null when `phase` is not the one that can start.
 */
export function startNow(state: PhaseState, calendar: Calendar, phase: Phase, now: Date): Calendar | null {
  if (startablePhase(state) !== phase) return null;
  const at = now.toISOString();
  const endsAt = { ...calendar.endsAt };
  if (!state.ended && state.phase !== 'announcement') endsAt[state.phase] = at;
  return { startsAt: { ...calendar.startsAt, [phase]: at }, endsAt };
}
