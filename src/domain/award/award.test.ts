import { describe, expect, it } from 'vitest';
import { formatBrasilia, fromBrasiliaLocal, timeLeft, toBrasiliaLocal } from './brasilia';
import { checkCalendar, hasEnded, mergeCalendar, nextPhase, phaseAt, phaseNumber, type Calendar } from './phases';

const now = new Date('2026-11-01T12:00:00Z');

describe('phases', () => {
  it('go in order and number 1 to 4, then the Anúncio', () => {
    expect(nextPhase('collection')).toBe('registration');
    expect(nextPhase('voting')).toBe('announcement');
    expect(nextPhase('announcement')).toBeNull();
    expect(phaseNumber('collection')).toBe(1);
    expect(phaseNumber('voting')).toBe(4);
    expect(phaseNumber('announcement')).toBeNull();
    expect(hasEnded('collection', 'open')).toBe(true);
    expect(hasEnded('open', 'open')).toBe(false);
  });

  it('end only when their end has passed', () => {
    const calendar: Calendar = { collection: '2026-11-01T12:00:00Z', registration: '2026-12-01T12:00:00Z' };
    expect(phaseAt('collection', calendar, new Date('2026-11-01T11:59:59Z'))).toBe('collection');
    expect(phaseAt('collection', calendar, now)).toBe('registration');
  });

  it('catch up over several ends at once, and stop at a phase without an end', () => {
    const calendar: Calendar = { collection: '2026-10-01T00:00:00Z', registration: '2026-10-15T00:00:00Z' };
    expect(phaseAt('collection', calendar, now)).toBe('open');
    expect(phaseAt('collection', {}, now)).toBe('collection');
  });

  it('reach the Anúncio and stay there', () => {
    const all: Calendar = {
      collection: '2026-10-01T00:00:00Z',
      registration: '2026-10-02T00:00:00Z',
      open: '2026-10-03T00:00:00Z',
      voting: '2026-10-04T00:00:00Z',
    };
    expect(phaseAt('collection', all, now)).toBe('announcement');
    expect(phaseAt('announcement', all, now)).toBe('announcement');
  });
});

describe('the calendar', () => {
  it('keeps the ends of the phases that already ended', () => {
    const previous: Calendar = { collection: '2026-10-01T00:00:00Z', registration: '2026-12-01T00:00:00Z' };
    const requested: Calendar = { collection: '2027-01-01T00:00:00Z', open: '2026-12-10T00:00:00Z' };
    expect(mergeCalendar('registration', previous, requested)).toEqual({
      collection: '2026-10-01T00:00:00Z',
      open: '2026-12-10T00:00:00Z',
    });
  });

  it('wants the ends to come in the future, in order', () => {
    expect(checkCalendar('collection', { collection: '2026-12-01T00:00:00Z', voting: '2027-01-01T00:00:00Z' }, now)).toBeNull();
    expect(checkCalendar('collection', { collection: '2026-10-01T00:00:00Z' }, now)).toBe('past');
    expect(checkCalendar('collection', { collection: '2026-12-01T00:00:00Z', registration: '2026-12-01T00:00:00Z' }, now)).toBe(
      'out_of_order',
    );
    // An end that already passed is fine for a phase that already ended.
    expect(checkCalendar('registration', { collection: '2026-10-01T00:00:00Z', registration: '2026-12-01T00:00:00Z' }, now)).toBeNull();
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
