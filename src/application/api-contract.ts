// The contract between the app and the server: query and command names, inputs and outputs.
// Types only. The server imports it with `import type`, so nothing here runs on either side.
import type { Calendar, Phase } from '../domain/award/phases';
import type { MediaType } from '../domain/catalog/media';
import type { Role } from '../domain/group/roles';

export interface MemberView {
  readonly id: string;
  readonly name: string;
  readonly photoUrl: string | null;
  readonly roles: readonly Role[];
}

/** A row of the members screen: the e-mail only reaches admins. */
export interface MemberListItem extends MemberView {
  readonly email?: string;
}

export interface MeView extends MemberView {
  readonly email: string;
}

export type InviteState = 'pending' | 'accepted' | 'revoked';

export interface InviteView {
  readonly email: string;
  readonly state: InviteState;
  readonly invitedByName: string;
  readonly createdAt: string;
  readonly acceptedAt: string | null;
}

/** The year's edition of the award and its calendar (docs/spec/premiacao.md). */
export interface EditionView {
  readonly year: number;
  readonly name: string;
  readonly phase: Phase;
  /** UTC ISO instants; a phase missing here has no end yet. */
  readonly endsAt: Calendar;
}

/** A movie or series as TMDB has it (ADR-008). */
export interface CatalogHit {
  readonly mediaType: MediaType;
  readonly tmdbId: number;
  readonly title: string;
  readonly year: number | null;
  /** "YYYY-MM-DD"; for a series, its first air date. */
  readonly releaseDate: string | null;
  /** A TMDB image path, loaded from image.tmdb.org. */
  readonly posterPath: string | null;
}

export interface CatalogSeason {
  readonly season: number;
  readonly name: string;
  readonly releaseDate: string | null;
  readonly posterPath: string | null;
}

/** A title's details: a series also lists its seasons (a movie, none). */
export interface CatalogTitle extends CatalogHit {
  readonly seasons: readonly CatalogSeason[];
}

/** Reads: `POST /api/query/<name>`. They never change anything. */
export interface Queries {
  me: { input: Record<string, never>; output: MeView };
  members: { input: Record<string, never>; output: MemberListItem[] };
  /** Admins only. */
  invites: { input: Record<string, never>; output: InviteView[] };
  edition: { input: Record<string, never>; output: EditionView };
  /** By title; with `mediaType` and `year`, only that type released that year. */
  'catalog.search': { input: { text: string; mediaType?: MediaType; year?: number }; output: CatalogHit[] };
  'catalog.title': { input: { mediaType: MediaType; tmdbId: number }; output: CatalogTitle };
  /** A pasted TMDB or IMDb link; `invalid` when it is neither. */
  'catalog.link': { input: { link: string }; output: CatalogHit[] };
  /** Whether my e-mail is in Pede pra Paçoca's group; false where there is no binding (ADR-009). */
  'pede.status': { input: Record<string, never>; output: { member: boolean } };
}

/**
 * Queries the Worker answers itself, outside the Group object, because they call another server
 * (TMDB, Pede pra Paçoca) and must not hold the group's one-at-a-time object while they wait (ADR-010).
 */
export type WorkerQueryName = 'catalog.search' | 'catalog.title' | 'catalog.link' | 'pede.status';

/** Queries the Group object answers. */
export type GroupQueryName = Exclude<QueryName, WorkerQueryName>;

/** Writes: `POST /api/command/<name>`. Each runs alone, in one transaction. */
export interface Commands {
  'invite.create': { input: { email: string }; output: InviteView };
  'invite.revoke': { input: { email: string }; output: null };
  'member.setRoles': { input: { memberId: string; roles: Role[] }; output: MemberView };
  /** Admins; never oneself, so the last admin stays. */
  'member.remove': { input: { memberId: string }; output: null };
  'member.rename': { input: { name: string }; output: MeView };
  /**
   * Organizador only. Each end is "YYYY-MM-DDTHH:mm" in Brasília time, or null for none yet. The
   * ends of phases that already ended stay as they were.
   */
  'edition.setCalendar': { input: { endsAt: Partial<Record<keyof Calendar, string | null>> }; output: EditionView };
}

export type QueryName = keyof Queries;
export type CommandName = keyof Commands;

/** What a live message says changed; the screens that show it refetch. */
export type Topic = 'me' | 'members' | 'invites' | 'edition';

export interface LiveMessage {
  readonly type: 'changed';
  readonly topics: readonly Topic[];
}

export type ApiError = 'unauthenticated' | 'forbidden' | 'not_found' | 'invalid' | 'conflict' | 'last_admin' | 'unavailable';

export type ApiResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: ApiError };
