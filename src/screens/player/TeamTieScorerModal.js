import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ScreenOrientation from "expo-screen-orientation";
import axios from "axios";
import API from "../../api/tournaments";
import AutoScoreboard from "../../components/AutoScoreboard";
import ConfirmDialog from "../../components/ConfirmDialog";

// Mirror of the backend isGameWon — lets Auto mode detect a finished game as the
// umpire taps. Same primitive the canonical scoreboard uses.
function isGameWon(h, a, rules) {
  const pts = rules?.pointsToWinGame;
  if (!pts) return false;
  const cap = rules?.maxPointsPerGame;
  const margin = rules?.marginToWin || 1;
  const deuce = rules?.deuceRule !== false; // default deuce ON (TT/Badminton)
  const max = Math.max(h, a);
  const diff = Math.abs(h - a);
  if (cap && max >= cap) return true;
  if (max >= pts) return deuce ? diff >= margin : true;
  return false;
}

// The next game to score in a given rubber = (games already completed) + 1.
// Lets the umpire pick ANY un-finished rubber and score its current game,
// independent of the server's sequential "current" pointer.
function nextGameNumberForSet(s) {
  const games = Array.isArray(s?.games) ? s.games : [];
  const completed = games.filter((g) => g.status === "COMPLETED").length;
  return completed + 1;
}

/**
 * TeamTieScorerModal — mobile umpire scorer for a Rapid Rallies / Davis Cup
 * team tie (5 rubbers). Each rubber's current game is scored with the same
 * MANUAL (type score) / AUTO (tap +1) modes as the canonical scoreboard, wired
 * to the team-knockout live-state + complete-game endpoints (the individual-
 * match scoreboard 404s on team ties). Auth rides on the app's axios defaults.
 */
export default function TeamTieScorerModal({ visible, matchId, onClose, onScored }) {
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [homePts, setHomePts] = useState("");
  const [awayPts, setAwayPts] = useState("");
  // Manual (type score) vs Auto (tap +1) — mirrors the canonical scoreboard.
  const [mode, setMode] = useState("manual");
  const [liveHome, setLiveHome] = useState(0);
  const [liveAway, setLiveAway] = useState(0);
  const [history, setHistory] = useState([]); // ['home'|'away', …] for undo
  const [firstServer, setFirstServer] = useState("left"); // 'left'=home, 'right'=away
  // The rubber the umpire chose to score (setNumber). null = server's current.
  const [selectedSetNum, setSelectedSetNum] = useState(null);
  // A finished rubber opened for its read-only game-by-game breakdown.
  const [detailSet, setDetailSet] = useState(null);
  // Auto-mode "game won" confirmation (in-app dialog, once per game).
  const [autoWinPrompt, setAutoWinPrompt] = useState(null); // {home, away, winner} | null
  const promptedGameRef = useRef(null); // "setNum-gameNum" already prompted

  // Auto mode is a full-screen landscape board; Manual stays portrait.
  useEffect(() => {
    if (!visible) return undefined;
    ScreenOrientation.lockAsync(
      mode === "auto" ? ScreenOrientation.OrientationLock.LANDSCAPE : ScreenOrientation.OrientationLock.PORTRAIT_UP
    ).catch(() => {});
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, [mode, visible]);

  const fetchTie = useCallback(async () => {
    if (!matchId) return;
    setLoading(true);
    try {
      const res = await axios.get(API.ENDPOINTS.TEAM_KNOCKOUT.LIVE_STATE(matchId));
      setMatch(res.data?.match || res.data);
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Failed to load tie");
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  const resetInputs = () => {
    setHomePts("");
    setAwayPts("");
    setLiveHome(0);
    setLiveAway(0);
    setHistory([]);
  };

  useEffect(() => {
    if (visible) {
      resetInputs();
      setMode("manual");
      setSelectedSetNum(null); // default to the server's current rubber
      setAutoWinPrompt(null);
      promptedGameRef.current = null;
      fetchTie();
    }
  }, [visible, fetchTie]);

  // Active rubber = the one the umpire picked, else the server's current one.
  const _activeSetNum = selectedSetNum || match?.liveState?.currentSetNumber || 1;
  const _activeSet = (match?.sets || [])[_activeSetNum - 1];
  const _activeGame = nextGameNumberForSet(_activeSet);

  // Fresh tap counters whenever the active rubber/game changes.
  useEffect(() => {
    setLiveHome(0);
    setLiveAway(0);
    setHistory([]);
  }, [_activeSetNum, _activeGame]);

  const submitPoints = useCallback(
    async (h, a) => {
      if (Number.isNaN(h) || Number.isNaN(a)) return Alert.alert("Enter scores", "Enter both game scores.");
      if (h === a) return Alert.alert("No ties", "A game can’t end level.");
      setSubmitting(true);
      try {
        await axios.post(API.ENDPOINTS.TEAM_KNOCKOUT.COMPLETE_GAME(matchId), {
          setNumber: _activeSetNum,
          gameNumber: _activeGame,
          finalHomePoints: h,
          finalAwayPoints: a,
        });
        resetInputs();
        await fetchTie();
        onScored && onScored();
      } catch (e) {
        Alert.alert("Error", e.response?.data?.message || "Failed to submit game");
      } finally {
        setSubmitting(false);
      }
    },
    [matchId, _activeSetNum, _activeGame, fetchTie, onScored]
  );

  // Auto mode: once tapped points reach a game win, prompt to submit — but only
  // ONCE per game (a repeating alert on every subsequent tap was a bug).
  useEffect(() => {
    if (!visible || mode !== "auto" || submitting || !match) return;
    if (!isGameWon(liveHome, liveAway, match.gameRules)) return;
    const key = `${_activeSetNum}-${_activeGame}`;
    if (promptedGameRef.current === key) return; // already prompted this game
    promptedGameRef.current = key;
    const s = _activeSet;
    const hName = s?.homePlayerB ? `${s.homePlayer} & ${s.homePlayerB}` : s?.homePlayer || "Home";
    const ap = s?.awayPlayerB || s?.awayPlayerZ;
    const aName = ap ? `${s.awayPlayer} & ${ap}` : s?.awayPlayer || "Away";
    const winner = liveHome > liveAway ? hName : aName;
    setAutoWinPrompt({ home: liveHome, away: liveAway, winner });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveHome, liveAway]);

  if (!visible) return null;

  const sets = Array.isArray(match?.sets) ? match.sets : [];
  const setsWon = match?.setsWon || { home: 0, away: 0 };
  const t1 = match?.team1Id?.teamName || "Home";
  const t2 = match?.team2Id?.teamName || "Away";
  const completed = match?.status === "COMPLETED";
  const cur = _activeSetNum;
  const curGame = _activeGame;
  const currentSet = _activeSet;
  const activeSetDone = currentSet?.status === "COMPLETED";
  const winnerName = completed ? (match?.matchWinner === "home" ? t1 : t2) : null;

  const isDoubles = (s) => String(s?.type || "").toLowerCase().includes("doubles") || !!s?.homePlayerB;
  const isFemale = (s) => match?.formatId === "rapid_rallies_s1" && s?.setNumber === 3;
  const homeLabel = (s) => (s?.homePlayerB ? `${s.homePlayer} & ${s.homePlayerB}` : s?.homePlayer || "—");
  const awayLabel = (s) => {
    const ap = s?.awayPlayerB || s?.awayPlayerZ;
    return ap ? `${s.awayPlayer} & ${ap}` : s?.awayPlayer || "—";
  };
  const rubberTag = (s) => (isFemale(s) ? "Women’s Singles" : isDoubles(s) ? "Doubles" : "Singles");

  const submitGame = () => submitPoints(parseInt(homePts, 10), parseInt(awayPts, 10));

  const tap = (side) => {
    setHistory((h) => [...h, side]);
    if (side === "home") setLiveHome((v) => v + 1);
    else setLiveAway((v) => v + 1);
  };
  const undo = () =>
    setHistory((h) => {
      const last = h[h.length - 1];
      if (!last) return h;
      if (last === "home") setLiveHome((v) => Math.max(0, v - 1));
      else setLiveAway((v) => Math.max(0, v - 1));
      return h.slice(0, -1);
    });

  return (
    <>
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Score tie</Text>
              <Text style={styles.subtitle} numberOfLines={1}>{t1} vs {t2}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#334155" />
            </TouchableOpacity>
          </View>

          {loading && !match ? (
            <View style={styles.center}><ActivityIndicator size="large" color="#15A765" /></View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {/* Tie score */}
              <View style={styles.scoreRow}>
                <Text numberOfLines={1} style={[styles.teamName, match?.matchWinner === "home" && styles.teamWin]}>{t1}</Text>
                <Text style={styles.tieScore}>{setsWon.home} : {setsWon.away}</Text>
                <Text numberOfLines={1} style={[styles.teamName, { textAlign: "right" }, match?.matchWinner === "away" && styles.teamWin]}>{t2}</Text>
              </View>

              {completed ? (
                <View style={styles.doneBox}>
                  <Ionicons name="trophy" size={26} color="#F59E0B" />
                  <Text style={styles.doneText}>{winnerName} win the tie</Text>
                </View>
              ) : currentSet && !activeSetDone ? (
                <View style={styles.currentCard}>
                  <View style={styles.rubberHead}>
                    <Text style={styles.rubberLabel}>RUBBER {cur} · {rubberTag(currentSet)}</Text>
                    <Text style={styles.gameLabel}>Game {curGame}</Text>
                  </View>
                  <View style={styles.playersRow}>
                    <Text numberOfLines={2} style={styles.playerName}>{homeLabel(currentSet)}</Text>
                    <Text style={styles.vs}>vs</Text>
                    <Text numberOfLines={2} style={[styles.playerName, { textAlign: "right" }]}>{awayLabel(currentSet)}</Text>
                  </View>
                  {/* Manual / Auto toggle — same two modes as the canonical board */}
                  <View style={styles.modeRow}>
                    <Text style={[styles.modeLabel, mode === "manual" && styles.modeLabelOn]}>Manual</Text>
                    <Switch
                      value={mode === "auto"}
                      onValueChange={(v) => setMode(v ? "auto" : "manual")}
                      trackColor={{ true: "#15A765", false: "#CBD5E1" }}
                      thumbColor="#fff"
                    />
                    <Text style={[styles.modeLabel, mode === "auto" && styles.modeLabelOn]}>Auto</Text>
                  </View>

                  {mode === "manual" ? (
                    <>
                      <View style={styles.inputsRow}>
                        <TextInput
                          style={styles.input}
                          keyboardType="number-pad"
                          placeholder="0"
                          placeholderTextColor="#CBD5E1"
                          value={homePts}
                          onChangeText={setHomePts}
                        />
                        <Text style={styles.dash}>–</Text>
                        <TextInput
                          style={styles.input}
                          keyboardType="number-pad"
                          placeholder="0"
                          placeholderTextColor="#CBD5E1"
                          value={awayPts}
                          onChangeText={setAwayPts}
                        />
                      </View>
                      <TouchableOpacity style={styles.submitBtn} onPress={submitGame} disabled={submitting}>
                        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit game</Text>}
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity style={styles.openBoardBtn} onPress={() => setMode("auto")} activeOpacity={0.85}>
                      <Ionicons name="tennisball" size={16} color="#fff" />
                      <Text style={styles.submitText}>Open tap scoreboard</Text>
                    </TouchableOpacity>
                  )}
                  {match?.gameRules?.pointsToWinGame ? (
                    <Text style={styles.rulesHint}>
                      To {match.gameRules.pointsToWinGame}
                      {match.gameRules.marginToWin ? ` · win by ${match.gameRules.marginToWin}` : ""}
                      {match.gameRules.gamesToWin ? ` · best of ${(match.gameRules.gamesToWin * 2) - 1} games` : ""}
                    </Text>
                  ) : null}
                </View>
              ) : !completed ? (
                <View style={styles.pickHint}>
                  <Ionicons name="hand-left-outline" size={20} color="#94A3B8" />
                  <Text style={styles.pickHintText}>
                    {activeSetDone ? "This rubber is finished — tap another rubber below to score it." : "Tap a rubber below to score it."}
                  </Text>
                </View>
              ) : null}

              {/* All rubbers — tap any unfinished rubber to score it (any order) */}
              <Text style={styles.sectionTitle}>Rubbers</Text>
              {sets.map((s, i) => {
                const active = !completed && s.setNumber === cur && !activeSetDone;
                const gh = s.gamesWon?.home ?? 0;
                const ga = s.gamesWon?.away ?? 0;
                const done = s.status === "COMPLETED";
                const selectable = !completed && !done;
                // Done → open read-only detail; unfinished → select to score.
                const onPress = () => (done ? setDetailSet(s) : selectable ? setSelectedSetNum(s.setNumber) : null);
                return (
                  <TouchableOpacity
                    key={i}
                    activeOpacity={done || selectable ? 0.7 : 1}
                    disabled={!done && !selectable}
                    onPress={onPress}
                    style={[styles.rubberRow, active && styles.rubberRowActive]}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.rubberRowTag}>R{s.setNumber} · {rubberTag(s)}</Text>
                      <Text numberOfLines={1} style={styles.rubberRowPlayers}>{homeLabel(s)} vs {awayLabel(s)}</Text>
                    </View>
                    <Text style={[styles.rubberRowScore, done && (s.setWinner === "home" ? styles.homeWin : styles.awayWin), active && styles.homeWin]}>
                      {done ? `${gh}–${ga}` : active ? "scoring" : selectable ? "tap →" : "—"}
                    </Text>
                    {done && <Ionicons name="chevron-forward" size={16} color="#CBD5E1" style={{ marginLeft: 6 }} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>

    {/* Auto mode → full-screen landscape tap board (shared AutoScoreboard) */}
    {mode === "auto" && !completed && currentSet && !activeSetDone && (
      <Modal
        visible
        animationType="fade"
        onRequestClose={() => setMode("manual")}
        supportedOrientations={["landscape", "landscape-left", "landscape-right"]}
      >
        <AutoScoreboard
          leftName={homeLabel(currentSet)}
          rightName={awayLabel(currentSet)}
          leftScore={liveHome}
          rightScore={liveAway}
          leftGames={currentSet.gamesWon?.home ?? 0}
          rightGames={currentSet.gamesWon?.away ?? 0}
          leftSub={t1}
          rightSub={t2}
          pointsToWinGame={match?.gameRules?.pointsToWinGame || 11}
          firstServer={firstServer}
          onSwapServer={() => setFirstServer((s) => (s === "left" ? "right" : "left"))}
          onScoreLeft={() => tap("home")}
          onScoreRight={() => tap("away")}
          onMinusLeft={() => setLiveHome((v) => Math.max(0, v - 1))}
          onMinusRight={() => setLiveAway((v) => Math.max(0, v - 1))}
          onUndo={undo}
          canUndo={history.length > 0}
          onSubmit={() => submitPoints(liveHome, liveAway)}
          submitting={submitting}
          onClose={() => setMode("manual")}
          title={`Rubber ${cur} · ${rubberTag(currentSet)} · Game ${curGame}`}
          menuTitle="Rubbers"
          menu={sets.map((s) => {
            const done = s.status === "COMPLETED";
            const selectable = !completed && !done;
            const isActive = s.setNumber === cur && !activeSetDone;
            const gh = s.gamesWon?.home ?? 0;
            const ga = s.gamesWon?.away ?? 0;
            return {
              key: String(s.setNumber),
              label: `R${s.setNumber} · ${rubberTag(s)}`,
              sub: `${homeLabel(s)} vs ${awayLabel(s)}`,
              right: done ? `${gh}–${ga}` : isActive ? "scoring" : selectable ? "tap →" : "—",
              active: isActive,
              disabled: !done && !selectable,
              onPress: () => (done ? setDetailSet(s) : selectable ? setSelectedSetNum(s.setNumber) : null),
            };
          })}
        />
      </Modal>
    )}

    {/* Auto-mode "game won" confirmation — app-styled, shown once per game */}
    <ConfirmDialog
      visible={!!autoWinPrompt}
      title="Game won"
      message={autoWinPrompt ? `${autoWinPrompt.winner} wins ${autoWinPrompt.home}–${autoWinPrompt.away}. Submit this game?` : ""}
      confirmLabel="Submit game"
      cancelLabel="Keep scoring"
      onConfirm={() => {
        const p = autoWinPrompt;
        setAutoWinPrompt(null);
        if (p) submitPoints(p.home, p.away);
      }}
      onCancel={() => setAutoWinPrompt(null)}
    />

    {/* Read-only detail for a finished rubber — game-by-game breakdown */}
    {detailSet && (
      <Modal visible transparent animationType="fade" onRequestClose={() => setDetailSet(null)}>
        <View style={styles.detailBackdrop}>
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailTitle}>Rubber {detailSet.setNumber} · {rubberTag(detailSet)}</Text>
                <Text style={styles.detailPlayers} numberOfLines={2}>{homeLabel(detailSet)} vs {awayLabel(detailSet)}</Text>
              </View>
              <TouchableOpacity onPress={() => setDetailSet(null)} hitSlop={10} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#334155" />
              </TouchableOpacity>
            </View>

            <View style={styles.detailResultRow}>
              <Text numberOfLines={1} style={[styles.detailResultTeam, detailSet.setWinner === "home" && styles.homeWin]}>{homeLabel(detailSet)}</Text>
              <Text style={styles.detailResultScore}>{detailSet.gamesWon?.home ?? 0} – {detailSet.gamesWon?.away ?? 0}</Text>
              <Text numberOfLines={1} style={[styles.detailResultTeam, { textAlign: "right" }, detailSet.setWinner === "away" && styles.homeWin]}>{awayLabel(detailSet)}</Text>
            </View>

            <Text style={styles.detailGamesTitle}>Games</Text>
            {(() => {
              const games = (detailSet.games || []).filter((g) => g.status === "COMPLETED");
              if (games.length === 0) return <Text style={styles.detailEmpty}>No games recorded.</Text>;
              return games.map((g, gi) => (
                <View key={gi} style={styles.detailGameRow}>
                  <Text style={styles.detailGameLabel}>Game {g.gameNumber}</Text>
                  <View style={styles.detailGameScore}>
                    <Text style={[styles.detailGameNum, g.winner === "home" && styles.homeWin]}>{g.homePoints}</Text>
                    <Text style={styles.detailGameDash}>–</Text>
                    <Text style={[styles.detailGameNum, g.winner === "away" && styles.homeWin]}>{g.awayPoints}</Text>
                  </View>
                </View>
              ));
            })()}
          </View>
        </View>
      </Modal>
    )}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: "88%", paddingHorizontal: 18, paddingTop: 14 },
  header: { flexDirection: "row", alignItems: "center", paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  title: { fontSize: 17, fontWeight: "900", color: "#0F172A" },
  subtitle: { fontSize: 12.5, color: "#64748B", marginTop: 2 },
  closeBtn: { height: 34, width: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9" },
  center: { paddingVertical: 50, alignItems: "center" },
  scoreRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 16 },
  teamName: { flex: 1, fontSize: 14, fontWeight: "700", color: "#334155" },
  teamWin: { color: "#15A765", fontWeight: "900" },
  tieScore: { fontSize: 22, fontWeight: "900", color: "#0F172A", marginHorizontal: 12 },
  doneBox: { alignItems: "center", paddingVertical: 22, backgroundColor: "#F0FDF4", borderRadius: 16 },
  doneText: { marginTop: 8, fontSize: 15, fontWeight: "800", color: "#15803D" },
  pickHint: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 20, paddingHorizontal: 16, backgroundColor: "#F8FAFC", borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0" },
  pickHintText: { flex: 1, fontSize: 13, color: "#64748B", fontWeight: "600" },
  // Finished-rubber detail modal
  detailBackdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.5)", alignItems: "center", justifyContent: "center", padding: 22 },
  detailCard: { width: "100%", backgroundColor: "#fff", borderRadius: 20, padding: 18 },
  detailHeader: { flexDirection: "row", alignItems: "flex-start", paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  detailTitle: { fontSize: 15, fontWeight: "900", color: "#0F172A" },
  detailPlayers: { fontSize: 12.5, color: "#64748B", marginTop: 3, fontWeight: "600" },
  detailResultRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14 },
  detailResultTeam: { flex: 1, fontSize: 13, fontWeight: "700", color: "#334155" },
  detailResultScore: { fontSize: 20, fontWeight: "900", color: "#0F172A", marginHorizontal: 12 },
  detailGamesTitle: { fontSize: 11, fontWeight: "800", color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4, marginBottom: 6 },
  detailEmpty: { fontSize: 13, color: "#94A3B8", fontStyle: "italic", paddingVertical: 8 },
  detailGameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 9, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  detailGameLabel: { fontSize: 13, fontWeight: "700", color: "#475569" },
  detailGameScore: { flexDirection: "row", alignItems: "center" },
  detailGameNum: { fontSize: 16, fontWeight: "800", color: "#1E293B", width: 30, textAlign: "center" },
  detailGameDash: { fontSize: 14, color: "#94A3B8", marginHorizontal: 6 },
  currentCard: { backgroundColor: "#F8FAFC", borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0", padding: 14 },
  rubberHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  rubberLabel: { fontSize: 11.5, fontWeight: "900", color: "#0F172A" },
  gameLabel: { fontSize: 11.5, fontWeight: "800", color: "#F97316" },
  playersRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  playerName: { flex: 1, fontSize: 13.5, fontWeight: "700", color: "#1E293B" },
  vs: { fontSize: 11, color: "#94A3B8", marginHorizontal: 8 },
  inputsRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  input: { width: 88, height: 56, borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, textAlign: "center", fontSize: 24, fontWeight: "900", color: "#0F172A", backgroundColor: "#fff" },
  dash: { fontSize: 22, color: "#94A3B8", marginHorizontal: 16 },
  // Manual / Auto toggle
  modeRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12 },
  modeLabel: { fontSize: 12.5, fontWeight: "700", color: "#94A3B8" },
  modeLabelOn: { color: "#15A765", fontWeight: "900" },
  // Auto mode → opens the full-screen tap board
  openBoardBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#15A765", borderRadius: 12, height: 48 },
  submitBtn: { backgroundColor: "#15A765", borderRadius: 12, height: 48, alignItems: "center", justifyContent: "center" },
  submitText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  rulesHint: { textAlign: "center", fontSize: 11, color: "#94A3B8", marginTop: 8 },
  sectionTitle: { fontSize: 12, fontWeight: "800", color: "#64748B", marginTop: 18, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4 },
  rubberRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: "#F1F5F9", marginBottom: 8 },
  rubberRowActive: { borderColor: "#15A765", backgroundColor: "#F0FDF4" },
  rubberRowTag: { fontSize: 10.5, fontWeight: "800", color: "#64748B" },
  rubberRowPlayers: { fontSize: 12.5, fontWeight: "600", color: "#334155", marginTop: 2 },
  rubberRowScore: { fontSize: 14, fontWeight: "900", color: "#94A3B8", marginLeft: 10 },
  homeWin: { color: "#15A765" },
  awayWin: { color: "#DC2626" },
});
