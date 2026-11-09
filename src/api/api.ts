// api.ts — Central API configuration (base URL + endpoint builders).
import { NativeModules } from "react-native";

// ── Server Configuration ──
// LOCAL auto-detects the LAN IP from the Metro bundle URL (so it matches the
// machine running expo start without manual IP edits); falls back to the
// last-known IP below if detection isn't available.
const DEV_FALLBACK_IP = "192.168.1.47";
function detectDevHost(): string {
  try {
    const scriptURL: string = (NativeModules as { SourceCode?: { scriptURL?: string } })?.SourceCode?.scriptURL || "";
    const m = scriptURL.match(/https?:\/\/([^:/]+)/);
    const host = m && m[1];
    if (host && host !== "localhost" && host !== "127.0.0.1") return host;
  } catch {
    /* not available — use fallback */
  }
  return DEV_FALLBACK_IP;
}

// ──────────────────────────────────────────────────────────────
// Server URL is ENV-DRIVEN — no more comment-toggling a line before release.
//   EXPO_PUBLIC_SERVER_URL : explicit override (wins if set)
//   EXPO_PUBLIC_ENV        : "production" | "staging" | "development" (default)
// ──────────────────────────────────────────────────────────────
const ENV: string = process.env.EXPO_PUBLIC_ENV || "development";
const ENV_URLS: Record<string, string> = {
  production: "https://chalokhelne.com",
  development: `http://${detectDevHost()}:3003`,
};
const SERVER_URL: string =
  process.env.EXPO_PUBLIC_SERVER_URL || ENV_URLS[ENV] || ENV_URLS.development;

const Wbsite_SERVER_URL = SERVER_URL; // kept for existing imports
const BASE_URL = `${SERVER_URL}/api`;
const UPLOADS_URL = `${SERVER_URL}/uploads`;

// API endpoints based on the backend routes
const ENDPOINTS = {
  TURFS: {
    BASE: `${BASE_URL}/turfs`,
    BY_ID: (id: string) => `${BASE_URL}/turfs/${id}`,
    OWNER: `${BASE_URL}/turfs/owner`,
    REVIEWS: (id: string) => `${BASE_URL}/turfs/${id}/reviews`,
    TOGGLE_STATUS: (id: string) => `${BASE_URL}/turfs/${id}/toggle-status`,
    AVAILABILITY_TODAY: `${BASE_URL}/turfs/availability/today`,

    // Get certified trainers for a specific turf
    CERTIFIED_TRAINERS: (turfId: string) =>
      `${BASE_URL}/trainer/certified-trainers/${turfId}`,
  },

  USER: {
    BASE: `${BASE_URL}/users`,
    FAVORITES: `${BASE_URL}/users/favorites`,
    TOGGLE_FAVORITE: `${BASE_URL}/users/favorites/toggle`,
    CHECK_FAVORITE: `${BASE_URL}/users/favorites/check`,
    USER_FAVORITES: (userId: string) => `${BASE_URL}/users/user-favorites/${userId}`,
    SEARCH: (query: string) => `${BASE_URL}/users/search?q=${query}`,
    VALIDATE_PLAYERS: `${BASE_URL}/players/users/validate-players`,
  },

  // Follow / social graph (backend: /api/follow)
  FOLLOW: {
    STATUS: (userId: string) => `${BASE_URL}/follow/${userId}/status`,
    TOGGLE: (targetId: string) => `${BASE_URL}/follow/${targetId}/toggle`,
    FOLLOWERS: (userId: string) => `${BASE_URL}/follow/${userId}/followers`,
    FOLLOWING: (userId: string) => `${BASE_URL}/follow/${userId}/following`,
  },

  // Turf booking endpoints
  TURF_BOOKINGS: {
    CREATE: `${BASE_URL}/players/turf-bookings/create`,
    USER_BOOKINGS: (userId: string) => `${BASE_URL}/players/turf-bookings/user/${userId}`,
    TURF_BOOKINGS: (turfId: string) => `${BASE_URL}/players/turf-bookings/turf/${turfId}`,
    BY_ID: (bookingId: string) => `${BASE_URL}/players/turf-booking/${bookingId}`,
    CANCEL: `${BASE_URL}/players/turf-bookings/cancel`,
    AVAILABILITY: (turfId: string) => `${BASE_URL}/players/turf-availability/${turfId}`,
  },

  // Tournament endpoints
  TOURNAMENTS: {
    BASE: `${BASE_URL}/tournaments`,
    BY_ID: (id: string) => `${BASE_URL}/tournaments/${id}`,
  },

  // Booking endpoints
  BOOKINGS: {
    CREATE: `${BASE_URL}/players/bookings/create`,
    BY_USER: (userId: string) => `${BASE_URL}/players/bookings/user/${userId}`,
    BY_ID: (id: string) => `${BASE_URL}/players/booking/${id}`,
    STATUS: `${BASE_URL}/players/bookings/status`,
    CANCEL: `${BASE_URL}/players/bookings/cancel`,
  },

  // Authentication endpoints
  AUTH: {
    LOGIN: `${BASE_URL}/auth/login`,
    REGISTER: `${BASE_URL}/auth/register`,
    VERIFY: `${BASE_URL}/auth/verify`,
    FORGOT_PASSWORD: `${BASE_URL}/auth/forgot-password`,
    RESET_PASSWORD: `${BASE_URL}/auth/reset-password`,
    REFRESH_TOKEN: `${BASE_URL}/auth/refresh-token`,
  },

  // Profile endpoints
  PROFILE: {
    GET: `${BASE_URL}/users/profile`,
    UPDATE: `${BASE_URL}/users/profile`,
    UPLOAD_PHOTO: `${BASE_URL}/users/profile/photo`,
  },
};

export default {
  SERVER_URL,
  BASE_URL,
  UPLOADS_URL,
  ENDPOINTS,
  Wbsite_SERVER_URL,
};
