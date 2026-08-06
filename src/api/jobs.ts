import API from "./api";

const BASE_URL: string = API.BASE_URL;

// Sports Jobs & Opportunities marketplace endpoints
const JOBS = {
  // Job postings (browse)
  POSTINGS: `${BASE_URL}/jobs/postings`,
  POSTING_BY_ID: (id: string) => `${BASE_URL}/jobs/postings/${id}`,

  // Applications
  APPLY: `${BASE_URL}/jobs/applications`,
  MY_APPLICATIONS: (userId: string) => `${BASE_URL}/jobs/applications/my/${userId}`,

  // Professional directory (hire)
  PROFESSIONALS: `${BASE_URL}/jobs/professionals`,

  // Professional profiles
  CREATE_PROFILE: `${BASE_URL}/jobs/profiles`,
  MY_PROFILES: (userId: string) => `${BASE_URL}/jobs/profiles/my/${userId}`,
  PROFILE_BY_ID: (id: string) => `${BASE_URL}/jobs/profiles/${id}`,
  SET_PROFILE_ACTIVE: (id: string) => `${BASE_URL}/jobs/profiles/${id}/active`,

  // Hire requests
  SEND_HIRE: `${BASE_URL}/jobs/hire-requests`,
  RECEIVED_HIRES: (userId: string) => `${BASE_URL}/jobs/hire-requests/received/${userId}`,
  RESPOND_HIRE: (id: string) => `${BASE_URL}/jobs/hire-requests/${id}/respond`,

  // Professional dashboard
  DASHBOARD: (userId: string) => `${BASE_URL}/jobs/dashboard/${userId}`,
};

export default JOBS;
