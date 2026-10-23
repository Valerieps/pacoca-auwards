import { describe, expect, it } from 'vitest';
import { formatBrasilia, fromBrasiliaLocal, timeLeft, toBrasiliaLocal } from './brasilia';
import {
  checkCalendar,
  hasEnded,
  hasStarted,
  mergeCalendar,
  nextPhase,
  phaseNumber,
  startNow,
  stateAt,
  type Calendar,
  type PhaseState,
} from './phases';

const now = new Date('2026-11-01T12:00:00Z');
const inCollection: PhaseState = { phase: 'collection', ended: false };
const ends = (endsAt: Calendar['endsAt']): Calendar => ({ startsAt: {}, endsAt });

describe('phases', () => {
  it('go in order and number 1 to 4, then the Anúncio', () => {
    expect(nextPhase('collection')).toBe('registration');
    expect(nextPhase('voting')).toBe('announcement');
    expect(nextPhase('announcement')).toBeNull();
    expect(phaseNumber('collection')).toBe(1);
    expect(phaseNumber('voting')).toBe(4);
    expect(phaseNumber('announcement')).toBeNull();
    expect(hasEnded('collection', { phase: 'open', ended: false })).toBe(true);
    expect(hasEnded('open', { phase: 'open', ended: false })).toBe(false);
    expect(hasEnded('open', { phase: 'open', ended: true })).toBe(true);
    expect(hasStarted('open', { phase: 'open', ended: false })).toBe(true);
    expect(hasStarted('voting', { phase: 'open', ended: true })).toBe(false);
  });

  it('end only when their end has passed, and the next starts then when it has no start', () => {
    const calendar = ends({ collection: '2026-11-01T12:00:00Z', registration: '2026-12-01T12:00:00Z' });
    expect(stateAt(inCollection, calendar, new Date('2026-11-01T11:59:59Z'))).toEqual(inCollection);
    expect(stateAt(inCollection, calendar, now)).toEqual({ phase: 'registration', ended: false });
  });

  it('wait in a break until the next start', () => {
    const calendar: Calendar = { startsAt: { registration: '2026-11-10T12:00:00Z' }, endsAt: { collection: '2026-11-01T00:00:00Z' } };
    expect(stateAt(inCollection, calendar, now)).toEqual({ phase: 'collection', ended: true });
    expect(stateAt(inCollection, calendar, new Date('2026-11-10T12:00:00Z'))).toEqual({ phase: 'registration', ended: false });
  });

  it('catch up over several dates at once, and stop at a phase without an end', () => {
    const calendar = ends({ collection: '2026-10-01T00:00:00Z', registration: '2026-10-15T00:00:00Z' });
    expect(stateAt(inCollection, calendar, now)).toEqual({ phase: 'open', ended: false });
    expect(stateAt(inCollection, ends({}), now)).toEqual(inCollection);
  });

  it('reach the Anúncio and stay there', () => {
    const all = ends({
      collection: '2026-10-01T00:00:00Z',
      registration: '2026-10-02T00:00:00Z',
      open: '2026-10-03T00:00:00Z',
      voting: '2026-10-04T00:00:00Z',
    });
    expect(stateAt(inCollection, all, now)).toEqual({ phase: 'announcement', ended: false });
    expect(stateAt({ phase: 'announcement', ended: false }, all, now)).toEqual({ phase: 'announcement', ended: false });
  });
});

describe('the calendar', () => {
  it('keeps the dates that already happened', () => {
    const previous: Calendar = {
      startsAt: { registration: '2026-10-05T00:00:00Z' },
      endsAt: { collection: '2026-10-01T00:00:00Z', registration: '2026-12-01T00:00:00Z' },
    };
    const requested: Calendar = {
      startsAt: { registration: '2026-11-05T00:00:00Z', open: '2026-12-05T00:00:00Z' },
      endsAt: { collection: '2027-01-01T00:00:00Z', open: '2026-12-10T00:00:00Z' },
    };
    expect(mergeCalendar({ phase: 'registration', ended: false }, previous, requested)).toEqual({
      startsAt: { registration: '2026-10-05T00:00:00Z', open: '2026-12-05T00:00:00Z' },
      endsAt: { collection: '2026-10-01T00:00:00Z', open: '2026-12-10T00:00:00Z' },
    });
  });

  it('wants the dates to come in the future, in order, without overlapping', () => {
    expect(checkCalendar(inCollection, ends({ collection: '2026-12-01T00:00:00Z', voting: '2027-01-01T00:00:00Z' }), now)).toBeNull();
    expect(checkCalendar(inCollection, ends({ collection: '2026-10-01T00:00:00Z' }), now)).toBe('past');
    expect(checkCalendar(inCollection, ends({ collection: '2026-12-01T00:00:00Z', registration: '2026-12-01T00:00:00Z' }), now)).toBe(
      'out_of_order',
    );
    // A phase may start right when the one before it ends, or later, but not before.
    const gap = (start: string): Calendar => ({ startsAt: { registration: start }, endsAt: { collection: '2026-12-01T00:00:00Z' } });
    expect(checkCalendar(inCollection, gap('2026-12-01T00:00:00Z'), now)).toBeNull();
    expect(checkCalendar(inCollection, gap('2026-12-10T00:00:00Z'), now)).toBeNull();
    expect(checkCalendar(inCollection, gap('2026-11-20T00:00:00Z'), now)).toBe('out_of_order');
    // A phase ends after it starts.
    const span: Calendar = { startsAt: { registration: '2026-12-10T00:00:00Z' }, endsAt: { registration: '2026-12-10T00:00:00Z' } };
    expect(checkCalendar(inCollection, span, now)).toBe('out_of_order');
    // A date that already passed is fine when it already happened.
    expect(checkCalendar({ phase: 'registration', ended: false }, ends({ collection: '2026-10-01T00:00:00Z', registration: '2026-12-01T00:00:00Z' }), now)).toBeNull();
    expect(checkCalendar({ phase: 'collection', ended: true }, gap('2026-10-01T00:00:00Z'), now)).toBe('past');
  });

  it('starts the next phase now, ending the current one, and never skips a phase', () => {
    const calendar: Calendar = { startsAt: { registration: '2026-12-10T00:00:00Z' }, endsAt: { collection: '2026-12-01T00:00:00Z' } };
    const started = startNow(inCollection, calendar, 'registration', now)!;
    expect(started).toEqual({
      startsAt: { registration: '2026-11-01T12:00:00.000Z' },
      endsAt: { collection: '2026-11-01T12:00:00.000Z' },
    });
    expect(stateAt(inCollection, started, now)).toEqual({ phase: 'registration', ended: false });
    expect(startNow(inCollection, calendar, 'open', now)).toBeNull();
    expect(startNow(inCollection, calendar, 'collection', now)).toBeNull();
  });

  it('starts the next phase now from a break, keeping the end that passed', () => {
    const calendar: Calendar = { startsAt: { registration: '2026-12-10T00:00:00Z' }, endsAt: { collection: '2026-10-01T00:00:00Z' } };
    expect(startNow({ phase: 'collection', ended: true }, calendar, 'registration', now)).toEqual({
      startsAt: { registration: '2026-11-01T12:00:00.000Z' },
      endsAt: { collection: '2026-10-01T00:00:00Z' },
    });
  });
});

describe('Brasília time', () => {
  it('is three hours behind UTC all year', () => {
    expect(fromBrasiliaLocal('2026-12-01T20:00')).toBe('2026-12-01T23:00:00.000Z');
    expect(fromBrasiliaLocal('2026-12-31T22:30')).toBe('2027-01-01T01:30:00.000Z');
    expect(fromBrasiliaLocal('2026-07-01T09:00')).toBe('2026-07-01T12:00:00.000Z');
    expect(toBrasiliaLocal('2027-01-01T01:30:00.000Z')).toBe('2026-12-31T22:30');
  });

  it('refuses what is not a real time', () => {
    expect(fromBrasiliaLocal('2026-02-30T10:00')).toBeNull();
    expect(fromBrasiliaLocal('2026-12-01T25:00')).toBeNull();
    expect(fromBrasiliaLocal('2026-12-01')).toBeNull();
    expect(fromBrasiliaLocal('2026-12-01T20:00:00Z')).toBeNull();
  });

  it('shows dates in Brasília, in Portuguese', () => {
    expect(formatBrasilia('2027-01-01T01:30:00.000Z')).toContain('31 de dezembro de 2026');
    expect(formatBrasilia('2027-01-01T01:30:00.000Z')).toContain('22:30');
  });

  it('counts the time left down to the minute', () => {
    expect(timeLeft('2026-11-03T15:30:59Z', now)).toEqual({ days: 2, hours: 3, minutes: 30 });
    expect(timeLeft('2026-11-01T12:00:00Z', now)).toBeNull();
  });
});
