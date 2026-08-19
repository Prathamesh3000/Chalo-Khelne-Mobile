import { useCallback, useEffect, useRef, useState } from "react";
import { useChat } from "../context/ChatContext";

/**
 * Live match scores on mobile.
 *
 * §5.1: the backend has always broadcast live scoring into per-match rooms —
 * groupStageScoreboardController emits `score:update`, `set:complete`,
 * `round:complete` and `match:complete` into `match_<id>`. The web manager
 * subscribes. The mobile app never did: it emitted `join:gchat` and
 * `join:conversation` and nothing else, and had no polling fallback for match
 * state either (its only intervals are an unread-count refresh, two OTP
 * countdowns and a 15s umpire-authorisation poll).
 *
 * So a parent watching from the sideline saw the score as it was when the
 * screen opened, until they pulled to refresh. The platform's most visible
 * feature was web-only while the server was already doing its half of the work.
 *
 * Usage:
 *   const { live, isConnected, lastUpdateAt } = useLiveMatch(matchId);
 *   const score = live?.liveScore ?? fetchedMatch.liveScore;
 *
 * Returns null until the first event arrives, so callers keep rendering
 * whatever they fetched over HTTP and simply upgrade to live data when it
 * appears. That also means an unreachable socket degrades to today's
 * behaviour rather than an empty screen.
 */

export interface LiveMatchPayload {
  matchId: string;
  tournamentId?: string;
  scoringType?: string | null;
  labels?: Record<string, unknown>;
  player1?: string;
  player2?: string;
  roundNumber?: number;
  subRoundNumber?: number;
  liveScore?: any;
  sets?: any;
  [key: string]: any;
}

export interface UseLiveMatchResult {
  live: LiveMatchPayload | null;
  /** True once this hook has joined the match room. */
  isConnected: boolean;
  /** Set when the server says the match finished, so screens can stop polling. */
  completed: LiveMatchPayload | null;
  lastUpdateAt: number | null;
}

export function useLiveMatch(matchId?: string | null): UseLiveMatchResult {
  const { getSocket } = useChat();
  const [live, setLive] = useState<LiveMatchPayload | null>(null);
  const [completed, setCompleted] = useState<LiveMatchPayload | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdateAt, setLastUpdateAt] = useState<number | null>(null);

  // Held in a ref so the reconnect handler always re-joins the CURRENT match
  // without re-subscribing on every id change.
  const matchIdRef = useRef(matchId);
  matchIdRef.current = matchId;

  const apply = useCallback((payload: LiveMatchPayload, done = false) => {
    // Ignore traffic for a match we are not showing. Rooms are per-match so
    // this should not happen, but a stale room after a fast screen switch is
    // cheap to guard against and expensive to debug.
    if (payload?.matchId && matchIdRef.current &&
        String(payload.matchId) !== String(matchIdRef.current)) {
      return;
    }
    setLive((prev) => ({ ...(prev || {}), ...payload }));
    setLastUpdateAt(Date.now());
    if (done) setCompleted(payload);
  }, []);

  useEffect(() => {
    if (!matchId) return undefined;
    const socket = getSocket();
    if (!socket) return undefined;

    const join = () => {
      socket.emit("join:match", { matchId });
      setIsConnected(true);
    };

    const onScore = (p: LiveMatchPayload) => apply(p);
    const onRound = (p: LiveMatchPayload) => apply(p);
    const onComplete = (p: LiveMatchPayload) => apply(p, true);
    const onDenied = (p: { room?: string }) => {
      // Private tournaments refuse non-participants (canJoinTournamentRoom).
      // Not an error — the screen just stays on its fetched data.
      if (p?.room === `match_${matchId}`) setIsConnected(false);
    };

    join();
    // Re-join after a reconnect: socket.io restores the connection but NOT room
    // membership, so without this a backgrounded app comes back silent.
    socket.on("connect", join);
    socket.on("score:update", onScore);
    socket.on("set:complete", onRound);
    socket.on("round:complete", onRound);
    socket.on("match:complete", onComplete);
    socket.on("join:denied", onDenied);

    return () => {
      socket.emit("leave:match", { matchId });
      socket.off("connect", join);
      socket.off("score:update", onScore);
      socket.off("set:complete", onRound);
      socket.off("round:complete", onRound);
      socket.off("match:complete", onComplete);
      socket.off("join:denied", onDenied);
      setIsConnected(false);
    };
  }, [matchId, getSocket, apply]);

  return { live, isConnected, completed, lastUpdateAt };
}

/**
 * Tournament-wide realtime updates (dashboard / fixture list).
 *
 * Same story as useLiveMatch: the server emits into `tournament_<id>` and the
 * mobile app never joined. Returns the last event so a list can refetch.
 */
export function useLiveTournament(tournamentId?: string | null) {
  const { getSocket } = useChat();
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);
  const [lastEvent, setLastEvent] = useState<any>(null);

  useEffect(() => {
    if (!tournamentId) return undefined;
    const socket = getSocket();
    if (!socket) return undefined;

    const join = () => socket.emit("join:tournament", { tournamentId });
    const bump = (p: any) => {
      setLastEvent(p);
      setLastEventAt(Date.now());
    };

    join();
    socket.on("connect", join);
    socket.on("score:update", bump);
    socket.on("match:complete", bump);

    return () => {
      socket.emit("leave:tournament", { tournamentId });
      socket.off("connect", join);
      socket.off("score:update", bump);
      socket.off("match:complete", bump);
    };
  }, [tournamentId, getSocket]);

  return { lastEvent, lastEventAt };
}

export default useLiveMatch;
