# ADR-008: TMDB as the media catalog

**Status:** Accepted
**Date:** 2026-10-22
**Decision:** Movies and series come from TMDB (The Movie Database). The Worker calls
`https://api.themoviedb.org` with the secret `TMDB_API_KEY` (`wrangler secret put`, `.dev.vars`
locally); the app never calls TMDB and never sees the key. Search, details, season air dates and
release dates go through the API (`/api/query`). Posters load straight from
`https://image.tmdb.org` (`IMAGE_ORIGINS`), like Google profile photos (ADR-006). A media item is
identified by `media_type` + `tmdb_id` (+ season number for a series season); that is the key that
says two items are the same, never the title.
**Why:** The spec needs search by title, posters, release dates per season, and a stable key to
match items imported from Pede pra Paçoca, which stores `tmdb_id` (ADR-009). TMDB is free for
non-commercial use and has all of it.
**Alternatives:** OMDb (keyed by IMDb id): no per-season air dates, and Pede pra Paçoca does not
store IMDb ids, so imports could not be matched. A pasted IMDb link is resolved to TMDB with
TMDB's `/find` endpoint.
