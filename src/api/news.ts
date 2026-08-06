import API from "./api";

const { BASE_URL } = API as { BASE_URL: string };

const ENDPOINTS = {
  ACTIVE: `${BASE_URL}/news/active`,
  BY_SPORT: (sport: string) => `${BASE_URL}/news/sport/${encodeURIComponent(sport)}`,
  BY_ID: (id: string) => `${BASE_URL}/news/${id}`,
};

export default {
  BASE_URL,
  ENDPOINTS,
};
