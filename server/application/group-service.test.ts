import { beforeEach, describe, expect, it } from 'vitest';
import { fixedClock, memorySql, sequentialIds } from '../testing/node-sql';
import { GroupService } from './group-service';
import type { GoogleProfile } from './members';

const profile = (email: string, name = email.split('@')[0]): GoogleProfile => ({ sub: `sub:${email}`, email, name, picture: null });
const ADMIN = 'ana@example.com';

let clock: ReturnType<typeof fixedClock>;
let service: GroupService;

beforeEach(() => {
  clock = fixedClock('2026-10-21T12:00:00Z');
  service = new GroupService(memorySql(), clock, sequentialIds());
  service.migrate();
});

/** Signs the bootstrap admin in; returns her session hash. */
function signInAdmin(): string {
  expect(service.signIn(profile(ADMIN, 'Ana'), 'h-ana', [ADMIN])).toMatchObject({ ok: true });
  return 'h-ana';
}

function invite(admin: string, email: string) {
  return service.command(admin, 'invite.create', { email });
}

describe('sign-in', () => {
  it('lets nobody in without an invite, and stores nothing', () => {
    expect(service.signIn(profile('eve@example.com'), 'h-eve', [])).toEqual({ ok: false, error: 'no_invite' });
    expect(service.memberForSession('h-eve')).toBeNull();
  });

  it('lets the bootstrap e-mails in as admins only while there is no admin', () => {
    const admin = signInAdmin();
    expect(service.query(admin, 'me', {})).toMatchObject({ ok: true, value: { name: 'Ana', roles: ['admin'] } });
    expect(service.signIn(profile('bia@example.com'), 'h-bia', [ADMIN, 'bia@example.com'])).toEqual({ ok: false, error: 'no_invite' });
  });

  it('accepts a pending invite once, matching the e-mail in any case', () => {
    const admin = signInAdmin();
    invite(admin, 'Carla@Example.com');
    expect(service.signIn(profile('carla@example.com'), 'h-carla', [])).toMatchObject({ ok: true });
    expect(service.query(admin, 'invites', {})).toMatchObject({ ok: true, value: [{ email: 'carla@example.com', state: 'accepted' }] });
    expect(service.query('h-carla', 'me', {})).toMatchObject({ ok: true, value: { roles: [] } });
  });

  it('ends the session on sign-out and when it expires', () => {
    const admin = signInAdmin();
    service.signOut(admin);
    expect(service.query(admin, 'me', {})).toEqual({ ok: false, error: 'unauthenticated' });

    service.signIn(profile(ADMIN), 'h-2', []);
    clock.set('2027-10-21T12:00:00Z');
    expect(service.memberForSession('h-2')).toBeNull();
  });
});

describe('sign-in through Pede pra Paçoca', () => {
  it('lets someone new in as a participant, without an invite', () => {
    signInAdmin();
    expect(service.signIn(profile('pedro@example.com'), 'h-pedro', [], true)).toMatchObject({ ok: true });
    expect(service.query('h-pedro', 'me', {})).toMatchObject({ ok: true, value: { roles: [] } });
  });

  it('does not bring back a member an admin removed', () => {
    const admin = signInAdmin();
    service.signIn(profile('pedro@example.com'), 'h-pedro', [], true);
    const pedroId = service.memberForSession('h-pedro')!.id;
    service.command(admin, 'member.remove', { memberId: pedroId });
    expect(service.signIn(profile('pedro@example.com'), 'h-pedro-2', [], true)).toEqual({ ok: false, error: 'no_invite' });
  });
});

describe('invites', () => {
  it('are for admins only', () => {
    const admin = signInAdmin();
    invite(admin, 'carla@example.com');
    service.signIn(profile('carla@example.com'), 'h-carla', []);
    expect(invite('h-carla', 'dani@example.com')).toEqual({ ok: false, error: 'forbidden' });
    expect(service.query('h-carla', 'invites', {})).toEqual({ ok: false, error: 'forbidden' });
  });

  it('refuse bad e-mails and current members', () => {
    const admin = signInAdmin();
    expect(invite(admin, 'not an e-mail')).toEqual({ ok: false, error: 'invalid' });
    expect(invite(admin, ADMIN)).toEqual({ ok: false, error: 'conflict' });
  });

  it('can be revoked while pending, and then let nobody in', () => {
    const admin = signInAdmin();
    invite(admin, 'carla@example.com');
    expect(service.command(admin, 'invite.revoke', { email: 'carla@example.com' })).toMatchObject({ ok: true });
    expect(service.signIn(profile('carla@example.com'), 'h-carla', [])).toEqual({ ok: false, error: 'no_invite' });
  });
});

describe('members', () => {
  function withCarla(): { admin: string; carlaId: string } {
    const admin = signInAdmin();
    invite(admin, 'carla@example.com');
    service.signIn(profile('carla@example.com', 'Carla'), 'h-carla', []);
    const me = service.query('h-carla', 'me', {});
    if (!me.ok) throw new Error('Carla did not sign in');
    return { admin, carlaId: (me.value as { id: string }).id };
  }

  it('shows e-mails to admins only', () => {
    const { admin } = withCarla();
    expect(service.query(admin, 'members', {})).toMatchObject({ ok: true, value: [{ name: 'Ana', email: ADMIN }, { name: 'Carla' }] });
    const seen = service.query('h-carla', 'members', {});
    expect(seen.ok && (seen.value as object[]).every((m) => !('email' in m))).toBe(true);
  });

  it('never lose the last admin', () => {
    const { admin, carlaId } = withCarla();
    const anaId = (service.query(admin, 'me', {}) as { value: { id: string } }).value.id;
    expect(service.command(admin, 'member.setRoles', { memberId: anaId, roles: [] })).toEqual({ ok: false, error: 'last_admin' });
    expect(service.command(admin, 'member.setRoles', { memberId: carlaId, roles: ['admin'] })).toMatchObject({ ok: true });
    expect(service.command(admin, 'member.setRoles', { memberId: anaId, roles: [] })).toMatchObject({ ok: true });
  });

  it('lose access at once when removed, and come back with a new invite', () => {
    const { admin, carlaId } = withCarla();
    expect(service.command(admin, 'member.remove', { memberId: carlaId })).toMatchObject({ ok: true, disconnect: [carlaId] });
    expect(service.memberForSession('h-carla')).toBeNull();
    expect(service.signIn(profile('carla@example.com'), 'h-carla-2', [])).toEqual({ ok: false, error: 'no_invite' });

    invite(admin, 'carla@example.com');
    service.signIn(profile('carla@example.com'), 'h-carla-3', []);
    expect(service.memberForSession('h-carla-3')?.id).toBe(carlaId);
  });

  it('cannot remove themselves', () => {
    const admin = signInAdmin();
    const anaId = (service.query(admin, 'me', {}) as { value: { id: string } }).value.id;
    expect(service.command(admin, 'member.remove', { memberId: anaId })).toEqual({ ok: false, error: 'forbidden' });
  });

  it('rename themselves within the name rules', () => {
    const admin = signInAdmin();
    expect(service.command(admin, 'member.rename', { name: '  Ana  Maria ' })).toMatchObject({ ok: true, value: { name: 'Ana Maria' } });
    expect(service.command(admin, 'member.rename', { name: ' ' })).toEqual({ ok: false, error: 'invalid' });
  });
});

describe('the API surface', () => {
  it('answers unknown names with not_found, even for inherited object keys', () => {
    const admin = signInAdmin();
    expect(service.query(admin, 'toString', {})).toEqual({ ok: false, error: 'not_found' });
    expect(service.command(admin, 'constructor', {})).toEqual({ ok: false, error: 'not_found' });
  });
});

describe('the edition', () => {
  /** Ana, admin, gives herself the Organizador role. */
  function organizer(admin = signInAdmin()): string {
    const anaId = service.memberForSession(admin)!.id;
    service.command(admin, 'member.setRoles', { memberId: anaId, roles: ['admin', 'organizer'] });
    return admin;
  }

  it('is born as 2026, in Fase 1, with no end dates', () => {
    const admin = signInAdmin();
    expect(service.query(admin, 'edition', {})).toEqual({
      ok: true,
      value: { year: 2026, name: 'Paçoca AUwards 2026', phase: 'collection', ended: false, startsAt: {}, endsAt: {} },
    });
  });

  it('gets its calendar from the Organizador only, in Brasília time', () => {
    const admin = signInAdmin();
    expect(service.command(admin, 'edition.setCalendar', { endsAt: { collection: '2026-12-01T20:00' } })).toEqual({
      ok: false,
      error: 'forbidden',
    });
    const cesar = organizer(admin);
    expect(service.command(cesar, 'edition.setCalendar', { endsAt: { collection: '2026-12-01T20:00', voting: '2027-01-10T20:00' } })).toMatchObject({
      ok: true,
      changed: ['edition'],
      value: { endsAt: { collection: '2026-12-01T23:00:00.000Z', voting: '2027-01-10T23:00:00.000Z' } },
    });
  });

  it('refuses ends in the past, out of order or not a time', () => {
    const cesar = organizer();
    const set = (endsAt: object) => service.command(cesar, 'edition.setCalendar', { endsAt });
    expect(set({ collection: '2026-10-01T20:00' })).toEqual({ ok: false, error: 'invalid' });
    expect(set({ collection: '2026-12-01T20:00', registration: '2026-11-30T20:00' })).toEqual({ ok: false, error: 'invalid' });
    expect(set({ collection: 'amanha' })).toEqual({ ok: false, error: 'invalid' });
    expect(service.command(cesar, 'edition.setCalendar', {})).toEqual({ ok: false, error: 'invalid' });
  });

  it('moves to the next phase when the cron sees the end has passed', () => {
    const cesar = organizer();
    service.command(cesar, 'edition.setCalendar', { endsAt: { collection: '2026-12-01T20:00' } });
    clock.set('2026-12-01T22:59:00Z');
    expect(service.tick()).toEqual([]);
    clock.set('2026-12-01T23:00:00Z');
    expect(service.tick()).toEqual(['edition']);
    expect(service.query(cesar, 'edition', {})).toMatchObject({ ok: true, value: { phase: 'registration' } });
    expect(service.tick()).toEqual([]);
  });

  it('takes starts too, and waits in the break until the next phase starts', () => {
    const cesar = organizer();
    expect(
      service.command(cesar, 'edition.setCalendar', {
        startsAt: { registration: '2026-12-10T20:00' },
        endsAt: { collection: '2026-12-01T20:00' },
      }),
    ).toMatchObject({ ok: true, value: { startsAt: { registration: '2026-12-10T23:00:00.000Z' } } });
    expect(service.command(cesar, 'edition.setCalendar', { startsAt: { registration: '2026-11-30T20:00' }, endsAt: { collection: '2026-12-01T20:00' } })).toEqual({
      ok: false,
      error: 'invalid',
    });
    clock.set('2026-12-02T00:00:00Z');
    expect(service.tick()).toEqual(['edition']);
    expect(service.query(cesar, 'edition', {})).toMatchObject({ ok: true, value: { phase: 'collection', ended: true } });
    clock.set('2026-12-10T23:00:00Z');
    expect(service.tick()).toEqual(['edition']);
    expect(service.query(cesar, 'edition', {})).toMatchObject({ ok: true, value: { phase: 'registration', ended: false } });
  });

  it('starts the next phase now for the Organizador only, ending the current one', () => {
    const admin = signInAdmin();
    expect(service.command(admin, 'edition.startPhase', { phase: 'registration' })).toEqual({ ok: false, error: 'forbidden' });
    const cesar = organizer(admin);
    service.command(cesar, 'edition.setCalendar', { startsAt: { registration: '2026-12-10T20:00' }, endsAt: { collection: '2026-12-01T20:00' } });
    expect(service.command(cesar, 'edition.startPhase', { phase: 'open' })).toEqual({ ok: false, error: 'invalid' });
    expect(service.command(cesar, 'edition.startPhase', { phase: 'nope' })).toEqual({ ok: false, error: 'invalid' });
    expect(service.command(cesar, 'edition.startPhase', { phase: 'registration' })).toMatchObject({
      ok: true,
      changed: ['edition'],
      value: {
        phase: 'registration',
        ended: false,
        startsAt: { registration: '2026-10-21T12:00:00.000Z' },
        endsAt: { collection: '2026-10-21T12:00:00.000Z' },
      },
    });
    expect(service.query(cesar, 'edition', {})).toMatchObject({ ok: true, value: { phase: 'registration' } });
    expect(service.tick()).toEqual([]);
  });

  it('keeps the end of a phase that already ended', () => {
    const cesar = organizer();
    service.command(cesar, 'edition.setCalendar', { endsAt: { collection: '2026-12-01T20:00' } });
    clock.set('2026-12-02T00:00:00Z');
    service.tick();
    const result = service.command(cesar, 'edition.setCalendar', { endsAt: { collection: '2027-01-01T20:00', registration: '2026-12-20T20:00' } });
    expect(result).toMatchObject({
      ok: true,
      value: { endsAt: { collection: '2026-12-01T23:00:00.000Z', registration: '2026-12-20T23:00:00.000Z' } },
    });
  });
});
