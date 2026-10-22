// The TMDB API (ADR-008), called only by the Worker with the secret TMDB_API_KEY. Texts come in
// Brazilian Portuguese; TMDB falls back to the original title when it has no translation.
import type { CatalogHit, CatalogSeason, CatalogTitle } from '../../src/application/api-contract';
import { isMediaType, isTmdbId, yearOf, type MediaType } from '../../src/domain/catalog/media';
import type { Catalog } from '../application/ports';

const API = 'https://api.themoviedb.org/3';
const LANGUAGE = 'pt-BR';
const MAX_HITS = 20;

type Json = Record<string, unknown>;

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value : null);

function toHit(raw: Json, mediaType: MediaType): CatalogHit | null {
  if (!isTmdbId(raw.id)) return null;
  const title = text(mediaType === 'movie' ? raw.title : raw.name) ?? text(mediaType === 'movie' ? raw.original_title : raw.original_name);
  if (!title) return null;
  const releaseDate = text(mediaType === 'movie' ? raw.release_date : raw.first_air_date);
  return { mediaType, tmdbId: raw.id, title, year: yearOf(releaseDate), releaseDate, posterPath: text(raw.poster_path) };
}

function toSeason(raw: Json): CatalogSeason | null {
  const season = raw.season_number;
  // Season 0 is TMDB's "Especiais", not a season anyone adds.
  if (typeof season !== 'number' || !Number.isInteger(season) || season < 1) return null;
  return { season, name: text(raw.name) ?? `Temporada ${season}`, releaseDate: text(raw.air_date), posterPath: text(raw.poster_path) };
}

const results = (body: Json, key = 'results'): Json[] => (Array.isArray(body[key]) ? (body[key] as Json[]) : []);
const present = <T>(value: T | null): value is T => value !== null;

/**
 * `key` is a v4 read access token (a JWT, sent as a bearer token) or a v3 API key (sent as a
 * parameter); TMDB's settings page offers both.
 */
export function tmdbCatalog(key: string, fetcher: typeof fetch = fetch): Catalog {
  const bearer = key.startsWith('eyJ');

  /** The JSON body, or null for a 404; anything else is TMDB failing, which throws. */
  async function get(path: string, params: Record<string, string> = {}): Promise<Json | null> {
    const url = new URL(`${API}${path}`);
    url.search = new URLSearchParams({ language: LANGUAGE, ...params, ...(bearer ? {} : { api_key: key }) }).toString();
    const response = await fetcher(url.toString(), {
      headers: { Accept: 'application/json', ...(bearer ? { Authorization: `Bearer ${key}` } : {}) },
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`TMDB answered ${response.status}`);
    return (await response.json()) as Json;
  }

  return {
    async search(query, filter) {
      if (!filter) {
        const body = await get('/search/multi', { query, include_adult: 'false' });
        return results(body ?? {})
          .map((raw) => (isMediaType(raw.media_type) ? toHit(raw, raw.media_type) : null))
          .filter(present)
          .slice(0, MAX_HITS);
      }
      const year = filter.year ? { [filter.mediaType === 'movie' ? 'year' : 'first_air_date_year']: String(filter.year) } : {};
      const body = await get(`/search/${filter.mediaType}`, { query, include_adult: 'false', ...year });
      return results(body ?? {})
        .map((raw) => toHit(raw, filter.mediaType))
        .filter(present)
        .slice(0, MAX_HITS);
    },

    async title(mediaType, tmdbId) {
      const body = await get(`/${mediaType}/${tmdbId}`);
      const hit = body && toHit(body, mediaType);
      if (!body || !hit) return null;
      const seasons = mediaType === 'tv' ? results(body, 'seasons').map(toSeason).filter(present) : [];
      return { ...hit, seasons } satisfies CatalogTitle;
    },

    async findImdb(imdbId) {
      const body = (await get(`/find/${imdbId}`, { external_source: 'imdb_id' })) ?? {};
      return [
        ...results(body, 'movie_results').map((raw) => toHit(raw, 'movie')),
        ...results(body, 'tv_results').map((raw) => toHit(raw, 'tv')),
      ].filter(present);
    },
  };
}
