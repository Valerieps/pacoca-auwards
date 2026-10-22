# ADR-009: Pede pra Paçoca by a Service Binding

**Status:** Accepted
**Date:** 2026-10-22
**Decision:** The AUwards Worker reaches the Pede pra Paçoca Worker through a Service Binding
(`services` in `wrangler.jsonc`), calling a read-only `WorkerEntrypoint` there with two methods:
`isMember(email)` and `watchedBy(email, from, to)`. Both Workers are on the owner's Cloudflare
account. The entrypoint has no HTTP route and no shared secret; Pede pra Paçoca answers through its
own `GroupService`, returning only the caller's own "Assisti" rows (`tmdb_id`, `media_type`,
`title`, `year`, `release_date`, `poster_path`, `watched_at`, `rating`).
- **Sign-in:** an e-mail that `isMember` accepts enters AUwards without an invite, as a
  participant. Leaving Pede pra Paçoca later does not remove the member from AUwards.
- **Import:** new items are written in one transaction; nothing half-imported. Rows without
  `tmdb_id` are not dropped: the app searches TMDB by title and year and shows the options in a
  carousel for the member to pick the right one, or skip it.
- **Previews:** branch previews have no binding; the import button and the Pede sign-in are off
  there and on localhost unless a local Pede Worker runs (`wrangler dev` with both configs).
**Why:** No public route means nothing to attack from the internet and no secret to rotate. The
binding is the network-policy equivalent for Worker-to-Worker calls: it is declared in one config
file, not in `SERVER_ORIGINS`, because it has no URL.
**Alternatives:** A public HTTP endpoint with a shared secret: more surface and a secret to keep
in two places. Exporting a file from Pede and uploading it: the spec wants one tap.
