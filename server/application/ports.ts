// Ports the server's use cases depend on. The Durable Object implements them in production;
// tests use node:sqlite (server/testing/). Nothing here imports Cloudflare types.
import type { CatalogHit, CatalogTitle } from '../../src/application/api-contract';
import type { MediaType } from '../../src/domain/catalog/media';

export type SqlValue = string | number | null;

/** Synchronous SQLite, as the Durable Object's storage provides it. */
export interface Sql {
  all<T = Record<string, SqlValue>>(query: string, ...bindings: SqlValue[]): T[];
  run(query: string, ...bindings: SqlValue[]): void;
  /** Runs `fn` atomically: every write inside commits together or not at all. */
  transaction<T>(fn: () => T): T;
}

export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  next(): string;
}

// The two below call other servers, so they are async and used only by the Worker (ADR-010).
// They throw when the other server fails; the Worker answers `unavailable`.

/** The media catalog: TMDB (ADR-008). */
export interface Catalog {
  search(text: string, filter?: { mediaType: MediaType; year?: number }): Promise<CatalogHit[]>;
  /** Null when TMDB has no such title. */
  title(mediaType: MediaType, tmdbId: number): Promise<CatalogTitle | null>;
  /** What an IMDb id is on TMDB: usually one hit, sometimes none. */
  findImdb(imdbId: string): Promise<CatalogHit[]>;
}

/** A row Pede pra Paçoca marked "Assisti" for one member (ADR-009). */
export interface PedeWatched {
  readonly tmdbId: number | null;
  readonly mediaType: MediaType;
  readonly title: string;
  readonly year: number | null;
  readonly releaseDate: string | null;
  readonly posterPath: string | null;
  /** UTC ISO instant of the day the member marked it there. */
  readonly watchedAt: string;
  readonly rating: number | null;
}

/** Pede pra Paçoca's read-only entrypoint, reached by a Service Binding (ADR-009). */
export interface PedePraPacoca {
  isMember(email: string): Promise<boolean>;
  watchedBy(email: string, from?: string, to?: string): Promise<PedeWatched[]>;
}
