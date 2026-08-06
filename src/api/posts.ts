// api/posts.ts
import API from "./api";

const { BASE_URL } = API;

const ENDPOINTS = {
  // Post CRUD operations
  GET_ALL: `${BASE_URL}/posts`,
  CREATE: `${BASE_URL}/posts`,
  GET_BY_ID: (postId: string) => `${BASE_URL}/posts/${postId}`,
  UPDATE: (postId: string) => `${BASE_URL}/posts/${postId}`,
  DELETE: (postId: string) => `${BASE_URL}/posts/${postId}`,

  // Post interactions
  LIKE: (postId: string) => `${BASE_URL}/posts/${postId}/like`,
  SAVE: (postId: string) => `${BASE_URL}/posts/${postId}/save`,

  // Comments
  ADD_COMMENT: (postId: string) => `${BASE_URL}/posts/${postId}/comments`,
  GET_COMMENTS: (postId: string) => `${BASE_URL}/posts/${postId}/comments`,
  DELETE_COMMENT: (postId: string, commentId: string) =>
    `${BASE_URL}/posts/${postId}/comments/${commentId}`,

  // Post filtering
  BY_USER: (userId: string) => `${BASE_URL}/posts/${userId}`,
  BY_TOURNAMENT: (tournamentId: string) => `${BASE_URL}/posts/tournament/${tournamentId}`,
  SAVED_BY_USER: (userId: string) => `${BASE_URL}/posts/saved/${userId}`,
};

export default {
  BASE_URL,
  ENDPOINTS,
};
