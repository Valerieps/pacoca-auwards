// The edition's phases and its calendar (docs/spec/premiacao.md, "A edição e o calendário").
// Each phase ends on its own at the time the Organizador set, and the next one starts.

export type Phase = 'collection' | 'registration' | 'open' | 'voting' | 'announcement';

export const PHASES: readonly Phase[] = ['collection', 'registration', 'open', 'voting', 'announcement'];

/** The phases with an end date; the Anúncio ends when the Organizador reveals the winners. */
export type TimedPhase = Exclude<Phase, 'announcement'>;

export const TIMED_PHASES: readonly TimedPhase[] = ['collection', 'registration', 'open', 'voting'];

/** When each phase ends, as UTC ISO instants. A phase without an end does not end yet. */
export type Calendar = Partial<Record<TimedPhase, string>>;

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

/** Whether `phase` already ended while the edition is in `current`. */
export function hasEnded(phase: Phase, current: Phase): boolean {
  return PHASES.indexOf(phase) < PHASES.indexOf(current);
}

/**
 * The phase the edition is in at `now`: every end that has passed moves it on, so a cron that
 * missed several ends catches up in one step.
 */
export function phaseAt(current: Phase, calendar: Calendar, now: Date): Phase {
  let phase = current;
  while (phase !== 'announcement') {
    const end = calendar[phase];
    if (!end || Date.parse(end) > now.getTime()) break;
    phase = nextPhase(phase)!;
  }
  return phase;
}

export type CalendarError = 'past' | 'out_of_order';

/**
 * The calendar the Organizador asked for, with the ends of the phases that already ended kept as
 * they were: those cannot change.
 */
export function mergeCalendar(current: Phase, previous: Calendar, requested: Calendar): Calendar {
  const merged: Calendar = {};
  for (const phase of TIMED_PHASES) {
    const end = hasEnded(phase, current) ? previous[phase] : requested[phase];
    if (end) merged[phase] = end;
  }
  return merged;
}

/** The ends still to come must be in the future, and every end after the one before it. */
export function checkCalendar(current: Phase, calendar: Calendar, now: Date): CalendarError | null {
  let last = -Infinity;
  for (const phase of TIMED_PHASES) {
    const end = calendar[phase];
    if (!end) continue;
    const at = Date.parse(end);
    if (!hasEnded(phase, current) && at <= now.getTime()) return 'past';
    if (at <= last) return 'out_of_order';
    last = at;
  }
  return null;
}
