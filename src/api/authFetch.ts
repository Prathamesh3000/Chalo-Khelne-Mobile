import axios from "axios";
import { getToken } from "../services/tokenStore";

/**
 * Drop-in replacement for fetch() that attaches the app-wide Authorization
 * bearer token — the same one AuthContext mirrors onto the axios defaults (and
 * keeps fresh through token refresh). Screens that use raw fetch otherwise hit
 * protected routes unauthenticated and get a 401.
 *
 * Returns a normal Response, so existing `.ok` / `.json()` / `.status` handling
 * at the call site keeps working unchanged — the request just carries the header.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let auth: string | undefined = axios?.defaults?.headers?.common?.Authorization as string | undefined;
  if (!auth) {
    // Fallback for the rare case the axios default isn't set yet (very early in
    // app startup): read the persisted token directly.
    try {
      const t = await getToken();
      if (t) auth = `Bearer ${t}`;
    } catch {
      /* ignore — fall through and send unauthenticated */
    }
  }

  const headers: Record<string, string> = { ...((options.headers as Record<string, string>) || {}) };
  const alreadyHasAuth = Object.keys(headers).some((k) => k.toLowerCase() === "authorization");
  if (auth && !alreadyHasAuth) headers.Authorization = auth;

  return fetch(url, { ...options, headers });
}

export default authFetch;
