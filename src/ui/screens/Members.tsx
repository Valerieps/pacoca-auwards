import { useState } from 'react';
import type { ApiError, MeView, MemberListItem } from '../../application/api-contract';
import { canManageGroup, isAdmin, isOrganizer, toggleRole, type Role } from '../../domain/group/roles';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { useQuery } from '../use-query';

function errorText(error: ApiError): string {
  if (error === 'last_admin') return strings.members.lastAdmin;
  if (error === 'forbidden') return strings.forbidden;
  return strings.genericError;
}

function roleLabel(member: MemberListItem): string {
  const labels = [isAdmin(member) && strings.members.admin, isOrganizer(member) && strings.members.organizer].filter(Boolean);
  return labels.length ? labels.join(' · ') : strings.members.member;
}

export function Members({ me }: { me: MeView }) {
  const { backend } = useServices();
  const members = useQuery('members', {}, ['members']);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const manages = canManageGroup(me);

  async function toggle(member: MemberListItem, role: Role) {
    setBusy(member.id);
    const result = await backend.command('member.setRoles', { memberId: member.id, roles: toggleRole(member.roles, role) });
    setBusy(null);
    setError(result.ok ? null : errorText(result.error));
  }

  async function remove(member: MemberListItem) {
    if (!window.confirm(strings.members.removeConfirm(member.name))) return;
    setBusy(member.id);
    const result = await backend.command('member.remove', { memberId: member.id });
    setBusy(null);
    setError(result.ok ? null : errorText(result.error));
  }

  return (
    <section>
      <h1>{strings.members.title}</h1>
      {members.error && !members.data && <p className="notice">{strings.genericError}</p>}
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {members.data?.length === 1 && <p className="muted">{strings.members.empty}</p>}
      <ul className="list">
        {members.data?.map((member) => (
          <li key={member.id} className="card row">
            {member.photoUrl && <img className="avatar" src={member.photoUrl} alt="" referrerPolicy="no-referrer" />}
            <span className="grow">
              {member.name} {member.id === me.id && <span className="muted">{strings.members.you}</span>}
              <br />
              <span className="muted">{roleLabel(member)}</span>
              {member.email && (
                <>
                  <br />
                  <span className="muted">{member.email}</span>
                </>
              )}
            </span>
            {manages && (
              <span className="row" role="group" aria-label={strings.members.rolesOf(member.name)}>
                <button
                  type="button"
                  className="secondary"
                  aria-pressed={isAdmin(member)}
                  disabled={busy === member.id}
                  onClick={() => void toggle(member, 'admin')}
                >
                  {strings.members.makeAdmin}
                </button>
                <button
                  type="button"
                  className="secondary"
                  aria-pressed={isOrganizer(member)}
                  disabled={busy === member.id}
                  onClick={() => void toggle(member, 'organizer')}
                >
                  {strings.members.makeOrganizer}
                </button>
                {member.id !== me.id && (
                  <button
                    type="button"
                    className="secondary danger"
                    aria-label={strings.members.removeOf(member.name)}
                    disabled={busy === member.id}
                    onClick={() => void remove(member)}
                  >
                    {strings.members.remove}
                  </button>
                )}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
