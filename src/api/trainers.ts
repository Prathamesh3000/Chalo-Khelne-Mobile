import API from "./api";

// Trainer discovery / booking endpoints (server routes at /api/trainer).
const BASE_URL = API.SERVER_URL; // used for resolving relative profile-image paths
const TRAINER_API = `${API.BASE_URL}/trainer`;

const TRAINERS = {
  SERVER_URL: API.SERVER_URL,
  BASE_URL, // legacy callers prefix relative image paths with this
  UPLOADS_URL: API.UPLOADS_URL,

  ENDPOINTS: {
    // Trainer discovery (public)
    GET_ALL: `${TRAINER_API}/trainers`,
    GET_BY_ID: (id: string) => `${TRAINER_API}/trainer/${id}`,
    PROFILE: (id: string) => `${TRAINER_API}/profile/${id}`,

    // Featured / rating filters — the public trainer list with query hints.
    FILTERS: {
      FEATURED: `${TRAINER_API}/trainers?featured=true`,
      BY_RATING: (rating: number) => `${TRAINER_API}/trainers?minRating=${rating}`,
    },

    // Session types (public)
    SESSION_TYPES: {
      GET: `${TRAINER_API}/session-types`,
      GET_BY_TRAINER: (id: string) => `${TRAINER_API}/session-types/${id}`,
    },

    // Session booking request (authenticated)
    REQUEST_SESSION: `${TRAINER_API}/request-session`,
  },
};

export default TRAINERS;
