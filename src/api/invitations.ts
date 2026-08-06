import API from "./api";

const BASE_URL: string = API.BASE_URL;

const INVITATIONS = {
  SEND: `${BASE_URL}/invitations/send`,
  RESPOND: `${BASE_URL}/invitations/respond`,
  RECEIVED: (playerId: string) => `${BASE_URL}/invitations/received/${playerId}`,
  SENT: (playerId: string) => `${BASE_URL}/invitations/sent/${playerId}`,
  PENDING_COUNT: (playerId: string) => `${BASE_URL}/invitations/pending-count/${playerId}`,
  BY_TOURNAMENT: (tournamentId: string) => `${BASE_URL}/invitations/tournament/${tournamentId}`,
  DEFAULT_PLAYERS: `${BASE_URL}/invitations/default-players`,
  SEARCH_PLAYERS: `${BASE_URL}/chat/search-players`,
};

export default INVITATIONS;
