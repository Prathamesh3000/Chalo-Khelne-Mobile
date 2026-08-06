import API from "./api";

const BASE_URL: string = API.BASE_URL;

const NOTIFICATIONS = {
  GET_ALL: (userId: string) => `${BASE_URL}/notifications/player/${userId}`,
  UNREAD_COUNT: (userId: string) => `${BASE_URL}/notifications/player/${userId}/unread-count`,
  MARK_READ: (notifId: string) => `${BASE_URL}/notifications/player/${notifId}/read`,
  MARK_ALL_READ: (userId: string) => `${BASE_URL}/notifications/player/${userId}/read-all`,
};

export default NOTIFICATIONS;
