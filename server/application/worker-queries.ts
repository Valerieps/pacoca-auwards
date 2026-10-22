// Queries that call another server (TMDB, Pede pra Paçoca). The Worker answers them itself, after
// the Group object confirmed the session, so the group's one-at-a-time object never waits on the
// network (ADR-010). They read nothing from the group's database.
import type { ApiResult, CatalogHit, Queries, WorkerQueryName } from '../../src/application/api-contract';
import { isMediaType, isTmdbId, normalizeSearch, parseMediaLink } from '../../src/domain/catalog/media';
import type { Catalog, PedePraPacoca } from './ports';

/** What the Worker has: either port is null where it is not set up (no key, no binding). */
export interface WorkerPorts {
  readonly catalog: Catalog | null;
  readonly pede: PedePraPacoca | null;
}

/** The signed-in member asking. */
export interface Asker {
  readonly email: string;
}

type Input = Record<string, unknown>;
type Handler<T> = (ports: WorkerPorts, asker: Asker, input: Input) => Promise<ApiResult<T>>;

const invalid = { ok: false, error: 'invalid' } as const;
const unavailable = { ok: false, error: 'unavailable' } as const;

/** Runs `call` on the catalog; `unavailable` without a key or when TMDB fails. */
async function withCatalog<T>(ports: WorkerPorts, call: (catalog: Catalog) => Promise<ApiResult<T>>): Promise<ApiResult<T>> {
  if (!ports.catalog) return unavailable;
  try {
    return await call(ports.catalog);
  } catch {
    return unavailable;
  }
}

const QUERIES: { [N in WorkerQueryName]: Handler<Queries[N]['output']> } = {
  'catalog.search': (ports, _asker, input) => {
    const text = typeof input.text === 'string' ? normalizeSearch(input.text) : null;
    if (!text) return Promise.resolve(invalid);
    if (input.mediaType !== undefined && !isMediaType(input.mediaType)) return Promise.resolve(invalid);
    if (input.year !== undefined && !isTmdbId(input.year)) return Promise.resolve(invalid);
    const filter = isMediaType(input.mediaType) ? { mediaType: input.mediaType, year: input.year as number | undefined } : undefined;
    return withCatalog(ports, async (catalog) => ({ ok: true, value: await catalog.search(text, filter) }));
  },

  'catalog.title': (ports, _asker, input) => {
    if (!isMediaType(input.mediaType) || !isTmdbId(input.tmdbId)) return Promise.resolve(invalid);
    const { mediaType, tmdbId } = input;
    return withCatalog(ports, async (catalog) => {
      const title = await catalog.title(mediaType, tmdbId);
      return title ? { ok: true, value: title } : { ok: false, error: 'not_found' };
    });
  },

  'catalog.link': (ports, _asker, input) => {
    const link = typeof input.link === 'string' ? parseMediaLink(input.link) : null;
    if (!link) return Promise.resolve(invalid);
    return withCatalog(ports, async (catalog): Promise<ApiResult<CatalogHit[]>> => {
      if (link.source === 'imdb') return { ok: true, value: await catalog.findImdb(link.imdbId) };
      const title = await catalog.title(link.mediaType, link.tmdbId);
      if (!title) return { ok: true, value: [] };
      const { seasons: _seasons, ...hit } = title;
      return { ok: true, value: [hit] };
    });
  },

  // Asked on each visit: someone who left Pede pra Paçoca stops seeing the import at once.
  'pede.status': async (ports, asker) => {
    if (!ports.pede) return { ok: true, value: { member: false } };
    try {
      return { ok: true, value: { member: await ports.pede.isMember(asker.email) } };
    } catch {
      return unavailable;
    }
  },
};

export function isWorkerQuery(name: string): name is WorkerQueryName {
  return Object.hasOwn(QUERIES, name);
}

export function runWorkerQuery(ports: WorkerPorts, asker: Asker, name: WorkerQueryName, input: unknown): Promise<ApiResult<unknown>> {
  const body = typeof input === 'object' && input !== null && !Array.isArray(input) ? (input as Input) : {};
  return QUERIES[name](ports, asker, body);
}
