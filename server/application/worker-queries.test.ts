import { describe, expect, it } from 'vitest';
import type { CatalogHit, CatalogTitle } from '../../src/application/api-contract';
import type { Catalog, PedePraPacoca } from './ports';
import { isWorkerQuery, runWorkerQuery, type WorkerPorts } from './worker-queries';

const dune: CatalogHit = { mediaType: 'movie', tmdbId: 693134, title: 'Duna: Parte Dois', year: 2024, releaseDate: '2024-02-27', posterPath: '/p.jpg' };
const bear: CatalogTitle = {
  mediaType: 'tv',
  tmdbId: 136315,
  title: 'O Urso',
  year: 2022,
  releaseDate: '2022-06-23',
  posterPath: null,
  seasons: [{ season: 1, name: 'Temporada 1', releaseDate: '2022-06-23', posterPath: null }],
};

function fakeCatalog(calls: unknown[] = []): Catalog {
  return {
    search: async (text, filter) => {
      calls.push(['search', text, filter]);
      return [dune];
    },
    title: async (mediaType, tmdbId) => (mediaType === 'tv' && tmdbId === bear.tmdbId ? bear : null),
    findImdb: async (imdbId) => (imdbId === 'tt15239678' ? [dune] : []),
  };
}

const pede = (members: string[]): PedePraPacoca => ({ isMember: async (email) => members.includes(email), watchedBy: async () => [] });
const run = (ports: WorkerPorts, name: Parameters<typeof runWorkerQuery>[2], input: unknown) =>
  runWorkerQuery(ports, { email: 'ana@example.com' }, name, input);

describe('catalog queries', () => {
  it('search TMDB with a clean text, by type and year when asked', async () => {
    const calls: unknown[] = [];
    const ports = { catalog: fakeCatalog(calls), pede: null };
    expect(await run(ports, 'catalog.search', { text: '  Duna  2 ' })).toEqual({ ok: true, value: [dune] });
    await run(ports, 'catalog.search', { text: 'Duna', mediaType: 'movie', year: 2024 });
    expect(calls).toEqual([
      ['search', 'Duna 2', undefined],
      ['search', 'Duna', { mediaType: 'movie', year: 2024 }],
    ]);
  });

  it('refuse bad inputs before calling TMDB', async () => {
    const ports = { catalog: fakeCatalog(), pede: null };
    expect(await run(ports, 'catalog.search', { text: ' ' })).toEqual({ ok: false, error: 'invalid' });
    expect(await run(ports, 'catalog.search', { text: 'x', mediaType: 'book' })).toEqual({ ok: false, error: 'invalid' });
    expect(await run(ports, 'catalog.title', { mediaType: 'tv', tmdbId: -1 })).toEqual({ ok: false, error: 'invalid' });
    expect(await run(ports, 'catalog.link', { link: 'Duna' })).toEqual({ ok: false, error: 'invalid' });
  });

  it('give a series with its seasons, or not_found', async () => {
    const ports = { catalog: fakeCatalog(), pede: null };
    expect(await run(ports, 'catalog.title', { mediaType: 'tv', tmdbId: bear.tmdbId })).toEqual({ ok: true, value: bear });
    expect(await run(ports, 'catalog.title', { mediaType: 'movie', tmdbId: 1 })).toEqual({ ok: false, error: 'not_found' });
  });

  it('resolve TMDB and IMDb links', async () => {
    const ports = { catalog: fakeCatalog(), pede: null };
    const { seasons: _seasons, ...bearHit } = bear;
    expect(await run(ports, 'catalog.link', { link: 'https://www.themoviedb.org/tv/136315-the-bear' })).toEqual({ ok: true, value: [bearHit] });
    expect(await run(ports, 'catalog.link', { link: 'https://www.imdb.com/title/tt15239678/' })).toEqual({ ok: true, value: [dune] });
    expect(await run(ports, 'catalog.link', { link: 'https://www.themoviedb.org/movie/1' })).toEqual({ ok: true, value: [] });
  });

  it('are unavailable without a key or when TMDB fails', async () => {
    expect(await run({ catalog: null, pede: null }, 'catalog.search', { text: 'Duna' })).toEqual({ ok: false, error: 'unavailable' });
    const broken: Catalog = { ...fakeCatalog(), search: () => Promise.reject(new Error('down')) };
    expect(await run({ catalog: broken, pede: null }, 'catalog.search', { text: 'Duna' })).toEqual({ ok: false, error: 'unavailable' });
  });
});

describe('pede.status', () => {
  it('says whether my e-mail is in Pede pra Paçoca', async () => {
    expect(await run({ catalog: null, pede: pede(['ana@example.com']) }, 'pede.status', {})).toEqual({ ok: true, value: { member: true } });
    expect(await run({ catalog: null, pede: pede([]) }, 'pede.status', {})).toEqual({ ok: true, value: { member: false } });
  });

  it('is false without a binding, and unavailable when Pede does not answer', async () => {
    expect(await run({ catalog: null, pede: null }, 'pede.status', {})).toEqual({ ok: true, value: { member: false } });
    const down: PedePraPacoca = { isMember: () => Promise.reject(new Error('down')), watchedBy: async () => [] };
    expect(await run({ catalog: null, pede: down }, 'pede.status', {})).toEqual({ ok: false, error: 'unavailable' });
  });
});

it('tells the Worker queries apart from the group ones', () => {
  expect(isWorkerQuery('catalog.search')).toBe(true);
  expect(isWorkerQuery('me')).toBe(false);
  expect(isWorkerQuery('toString')).toBe(false);
});
