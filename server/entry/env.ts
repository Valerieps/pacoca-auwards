import type { PedeBinding } from '../infrastructure/pede';
import type { Group } from './group-object';

/** Bindings and settings from wrangler.jsonc; secrets are set with `wrangler secret put`. */
export interface Env {
  readonly ASSETS: Fetcher;
  readonly GROUP: DurableObjectNamespace<Group>;
  readonly GOOGLE_CLIENT_ID: string;
  readonly GOOGLE_CLIENT_SECRET: string;
  /** Comma-separated. Only used while the group has no admin at all. */
  readonly BOOTSTRAP_ADMIN_EMAILS: string;
  /** "1" turns on the test sign-in on localhost (ADR-007). Only ever set in `.dev.vars`. */
  readonly DEV_SIGN_IN?: string;
  /** TMDB read access token or API key (ADR-008). Without it, the catalog answers `unavailable`. */
  readonly TMDB_API_KEY?: string;
  /** The Service Binding to Pede pra Paçoca (ADR-009); missing on branch previews and until it is set up. */
  readonly PEDE?: PedeBinding;
}
