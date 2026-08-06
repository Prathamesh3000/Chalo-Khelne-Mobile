// api/tournaments.ts — tournament-related endpoint builders.
import API from "./api";

const { BASE_URL } = API;

const ENDPOINTS = {
  BASE: `${BASE_URL}/tournaments`,
  BY_ID: (id: string) => `${BASE_URL}/tournaments/${id}`,
  BY_MANAGER: (managerId: string) => `${BASE_URL}/tournaments/manager/${managerId}`,
  LOGO: (id: string) => `${BASE_URL}/tournaments/${id}/logo`,

  // Groups
  GROUPS: {
    CREATE: (tournamentId: string) => `${BASE_URL}/tournaments/${tournamentId}/groups`,
    GET: (tournamentId: string) => `${BASE_URL}/tournaments/${tournamentId}/groups`,
    DELETE: (tournamentId: string, groupId: string) =>
      `${BASE_URL}/tournaments/${tournamentId}/groups/${groupId}`,
  },

  // Teams
  TEAMS: {
    CREATE: (tournamentId: string, groupId: string) =>
      `${BASE_URL}/tournaments/${tournamentId}/groups/${groupId}/teams`,
    GET: (tournamentId: string, groupId: string) =>
      `${BASE_URL}/tournaments/${tournamentId}/groups/${groupId}/teams`,
    DELETE: (tournamentId: string, groupId: string, teamId: string) =>
      `${BASE_URL}/tournaments/${tournamentId}/groups/${groupId}/teams/${teamId}`,
    DETAILS: (tournamentId: string, teamId: string) =>
      `${BASE_URL}/tournaments/team-details/${tournamentId}/${teamId}`,
  },

  // Players
  PLAYERS: {
    ADD: (tournamentId: string, groupId: string, teamId: string) =>
      `${BASE_URL}/tournaments/${tournamentId}/groups/${groupId}/teams/${teamId}/players`,
    GET: (tournamentId: string, groupId: string, teamId: string) =>
      `${BASE_URL}/tournaments/${tournamentId}/groups/${groupId}/teams/${teamId}/players`,
  },

  // Matches
  MATCHES: {
    ALL: `${BASE_URL}/tournaments/matches`,
    BY_TOURNAMENT: (tournamentId: string) => `${BASE_URL}/tournaments/${tournamentId}/matches`,
    CREATE: (tournamentId: string) => `${BASE_URL}/tournaments/${tournamentId}/matches`,
    BY_GROUP: (tournamentId: string, groupId: string) =>
      `${BASE_URL}/tournaments/matches/${tournamentId}/${groupId}`,
    GET_BY_ID: (matchId: string) => `${BASE_URL}/tournaments/match/${matchId}`,
    UPDATE: (matchId: string) => `${BASE_URL}/tournaments/matches/${matchId}`,
    STATUS: (matchId: string) => `${BASE_URL}/tournaments/match-status/${matchId}`,
    SUBSTITUTE: (matchId: string) => `${BASE_URL}/tournaments/matches/${matchId}/substitute`,
    UPDATE_DETAILS: (matchId: string) => `${BASE_URL}/tournaments/matches/${matchId}/update-details`,
    BY_POSITION: `${BASE_URL}/tournaments/matches-by-position`,
    BY_ROUND: `${BASE_URL}/tournaments/matches-by-round`,
  },

  // Scores
  SCORES: {
    CREATE: (matchId: string) => `${BASE_URL}/tournaments/matches/${matchId}/scores`,
    GET: (matchId: string) => `${BASE_URL}/tournaments/matches/${matchId}/scores`,
  },

  // Bookings
  BOOKINGS: {
    CREATE: `${BASE_URL}/tournaments/bookings/create`,
    CHECK: `${BASE_URL}/tournaments/bookings/check`,
    BY_USER: (userId: string) => `${BASE_URL}/tournaments/bookings/user/${userId}`,
    BY_TOURNAMENT: (tournamentId: string) => `${BASE_URL}/tournaments/bookings/tournament/${tournamentId}`,
    TOURNAMENT_TEAMS: (tournamentId: string) =>
      `${BASE_URL}/players/bookings/tournament-teams/${tournamentId}`,
  },

  // Tournament leaderboard
  LEADERBOARD: {
    ALL_TOURNAMENTS: `${BASE_URL}/tournaments/leaderboard/all`,
    GROUP_STAGE_PLAYERS: (tournamentId: string) => `${BASE_URL}/tournaments/leaderboard/${tournamentId}/players`,
    KNOCKOUT_TEAMS: (tournamentId: string) => `${BASE_URL}/tournaments/leaderboard/${tournamentId}/teams`,
  },

  // Booking Groups
  BOOKING_GROUPS: {
    CREATE: `${BASE_URL}/tournaments/bookinggroups/create`,
    BY_TOURNAMENT: (tournamentId: string) => `${BASE_URL}/tournaments/bookinggroups/tournament/${tournamentId}`,
    UPDATE: (groupId: string) => `${BASE_URL}/tournaments/bookinggroups/${groupId}`,
  },

  // Top Players
  TOP_PLAYERS: {
    SAVE: `${BASE_URL}/tournaments/topplayers/save`,
    BY_GROUP: (tournamentId: string, groupId: string) =>
      `${BASE_URL}/tournaments/topplayers/${tournamentId}/${groupId}`,
    BY_TOURNAMENT: (tournamentId: string) => `${BASE_URL}/tournaments/topplayers/${tournamentId}`,
  },

  // Super Matches
  SUPER_MATCHES: {
    CREATE: `${BASE_URL}/tournaments/super-matches`,
    BY_TOURNAMENT: (tournamentId: string) => `${BASE_URL}/tournaments/super-matches/${tournamentId}`,
    UPDATE: (matchId: string) => `${BASE_URL}/tournaments/super-matches/${matchId}`,
    UPDATE_WINNER: (matchId: string) => `${BASE_URL}/tournaments/super-matches/${matchId}`,
  },

  // Knockout Matches
  KNOCKOUT: {
    CREATE: `${BASE_URL}/tournaments/knockout-matches`,
    BY_TOURNAMENT: (tournamentId: string) => `${BASE_URL}/tournaments/knockout-matches/${tournamentId}`,
  },

  // Team Knockout Matches
  TEAM_KNOCKOUT: {
    CREATE: `${BASE_URL}/tournaments/matches`,
    NEXT_ROUND: `${BASE_URL}/tournaments/generate-next-round`,
    BYE_MATCHES: `${BASE_URL}/tournaments/generate-bye-matches`,
    // Round-Robin phase (precedes the knockout bracket for Davis Cup style flows).
    ROUND_ROBIN_STANDINGS: (tournamentId: string) =>
      `${BASE_URL}/tournaments/team-knockout/round-robin/standings/${tournamentId}`,
    BY_TOURNAMENT: (tournamentId: string) => `${BASE_URL}/tournaments/${tournamentId}/matches-by-tournament`,
    BY_ROUND: `${BASE_URL}/tournaments/matches-by-round`,
    GET_BY_ID: (matchId: string) => `${BASE_URL}/tournaments/match/${matchId}`,
    UPDATE: (matchId: string) => `${BASE_URL}/tournaments/matches/${matchId}`,
    BY_POSITION: `${BASE_URL}/tournaments/matches-by-position`,
    STATUS: (matchId: string) => `${BASE_URL}/tournaments/match-status/${matchId}`,
    SUBSTITUTE: (matchId: string) => `${BASE_URL}/tournaments/matches/${matchId}/substitute`,
    UPDATE_DETAILS: (matchId: string) => `${BASE_URL}/tournaments/matches/${matchId}/update-details`,
    TEAM_DETAILS: (tournamentId: string, teamId: string) =>
      `${BASE_URL}/tournaments/team-details/${tournamentId}/${teamId}`,
    SELECT_PAIRING: (matchId: string) =>
      `${BASE_URL}/tournaments/team-knockout/matches/${matchId}/select-pairing`,
    // Live scoring for a team tie (5-rubber Rapid Rallies / Davis Cup).
    LIVE_STATE: (matchId: string) =>
      `${BASE_URL}/tournaments/team-knockout/matches/${matchId}/live-state`,
    COMPLETE_GAME: (matchId: string) =>
      `${BASE_URL}/tournaments/team-knockout/matches/${matchId}/complete-game`,
  },

  NOTIFICATIONS: {
    USER: (userId: string) => `${BASE_URL}/notifications/user/${userId}`,
    COUNT: (userId: string) => `${BASE_URL}/notifications/user/${userId}/count`,
    MARK_READ: (notificationId: string) => `${BASE_URL}/notifications/${notificationId}/read`,
    MARK_ALL_READ: (userId: string) => `${BASE_URL}/notifications/user/${userId}/read-all`,
    UPDATE_TOKEN: (userId: string) => `${BASE_URL}/notifications/user/${userId}/expo-token`,
  },

  MOBILE: {
    DASHBOARD: (tournamentId: string) => `${BASE_URL}/mobile/tournaments/${tournamentId}/dashboard`,
    LIVE_GROUPS: (tournamentId: string) => `${BASE_URL}/mobile/tournaments/${tournamentId}/groups/live`,
    LIVE_STREAM: (matchId: string) => `${BASE_URL}/mobile/tournaments/matches/${matchId}/live-stream`,
    STANDINGS: (tournamentId: string, groupId: string) =>
      `${BASE_URL}/mobile/tournaments/${tournamentId}/groups/${groupId}/standings`,
    PLAYER_STATS: (tournamentId: string, playerId: string) =>
      `${BASE_URL}/mobile/tournaments/${tournamentId}/players/${playerId}/stats`,
    REFRESH: (tournamentId: string) => `${BASE_URL}/mobile/tournaments/${tournamentId}/refresh`,
    GROUPS_ENHANCED: (tournamentId: string) =>
      `${BASE_URL}/tournaments/bookinggroups/tournament/${tournamentId}?mobile=true`,
    MATCHES_ENHANCED: (tournamentId: string, groupId: string) =>
      `${BASE_URL}/tournaments/matches/${tournamentId}/${groupId}?mobile=true`,
    TOP_PLAYERS_ENHANCED: (tournamentId: string) =>
      `${BASE_URL}/tournaments/topplayers/${tournamentId}/enhanced?mobile=true`,
  },

  // Tournament progression
  PROGRESSION: {
    ROUND2_STATUS: (tournamentId: string) => `${BASE_URL}/tournaments/round2/status/${tournamentId}`,
    ROUND2_GROUPS: (tournamentId: string) => `${BASE_URL}/tournaments/round2/groups/${tournamentId}`,
    SUPER_PLAYERS: (tournamentId: string) => `${BASE_URL}/tournaments/superplayers/${tournamentId}`,
    DIRECT_KNOCKOUT_MATCHES: (tournamentId: string) => `${BASE_URL}/tournaments/direct-knockout/${tournamentId}/matches`,
    TOP_PLAYERS_ENHANCED: (tournamentId: string) => `${BASE_URL}/tournaments/topplayers/${tournamentId}/enhanced`,
  },

  // Group stage champion routes
  GROUP_STAGE: {
    TOP_PLAYERS_BY_GROUP: (tournamentId: string, groupId: string) =>
      `${BASE_URL}/tournaments/topplayers/${tournamentId}/${groupId}`,
    MATCHES_BY_GROUP: (tournamentId: string, groupId: string) =>
      `${BASE_URL}/tournaments/matches/${tournamentId}/${groupId}`,
    KNOCKOUT_MATCHES: (tournamentId: string) => `${BASE_URL}/tournaments/knockout/matches/${tournamentId}`,
    TOURNAMENT_BOOKINGS: (tournamentId: string) => `${BASE_URL}/tournaments/bookings/tournament/${tournamentId}`,
  },

  // Live scoring
  LIVE_SCORING: {
    MATCH_SCORES: (matchId: string) => `${BASE_URL}/tournaments/matches/${matchId}/scores`,
    LIVE_STATE: (matchId: string) => `${BASE_URL}/tournaments/matches/${matchId}/live-state`,
    COMPLETE_GAME: (matchId: string) => `${BASE_URL}/tournaments/matches/${matchId}/complete-game`,

    // Cricket (innings) incremental scoring
    CRICKET_SETUP: (matchId: string) => `${BASE_URL}/tournaments/matches/${matchId}/cricket/setup`,
    CRICKET_LINEUP: (matchId: string) => `${BASE_URL}/tournaments/matches/${matchId}/cricket/lineup`,
    CRICKET_BALL: (matchId: string) => `${BASE_URL}/tournaments/matches/${matchId}/cricket/ball`,
    CRICKET_UNDO: (matchId: string) => `${BASE_URL}/tournaments/matches/${matchId}/cricket/undo`,
    CRICKET_INNINGS_SWITCH: (matchId: string) => `${BASE_URL}/tournaments/matches/${matchId}/cricket/innings-switch`,
    CRICKET_FINISH: (matchId: string) => `${BASE_URL}/tournaments/matches/${matchId}/cricket/finish`,
    // Carrom (board) incremental scoring
    CARROM_BOARD: (matchId: string) => `${BASE_URL}/tournaments/matches/${matchId}/carrom/board`,

    // Bulk Score Sync
    BULK_SYNC: (tournamentId: string) => `${BASE_URL}/tournaments/${tournamentId}/bulk-sync-scores`,
  },
};

export default {
  BASE_URL,
  ENDPOINTS,
};
