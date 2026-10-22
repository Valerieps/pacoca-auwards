import { describe, expect, it } from 'vitest';
import { pedeFromBinding, toWatched } from './pede';
import { tmdbCatalog } from './tmdb';

/** A fetch that answers from a table of paths and records what it was asked. */
function fakeFetch(answers: Record<string, unknown>, asked: { url: URL; headers: Record<string, string> }[] = []): typeof fetch {
  return (async (input: string, init?: RequestInit) => {
    const url = new URL(input);
    asked.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    const body = answers[url.pathname];
    if (body === undefined) return new Response('{}', { status: 404 });
    if (body === 500) return new Response('{}', { status: 500 });
    return new Response(JSON.stringify(body), { status: 200 });
  }) as typeof fetch;
}

describe('tmdbCatalog', () => {
  it('searches movies and series in Portuguese, skipping people', async () => {
    const asked: { url: URL; headers: Record<string, string> }[] = [];
    const catalog = tmdbCatalog(
      'v3key',
      fakeFetch(
        {
          '/3/search/multi': {
            results: [
              { media_type: 'movie', id: 693134, title: 'Duna: Parte Dois', release_date: '2024-02-27', poster_path: '/d.jpg' },
              { media_type: 'tv', id: 136315, name: 'O Urso', first_air_date: '2022-06-23', poster_path: null },
              { media_type: 'person', id: 1, name: 'Zendaya' },
              { media_type: 'movie', id: 2, title: '', original_title: 'Sem tradução', release_date: '' },
            ],
          },
        },
        asked,
      ),
    );
    expect(await catalog.search('duna')).toEqual([
      { mediaType: 'movie', tmdbId: 693134, title: 'Duna: Parte Dois', year: 2024, releaseDate: '2024-02-27', posterPath: '/d.jpg' },
      { mediaType: 'tv', tmdbId: 136315, title: 'O Urso', year: 2022, releaseDate: '2022-06-23', posterPath: null },
      { mediaType: 'movie', tmdbId: 2, title: 'Sem tradução', year: null, releaseDate: null, posterPath: null },
    ]);
    expect(asked[0].url.searchParams.get('language')).toBe('pt-BR');
    expect(asked[0].url.searchParams.get('api_key')).toBe('v3key');
  });

  it('sends a v4 token as a bearer header, never in the URL', async () => {
    const asked: { url: URL; headers: Record<string, string> }[] = [];
    await tmdbCatalog('eyJtoken', fakeFetch({ '/3/search/tv': { results: [] } }, asked)).search('urso', { mediaType: 'tv', year: 2022 });
    expect(asked[0].headers.Authorization).toBe('Bearer eyJtoken');
    expect(asked[0].url.searchParams.has('api_key')).toBe(false);
    expect(asked[0].url.searchParams.get('first_air_date_year')).toBe('2022');
  });

  it('gives a series with its seasons, without the specials', async () => {
    const catalog = tmdbCatalog(
      'k',
      fakeFetch({
        '/3/tv/136315': {
          id: 136315,
          name: 'O Urso',
          first_air_date: '2022-06-23',
          seasons: [
            { season_number: 0, name: 'Especiais' },
            { season_number: 1, name: 'Temporada 1', air_date: '2022-06-23', poster_path: '/s1.jpg' },
            { season_number: 2, name: '', air_date: null },
          ],
        },
      }),
    );
    expect(await catalog.title('tv', 136315)).toMatchObject({
      title: 'O Urso',
      seasons: [
        { season: 1, name: 'Temporada 1', releaseDate: '2022-06-23', posterPath: '/s1.jpg' },
        { season: 2, name: 'Temporada 2', releaseDate: null, posterPath: null },
      ],
    });
  });

  it('answers null for an unknown title and throws when TMDB fails', async () => {
    expect(await tmdbCatalog('k', fakeFetch({})).title('movie', 1)).toBeNull();
    await expect(tmdbCatalog('k', fakeFetch({ '/3/search/multi': 500 })).search('x')).rejects.toThrow();
  });

  it('finds an IMDb id', async () => {
    const catalog = tmdbCatalog('k', fakeFetch({ '/3/find/tt0903747': { movie_results: [], tv_results: [{ id: 1396, name: 'Breaking Bad' }] } }));
    expect(await catalog.findImdb('tt0903747')).toMatchObject([{ mediaType: 'tv', tmdbId: 1396, title: 'Breaking Bad' }]);
  });
});

describe('Pede pra Paçoca', () => {
  const row = {
    tmdb_id: 693134,
    media_type: 'movie',
    title: 'Duna: Parte Dois',
    year: 2024,
    release_date: '2024-02-27',
    poster_path: '/d.jpg',
    watched_at: '2026-03-10T21:00:00Z',
    rating: 5,
  };

  it('reads its rows', () => {
    expect(toWatched(row)).toEqual({
      tmdbId: 693134,
      mediaType: 'movie',
      title: 'Duna: Parte Dois',
      year: 2024,
      releaseDate: '2024-02-27',
      posterPath: '/d.jpg',
      watchedAt: '2026-03-10T21:00:00.000Z',
      rating: 5,
    });
  });

  it('keeps a row without TMDB id, and drops what is not a row', () => {
    expect(toWatched({ ...row, tmdb_id: null, rating: 9 })).toMatchObject({ tmdbId: null, rating: null });
    expect(toWatched({ ...row, media_type: 'book' })).toBeNull();
    expect(toWatched({ ...row, watched_at: 'ontem' })).toBeNull();
    expect(toWatched('x')).toBeNull();
  });

  it('is off without a binding, and asks with the e-mail in one form', async () => {
    expect(pedeFromBinding(undefined)).toBeNull();
    const asked: string[] = [];
    const pede = pedeFromBinding({
      isMember: async (email) => (asked.push(email), true),
      watchedBy: async () => [row, { nope: true }],
    })!;
    expect(await pede.isMember(' Ana@Example.com ')).toBe(true);
    expect(asked).toEqual(['ana@example.com']);
    expect(await pede.watchedBy('ana@example.com')).toHaveLength(1);
  });
});
