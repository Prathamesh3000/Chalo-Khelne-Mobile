import React, { useState, useCallback, useMemo, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ScreenOrientation from "expo-screen-orientation";
import axios from "axios";
import API from "../../api/tournaments";
import { useAuth } from "../../context/AuthContext";
import CricketScorer from "./CricketScorer";
import CarromScorer from "./CarromScorer";

/**
 * RefereeMatchScorer — sport ROUTER for umpire scoring reached from the
 * "My Assignments" list (which only carries a matchId). It self-loads the match
 * to learn its scoring type, then dispatches:
 *
 *   • innings (Cricket) → CricketScorer  (ball-by-ball)
 *   • board   (Carrom)  → CarromScorer   (per-board)
 *   • everything else   → redirects to the canonical Manual/Auto scoreboard in
 *                         the tournament flow (TournamentLeaderboardDetail),
 *                         so generic point scoring has ONE implementation.
 *
 * The old duplicate "Final / Live Tap" board that used to live here was removed
 * in favour of that single canonical scoreboard.
 */
export default function RefereeMatchScorer() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { matchId, matchLabel } = route.params || {};

  const authConfig = useMemo(
    () => (token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    [token]
  );

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMatch = useCallback(async () => {
    if (!matchId) return;
    try {
      setError(null);
      const res = await axios.get(API.ENDPOINTS.LIVE_SCORING.LIVE_STATE(matchId), authConfig);
      setMatch(res.data?.match || res.data);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load match.");
    } finally {
      setLoading(false);
    }
  }, [matchId, authConfig]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchMatch();
    }, [fetchMatch])
  );

  // scoringType is stored at the TOP level of the match doc (set at creation);
  // matchFormat.scoringType is only a fallback. Reading matchFormat first missed
  // it for group-stage matches, so cricket/carrom fell through to the generic
  // redirect and bounced back to TournamentLeaderboardDetail (navigator error).
  const scoringType = match?.scoringType || match?.matchFormat?.scoringType || null;
  const isSportSpecific = scoringType === "innings" || scoringType === "board";

  // Landscape only for the sport-specific touch scorers (cricket / carrom).
  useFocusEffect(
    useCallback(() => {
      if (!isSportSpecific) return undefined;
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
      return () => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      };
    }, [isSportSpecific])
  );

  // Generic set/points sports → redirect to the canonical Manual/Auto scoreboard
  // in the tournament flow, which auto-opens the board for this match.
  useEffect(() => {
    if (!match || isSportSpecific) return;
    const tId = match.tournamentId?._id || match.tournamentId;
    if (tId) {
      navigation.replace("TournamentLeaderboardDetail", {
        tournamentId: String(tId),
        tournamentName: matchLabel || "Tournament",
        _scoreMatchId: matchId,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match, isSportSpecific]);

  const p1Name =
    match?.player1?.playerName || match?.player1?.playerId?.name || match?.player1?.userName || "Player 1";
  const p2Name =
    match?.player2?.playerName || match?.player2?.playerId?.name || match?.player2?.userName || "Player 2";

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#15A765" />
        <Text style={styles.dim}>Loading match…</Text>
      </View>
    );
  }

  if (!match) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.err}>{error || "Match not found"}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (scoringType === "innings") {
    return (
      <CricketScorer
        matchId={matchId} match={match} authConfig={authConfig}
        onRefresh={fetchMatch} onBack={() => navigation.goBack()}
        insets={insets} p1Name={p1Name} p2Name={p2Name}
      />
    );
  }
  if (scoringType === "board") {
    return (
      <CarromScorer
        matchId={matchId} match={match} authConfig={authConfig}
        onRefresh={fetchMatch} onBack={() => navigation.goBack()}
        insets={insets} p1Name={p1Name} p2Name={p2Name}
      />
    );
  }

  // Generic sport: the effect above redirects to the canonical board. If the
  // match somehow has no tournament to open it from, offer a way back.
  const tId = match.tournamentId?._id || match.tournamentId;
  if (!tId) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.err}>Open this match from its tournament to score it.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <View style={[styles.center, { paddingTop: insets.top }]}>
      <ActivityIndicator size="large" color="#15A765" />
      <Text style={styles.dim}>Opening scoreboard…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFC" },
  dim: { color: "#64748B", marginTop: 8 },
  err: { color: "#B91C1C", textAlign: "center", paddingHorizontal: 30, marginBottom: 12 },
  backBtn: { backgroundColor: "#1E293B", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  backText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
