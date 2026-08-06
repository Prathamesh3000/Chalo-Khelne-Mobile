// auth.ts — authentication + role-profile endpoints.
import API from "./api";

// Base URL inherited from main API config
const { BASE_URL } = API;

const ENDPOINTS = {
  // User authentication
  REGISTER: `${BASE_URL}/register`,
  LOGIN: `${BASE_URL}/login`,
  CURRENT_USER: `${BASE_URL}/user/me`,
  FORGOT_PASSWORD: `${BASE_URL}/forgot-password`,
  RESET_PASSWORD: `${BASE_URL}/reset-password`,
  GOOGLE_LOGIN: `${BASE_URL}/google-login`,
  REGISTER_DEVICE: `${BASE_URL}/register-device`,
  REFRESH: `${BASE_URL}/auth/refresh`,
  LOGOUT: `${BASE_URL}/auth/logout`,

  // User profile management
  USER: {
    PROFILE: (userId: string) => `${BASE_URL}/user/profile/${userId}`,
    UPLOAD_IMAGE: (userId: string) => `${BASE_URL}/user/profile/upload-image/${userId}`,
    SWITCH_ROLE: (userId: string) => `${BASE_URL}/user/switch-role/${userId}`,
    CAN_SWITCH_ROLE: (userId: string) => `${BASE_URL}/user/can-switch-role/${userId}`,
  },

  // Role-specific endpoints
  TRAINER: {
    PROFILE: (trainerId: string) => `${BASE_URL}/trainer/profile/${trainerId}`,
    CERTIFICATE: (trainerId: string) => `${BASE_URL}/trainer/certificate/${trainerId}`,
  },

  REFEREE: {
    PROFILE: (refereeId: string) => `${BASE_URL}/referee/profile/${refereeId}`,
    CERTIFICATE: (refereeId: string) => `${BASE_URL}/referee/certificate/${refereeId}`,
    ASSIGNMENTS: (refereeId: string) => `${BASE_URL}/referee/assignments/${refereeId}`,
    STATS: (refereeId: string) => `${BASE_URL}/referee/stats/${refereeId}`,
  },
};

export default {
  BASE_URL,
  ENDPOINTS,
};
