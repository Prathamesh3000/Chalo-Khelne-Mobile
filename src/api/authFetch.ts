import { getToken } from "../services/tokenStore";
import axios from "axios";
import { refreshAccessToken } from "../services/http";

/**
 * Drop-in replacement for fetch() that attaches the app-wide Authorization
 * bearer token â€” the same one AuthContext mirrors onto the axios defaults (and
 * keeps fresh through token refresh). Screens that use raw fetch otherwise hit
 * protected routes unauthenticated and get a 401.
 *
 * Also refreshes and retries once on a 401, which bare fetch cannot do on its
 * own. Access tokens last 1 hour; before this, any fetch-based call made after
 * expiry got a hard 401 while every axios call in the same session recovered
 * silently through the response interceptor â€” so a screen would fail for no
 * visible reason until the app was restarted.
 *
 * Returns a normal Response, so existing `.ok` / `.json()` / `.status` handling
 * at the call site keeps working unchanged.
 */

// Never try to refresh the auth endpoints themselves â€” a 401 from the refresh
// or login call is the answer, not something to retry.
const isAuthEndpoint = (url: string) => {
  const u = String(url || "");
  return u.includes("/auth/refresh") || u.includes("/login") || u.includes("/google-login");
};

async function resolveAuthHeader(): Promise<string | undefined> {
  const fromAxios = axios?.defaults?.headers?.common?.Authorization as string | undefined;
  if (fromAxios) return fromAxios;
  // Fallback for the rare case the axios default isn't set yet (very early in
  // app startup): read the persisted token directly.
  try {
    const t = await getToken();
    return t ? `Bearer ${t}` : undefined;
  } catch {
    return undefined; // fall through and send unauthenticated
  }
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const auth: string | undefined = await resolveAuthHeader();

  const headers: Record<string, string> = { ...((options.headers as Record<string, string>) || {}) };

  // A caller-supplied Authorization header only wins if it actually carries a
  // token. Many screens still build one from the legacy plaintext AsyncStorage
  // key ("auth_token"), which tokenStore migrated to SecureStore and deleted â€”
  // so they produce the literal "Bearer null"/"Bearer undefined". Left alone
  // that reaches the server and fails jwt.verify as "Invalid token." Drop it and
  // let the live token below take over, matching what the axios request
  // interceptor in services/http already does for bare-axios calls.
  for (const k of Object.keys(headers)) {
    if (k.toLowerCase() !== "authorization") continue;
    const value = String(headers[k] ?? "").trim();
    const token = value.replace(/^Bearer\s+/i, "").trim();
    if (!token || token === "null" || token === "undefined") delete headers[k];
  }

  const alreadyHasAuth = Object.keys(headers).some((k) => k.toLowerCase() === "authorization");
  if (auth && !alreadyHasAuth) headers.Authorization = auth;

  const res = await fetch(url, { ...options, headers });

  // Refresh-then-retry, once. Mirrors the axios response interceptor, and
  // shares its single in-flight refresh so the two cannot rotate the refresh
  // token twice in parallel.
  if (res.status !== 401 || isAuthEndpoint(url)) return res;

  let fresh: string | null = null;
  try {
    fresh = await refreshAccessToken();
  } catch {
    return res; // refresh failed â€” hand back the original 401
  }
  if (!fresh) return res;

  // A body stream can only be consumed once, so a retry is only safe for a
  // re-sendable body. Strings and FormData are; a ReadableStream is not.
  const body = options.body as unknown;
  const bodyIsReplayable =
    body == null ||
    typeof body === "string" ||
    (typeof FormData !== "undefined" && body instanceof FormData);
  if (!bodyIsReplayable) return res;

  return fetch(url, {
    ...options,
    headers: { ...headers, Authorization: `Bearer ${fresh}` },
  });
}

export default authFetch;
