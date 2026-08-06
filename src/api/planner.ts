import API from "./api";

const BASE = `${(API as { BASE_URL: string }).BASE_URL}/planner`;

const PLANNER = {
  BASE_URL: BASE,
  ENDPOINTS: {
    CREATE: BASE, // POST
    UPDATE: (id: string) => `${BASE}/${id}`, // PUT
    DELETE: (id: string) => `${BASE}/${id}`, // DELETE
    BY_ID: (id: string) => `${BASE}/${id}`, // GET
    FEED: (userId: string) => `${BASE}/feed/${userId}`, // GET (merged feed)
  },
};

export default PLANNER;
