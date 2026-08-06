import API from "./api";

const BASE = `${(API as { BASE_URL: string }).BASE_URL}/group-chat`;

export const groupChatApi = {
  BASE,
  CHATS: BASE,
  CHAT: (id: string) => `${BASE}/${id}`,
  RENAME: (id: string) => `${BASE}/${id}/rename`,
  ADD_MEMBER: (id: string) => `${BASE}/${id}/add`,
  REMOVE_MEMBER: (id: string) => `${BASE}/${id}/remove`,
  MESSAGES: (id: string) => `${BASE}/${id}/messages`,
  SEND_MESSAGE: (id: string) => `${BASE}/${id}/message`,
  SEARCH_USERS: `${BASE}/search-users`,
};

export default groupChatApi;
