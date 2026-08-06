import API from "./api";

const BASE_URL = API.BASE_URL;

// Trainer Console endpoints
const TRAINER = {
  ME: (userId: string) => `${BASE_URL}/trainer-console/me/${userId}`,
  DASHBOARD: (userId: string) => `${BASE_URL}/trainer-console/dashboard/${userId}`,
  EARNINGS: (userId: string) => `${BASE_URL}/trainer-console/earnings/${userId}`,

  SESSIONS: (userId: string) => `${BASE_URL}/trainer-console/sessions/${userId}`,
  CREATE_SESSION: `${BASE_URL}/trainer-console/sessions`,

  BATCHES: (userId: string) => `${BASE_URL}/trainer-console/batches/${userId}`,
  CREATE_BATCH: `${BASE_URL}/trainer-console/batches`,

  REQUESTS: (userId: string) => `${BASE_URL}/trainer-console/requests/${userId}`,
  RESPOND_PLAYER: (id: string) => `${BASE_URL}/trainer-console/requests/player/${id}/respond`,
  RESPOND_CLUB: (id: string) => `${BASE_URL}/trainer-console/requests/club/${id}/respond`,

  CLUBS: `${BASE_URL}/trainer-console/clubs`,
  APPLY_CLUB: `${BASE_URL}/trainer-console/clubs/apply`,

  // Calendar / Schedule feed (User, Manager, or Substitute).
  CALENDAR: (userId: string) => `${BASE_URL}/trainer-console/calendar/${userId}`,
};

export default TRAINER;
