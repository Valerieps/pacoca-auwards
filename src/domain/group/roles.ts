// Roles and what each allows (docs/spec/acesso-e-membros.md). Add the app's own roles here; the
// server checks them on every call, the interface only hides what a member cannot do.
export type Role = 'admin' | 'organizer';

const ROLES: readonly Role[] = ['admin', 'organizer'];

export interface MemberRoles {
  readonly roles: readonly Role[];
}

export function isAdmin(member: MemberRoles): boolean {
  return member.roles.includes('admin');
}

/** The Organizador: runs the award's calendar, categories and winners. */
export function isOrganizer(member: MemberRoles): boolean {
  return member.roles.includes('organizer');
}

/** Invite and remove members, give and take roles. */
export function canManageGroup(member: MemberRoles): boolean {
  return isAdmin(member);
}

/**
 * Whether a change leaves the group with at least one admin.
 * `activeAdminIds` are the current admins; `losingAdminId` is the one losing the role or removed.
 */
export function keepsAnAdmin(activeAdminIds: readonly string[], losingAdminId: string): boolean {
  return activeAdminIds.some((id) => id !== losingAdminId);
}

export function normalizeRoles(roles: readonly string[]): Role[] {
  return ROLES.filter((role) => roles.includes(role));
}

/** The member's roles with `role` added or taken away; the other roles stay. */
export function toggleRole(roles: readonly Role[], role: Role): Role[] {
  return roles.includes(role) ? roles.filter((r) => r !== role) : normalizeRoles([...roles, role]);
}
