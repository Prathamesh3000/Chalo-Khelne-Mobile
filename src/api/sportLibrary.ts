import API from "./api";

const { BASE_URL } = API as { BASE_URL: string };

const ENDPOINTS = {
  LIST: `${BASE_URL}/sport-library`,
  BY_ID: (idOrSlug: string) => `${BASE_URL}/sport-library/${idOrSlug}`,
};

export default {
  BASE_URL,
  ENDPOINTS,
};
