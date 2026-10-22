import { describe, expect, it } from 'vitest';
import { isTmdbId, normalizeSearch, parseMediaLink, yearOf } from './media';

describe('parseMediaLink', () => {
  it('reads TMDB links to movies and series', () => {
    expect(parseMediaLink('https://www.themoviedb.org/movie/693134-dune-part-two')).toEqual({ source: 'tmdb', mediaType: 'movie', tmdbId: 693134 });
    expect(parseMediaLink(' https://www.themoviedb.org/tv/1396-breaking-bad/season/2 ')).toEqual({ source: 'tmdb', mediaType: 'tv', tmdbId: 1396 });
    expect(parseMediaLink('themoviedb.org/pt-BR/movie/27205')).toEqual({ source: 'tmdb', mediaType: 'movie', tmdbId: 27205 });
  });

  it('reads IMDb links', () => {
    expect(parseMediaLink('https://www.imdb.com/title/tt15239678/?ref_=nv')).toEqual({ source: 'imdb', imdbId: 'tt15239678' });
    expect(parseMediaLink('https://m.imdb.com/pt/title/tt0903747/')).toEqual({ source: 'imdb', imdbId: 'tt0903747' });
  });

  it('refuses anything else', () => {
    expect(parseMediaLink('Duna: Parte Dois')).toBeNull();
    expect(parseMediaLink('https://notthemoviedb.org/movie/1')).toBeNull();
    expect(parseMediaLink('https://www.imdb.com/name/nm0000123/')).toBeNull();
    expect(parseMediaLink('https://www.themoviedb.org/person/1-x')).toBeNull();
  });
});

describe('media helpers', () => {
  it('cleans search texts', () => {
    expect(normalizeSearch('  Duna   2 ')).toBe('Duna 2');
    expect(normalizeSearch(' ')).toBeNull();
    expect(normalizeSearch('x'.repeat(101))).toBeNull();
  });

  it('accept only positive whole TMDB ids', () => {
    expect(isTmdbId(1)).toBe(true);
    expect(isTmdbId(0)).toBe(false);
    expect(isTmdbId(1.5)).toBe(false);
    expect(isTmdbId('1')).toBe(false);
  });

  it('take the year of a date', () => {
    expect(yearOf('2024-02-27')).toBe(2024);
    expect(yearOf(null)).toBeNull();
    expect(yearOf('')).toBeNull();
  });
});
