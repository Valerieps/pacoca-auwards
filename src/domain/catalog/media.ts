// Media from TMDB (ADR-008): a movie, or a season of a series. Two items are the same when they
// have the same type, TMDB id and season, never by title (docs/spec/minha-lista.md).

export type MediaType = 'movie' | 'tv';

export function isMediaType(value: unknown): value is MediaType {
  return value === 'movie' || value === 'tv';
}

export const SEARCH_MAX_LENGTH = 100;

/** A search text as sent to TMDB: trimmed, inner spaces collapsed; null when empty or too long. */
export function normalizeSearch(text: string): string | null {
  const clean = text.trim().replace(/\s+/g, ' ');
  return clean.length >= 1 && clean.length <= SEARCH_MAX_LENGTH ? clean : null;
}

export function isTmdbId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

/** The year of a "YYYY-MM-DD" date, or null. */
export function yearOf(date: string | null): number | null {
  const year = date ? Number(date.slice(0, 4)) : NaN;
  return Number.isInteger(year) && year > 0 ? year : null;
}

export type MediaLink =
  | { readonly source: 'tmdb'; readonly mediaType: MediaType; readonly tmdbId: number }
  | { readonly source: 'imdb'; readonly imdbId: string };

const TMDB_LINK = /(?:^|[/.])themoviedb\.org\/(?:[a-z]{2}(?:-[A-Z]{2})?\/)?(movie|tv)\/(\d+)/i;
const IMDB_LINK = /(?:^|[/.])imdb\.com\/(?:[a-z]{2}\/)?title\/(tt\d{5,10})\b/i;

/** What a pasted TMDB or IMDb link points to, or null when it is neither. */
export function parseMediaLink(text: string): MediaLink | null {
  const tmdb = TMDB_LINK.exec(text.trim());
  if (tmdb) {
    const tmdbId = Number(tmdb[2]);
    return isTmdbId(tmdbId) ? { source: 'tmdb', mediaType: tmdb[1].toLowerCase() as MediaType, tmdbId } : null;
  }
  const imdb = IMDB_LINK.exec(text.trim());
  return imdb ? { source: 'imdb', imdbId: imdb[1].toLowerCase() } : null;
}
