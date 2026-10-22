# ADR-010: Calls to other servers run in the Worker; Brasília time is a fixed UTC−3

**Status:** Accepted
**Date:** 2026-10-22
**Decision:** Queries that call another server (TMDB, ADR-008; Pede pra Paçoca, ADR-009) are
answered by the Worker, not by the `Group` object: `catalog.search`, `catalog.title`,
`catalog.link` and `pede.status` (`WorkerQueryName` in `src/application/api-contract.ts`,
handlers in `server/application/worker-queries.ts`). The Worker first asks the `Group` who the
session belongs to (`Group.sessionEmail`), then calls the other server through the async ports
`Catalog` and `PedePraPacoca` (`server/application/ports.ts`), implemented by
`server/infrastructure/tmdb.ts` and `server/infrastructure/pede.ts`. A port is null where it is not
set up (no `TMDB_API_KEY`, no `PEDE` binding): the catalog then answers `unavailable` and
`pede.status` answers `{ member: false }`. These queries read nothing from the group's database.
When a command needs data from another server (importing from Pede pra Paçoca), the Worker fetches
it first and passes it to a synchronous `Group` command, which checks and writes it in one
transaction.
Sign-in asks Pede pra Paçoca only when the invite rules say no, and only lets someone new in that
way: a member an admin removed needs a new invite (`docs/spec/acesso-e-membros.md`).
All award times are Brasília time. Brazil dropped daylight saving time in 2019, so the server
converts with a fixed UTC−3 (`src/domain/award/brasilia.ts`); the database keeps UTC instants.
The app shows dates with `Intl` and the `America/Sao_Paulo` zone.
**Why:** The `Group` object runs one call at a time (ADR-004); an `await` on TMDB inside it would
either hold every member's commands for the length of a network call or let other calls interleave
in the middle of a use case. Keeping the use cases synchronous keeps the "one command, one
transaction" invariant simple and the tests on `node:sqlite`. A fixed offset needs no time zone
database in the Worker and is exact while Brazil has no daylight saving time.
**Alternatives:** Async methods on the `Group` object (interleaving, and input gates do not cover
outgoing fetches). Caching TMDB answers in the database (not needed for 13 people; the `media`
table keeps what each item needs once the list exists). A time zone library (a dependency for one
fixed offset).
