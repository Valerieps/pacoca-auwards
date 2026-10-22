// Pede pra Paçoca through its Service Binding (ADR-009): no URL, no secret. Its answers come from
// another app, so every row is checked before the AUwards uses it.
import { normalizeEmail } from '../../src/domain/group/email';
import { isMediaType, isTmdbId } from '../../src/domain/catalog/media';
import type { PedePraPacoca, PedeWatched } from '../application/ports';

/** What the binding exposes: Pede pra Paçoca's read-only WorkerEntrypoint, called by RPC. */
export interface PedeBinding {
  isMember(email: string): Promise<boolean>;
  watchedBy(email: string, from?: string, to?: string): Promise<unknown[]>;
}

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value : null);
const DATE = /^\d{4}-\d{2}-\d{2}/;

/** One row as ADR-009 describes it (snake_case), or null when it is not one. */
export function toWatched(raw: unknown): PedeWatched | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const row = raw as Record<string, unknown>;
  const title = text(row.title);
  const watchedAt = text(row.watched_at);
  if (!isMediaType(row.media_type) || !title || !watchedAt || Number.isNaN(Date.parse(watchedAt))) return null;
  const releaseDate = text(row.release_date);
  const rating = row.rating;
  return {
    tmdbId: isTmdbId(row.tmdb_id) ? row.tmdb_id : null,
    mediaType: row.media_type,
    title,
    year: typeof row.year === 'number' && Number.isInteger(row.year) ? row.year : null,
    releaseDate: releaseDate && DATE.test(releaseDate) ? releaseDate.slice(0, 10) : null,
    posterPath: text(row.poster_path),
    watchedAt: new Date(watchedAt).toISOString(),
    rating: typeof rating === 'number' && Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null,
  };
}

/** The port over the binding, or null where there is none (branch previews, ADR-009). */
export function pedeFromBinding(binding: PedeBinding | undefined): PedePraPacoca | null {
  if (!binding) return null;
  return {
    isMember: async (email) => (await binding.isMember(normalizeEmail(email))) === true,
    watchedBy: async (email, from, to) => {
      const rows = await binding.watchedBy(normalizeEmail(email), from, to);
      return (Array.isArray(rows) ? rows : []).map(toWatched).filter((row): row is PedeWatched => row !== null);
    },
  };
}
