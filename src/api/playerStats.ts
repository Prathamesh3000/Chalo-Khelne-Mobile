import API from "./api";

const { BASE_URL } = API as { BASE_URL: string };

const ENDPOINTS = {
  CAREER: (userId: string) => `${BASE_URL}/player-stats/${userId}`,
  RANKING: (sport?: string) =>
    `${BASE_URL}/player-stats/ranking${sport ? `/${encodeURIComponent(sport)}` : ""}`,
};

export default {
  BASE_URL,
  ENDPOINTS,
};
