import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, StatusBar, RefreshControl, Alert,
} from "react-native";
import { MaterialCommunityIcons, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";
import API from "../../api/api";
import HistoryTimeline from "../../components/HistoryTimeline";
import HistoryVerticalTimeline from "../../components/HistoryVerticalTimeline";
import {
  fetchTimeline,
  fetchPending,
  fetchVisibility,
  saveVisibility,
  deleteEntry,
  VISIBILITY_LABELS,
} from "../../api/playerHistory";

const STAGE_COLORS = {
  Champion: { bg: "#FEF3C7", text: "#D97706", icon: "trophy" },
  Final: { bg: "#DBEAFE", text: "#2563EB", icon: "medal" },
  Knockout: { bg: "#E0E7FF", text: "#4F46E5", icon: "sword-cross" },
  "Group Stage": { bg: "#D1FAE5", text: "#059669", icon: "account-group" },
  Registered: { bg: "#F3F4F6", text: "#6B7280", icon: "ticket-confirmation" },
};

const TournamentHistory = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const userId = user?.id || user?._id;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeline, setTimeline] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [visibility, setVisibility] = useState("public");

  const chooseVisibility = () => {
    const apply = async (next) => {
      const prev = visibility;
      setVisibility(next); // optimistic
      try {
        setVisibility(await saveVisibility(next));
      } catch (e) {
        setVisibility(prev);
        Alert.alert("Couldn't update", e?.response?.data?.message || e.message);
      }
    };
    Alert.alert("Who can see your playing history?", undefined, [
      ...Object.keys(VISIBILITY_LABELS).map((key) => ({
        text: VISIBILITY_LABELS[key] + (key === visibility ? "  ✓" : ""),
        onPress: () => key !== visibility && apply(key),
      })),
      { text: "Cancel", style: "cancel" },
    ]);
  };

  // Best-effort: a failure here must not blank the career stats.
  const fetchHistory = async () => {
    try {
      if (!userId) return;
      const [entries, pending, vis] = await Promise.all([
        fetchTimeline(userId),
        fetchPending(),
        fetchVisibility().catch(() => "public"),
      ]);
      setTimeline(entries);
      setPendingCount(pending.length);
      setVisibility(vis);
    } catch (e) {
      console.warn("History fetch failed:", e?.message);
    }
  };

  const confirmDeleteHistory = (entry) => {
    Alert.alert("Remove from history?", `"${entry.tournamentName}" will be removed from your timeline.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteEntry(entry.id);
            setTimeline((prev) => prev.filter((h) => h.id !== entry.id));
          } catch (e) {
            Alert.alert("Couldn't remove", e?.response?.data?.message || e.message);
          }
        },
      },
    ]);
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API.BASE_URL}/player-stats/${userId}`);
      if (res.data?.success) setData(res.data);
    } catch (err) {
      console.error("Error fetching stats:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchStats(); fetchHistory(); }, []));

  const onRefresh = () => { setRefreshing(true); fetchStats(); fetchHistory(); };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6A00" />
      </View>
    );
  }

  const career = data?.career || {};
  const sportStats = data?.sportStats || [];
  const history = data?.tournamentHistory || [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={["#0F5132", "#15A765"]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>My Career</Text>
          <Text style={styles.headerSubtitle}>Playing history, stats & rankings</Text>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6A00"]} />}
      >
        {/* Playing history: full-width dial first, then the matching entries */}
        <View style={styles.historyTop}>
          <Text style={styles.historyHeading}>Playing History</Text>
          <TouchableOpacity
            style={styles.historyAddBtn}
            onPress={() => navigation.navigate("AddHistory")}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Add a history entry"
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.historyAddText}>Add</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.historyMeta}>
          <TouchableOpacity style={styles.visibilityRow} onPress={chooseVisibility} activeOpacity={0.7}>
            <Ionicons name={visibility === "public" ? "earth" : "lock-closed"} size={14} color="#6B7280" />
            <Text style={styles.visibilityText}>
              Visible to: <Text style={styles.visibilityStrong}>{VISIBILITY_LABELS[visibility]}</Text>
            </Text>
            <Ionicons name="chevron-down" size={14} color="#6B7280" />
          </TouchableOpacity>

          {pendingCount > 0 && (
            <TouchableOpacity
              style={styles.requestsBanner}
              onPress={() => navigation.navigate("HistoryRequests")}
              activeOpacity={0.85}
            >
              <Ionicons name="notifications" size={16} color="#F59E0B" />
              <Text style={styles.requestsText}>
                {pendingCount} post{pendingCount > 1 ? "s" : ""} tagged you — review to add to your history
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>

        <HistoryTimeline
          entries={timeline}
          isOwner
          inset={16}
          surface="#F8F9FB"
          onEdit={(entry) => navigation.navigate("AddHistory", { entry })}
          onDelete={confirmDeleteHistory}
        />

        {/* The same history as one continuous journey, newest first */}
        <View style={styles.journeyHead}>
          <Text style={styles.historyHeading}>My Journey</Text>
          <Text style={styles.journeySub}>Everything in order, newest first</Text>
        </View>
        <HistoryVerticalTimeline entries={timeline} startedAt={user?.createdAt} surface="#F8F9FB" />

        <Text style={styles.statsHeading}>Career Stats</Text>

        {/* Career Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: "#EFF6FF" }]}>
            <Text style={[styles.statValue, { color: "#2563EB" }]}>{career.totalTournaments || 0}</Text>
            <Text style={styles.statLabel}>Tournaments</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#D1FAE5" }]}>
            <Text style={[styles.statValue, { color: "#059669" }]}>{career.totalWins || 0}</Text>
            <Text style={styles.statLabel}>Wins</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#FEE2E2" }]}>
            <Text style={[styles.statValue, { color: "#DC2626" }]}>{career.totalLosses || 0}</Text>
            <Text style={styles.statLabel}>Losses</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#FEF3C7" }]}>
            <Text style={[styles.statValue, { color: "#D97706" }]}>{career.winRate || 0}%</Text>
            <Text style={styles.statLabel}>Win Rate</Text>
          </View>
        </View>

        {/* Achievements Row */}
        <View style={styles.achievementsRow}>
          <View style={styles.achievementItem}>
            <MaterialCommunityIcons name="trophy" size={24} color="#D97706" />
            <Text style={styles.achievementValue}>{career.championships || 0}</Text>
            <Text style={styles.achievementLabel}>Championships</Text>
          </View>
          <View style={styles.achievementDivider} />
          <View style={styles.achievementItem}>
            <MaterialCommunityIcons name="medal" size={24} color="#2563EB" />
            <Text style={styles.achievementValue}>{career.finals || 0}</Text>
            <Text style={styles.achievementLabel}>Finals</Text>
          </View>
          <View style={styles.achievementDivider} />
          <View style={styles.achievementItem}>
            <MaterialCommunityIcons name="cricket" size={24} color="#059669" />
            <Text style={styles.achievementValue}>{career.totalMatches || 0}</Text>
            <Text style={styles.achievementLabel}>Matches</Text>
          </View>
        </View>

        {/* Sport-wise Breakdown */}
        {sportStats.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Performance by Sport</Text>
            {sportStats.map((s) => (
              <View key={s.sport} style={styles.sportRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sportName}>{s.sport}</Text>
                  <Text style={styles.sportMeta}>
                    {s.matches} matches · {s.wins}W {s.losses}L {s.draws > 0 ? `${s.draws}D` : ""}
                  </Text>
                </View>
                <View style={styles.winRateBadge}>
                  <Text style={styles.winRateText}>{s.winRate}%</Text>
                </View>
                {/* Win rate bar */}
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${s.winRate}%` }]} />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Tournament History List */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Tournament History</Text>
          {history.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="trophy-outline" size={48} color="#DDD" />
              <Text style={styles.emptyText}>No tournaments yet</Text>
            </View>
          ) : (
            history.map((t, idx) => {
              const stage = STAGE_COLORS[t.stageReached] || STAGE_COLORS.Registered;
              return (
                <View key={t.tournamentId || idx} style={styles.historyCard}>
                  <View style={styles.historyTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyTitle}>{t.title}</Text>
                      <View style={styles.historyMeta}>
                        <Text style={styles.historyMetaText}>{t.sport}</Text>
                        <Text style={styles.historyDot}>·</Text>
                        <Text style={styles.historyMetaText}>{t.startDate || "TBD"}</Text>
                      </View>
                    </View>
                    <View style={[styles.stageBadge, { backgroundColor: stage.bg }]}>
                      <MaterialCommunityIcons name={stage.icon} size={12} color={stage.text} />
                      <Text style={[styles.stageText, { color: stage.text }]}>{t.stageReached}</Text>
                    </View>
                  </View>

                  {t.matches > 0 && (
                    <View style={styles.historyStats}>
                      <Text style={styles.historyStatItem}>
                        <Text style={{ fontWeight: "800", color: "#1F2937" }}>{t.matches}</Text> played
                      </Text>
                      <Text style={styles.historyStatItem}>
                        <Text style={{ fontWeight: "800", color: "#059669" }}>{t.wins}</Text> W
                      </Text>
                      <Text style={styles.historyStatItem}>
                        <Text style={{ fontWeight: "800", color: "#DC2626" }}>{t.losses}</Text> L
                      </Text>
                      {t.draws > 0 && (
                        <Text style={styles.historyStatItem}>
                          <Text style={{ fontWeight: "800", color: "#6B7280" }}>{t.draws}</Text> D
                        </Text>
                      )}
                      <Text style={styles.historyStatItem}>
                        <Text style={{ fontWeight: "800", color: "#2563EB" }}>{t.winRate}%</Text> WR
                      </Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8F9FB" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 18, gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#FFF" },
  headerSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", padding: 16, gap: 10 },
  statCard: { width: "47%", borderRadius: 16, padding: 16, alignItems: "center" },
  statValue: { fontSize: 28, fontWeight: "900" },
  statLabel: { fontSize: 11, fontWeight: "700", color: "#6B7280", marginTop: 4 },
  achievementsRow: { flexDirection: "row", backgroundColor: "#FFF", marginHorizontal: 16, borderRadius: 16, padding: 16, alignItems: "center", marginBottom: 16 },
  achievementItem: { flex: 1, alignItems: "center" },
  achievementValue: { fontSize: 20, fontWeight: "900", color: "#1F2937", marginTop: 4 },
  achievementLabel: { fontSize: 10, fontWeight: "700", color: "#9CA3AF", marginTop: 2 },
  achievementDivider: { width: 1, height: 40, backgroundColor: "#F0F0F0" },
  sectionContainer: { marginHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: "#1F2937", marginBottom: 12 },
  sportRow: { backgroundColor: "#FFF", borderRadius: 14, padding: 14, marginBottom: 8 },
  sportName: { fontSize: 14, fontWeight: "800", color: "#1F2937" },
  sportMeta: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  winRateBadge: { position: "absolute", right: 14, top: 14, backgroundColor: "#EFF6FF", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  winRateText: { fontSize: 12, fontWeight: "800", color: "#2563EB" },
  barBg: { height: 4, backgroundColor: "#F3F4F6", borderRadius: 2, marginTop: 8 },
  barFill: { height: 4, backgroundColor: "#3B82F6", borderRadius: 2 },
  historyCard: { backgroundColor: "#FFF", borderRadius: 14, padding: 14, marginBottom: 8 },
  historyTop: { flexDirection: "row", alignItems: "flex-start" },
  historyTitle: { fontSize: 14, fontWeight: "800", color: "#1F2937" },
  historyMeta: { flexDirection: "row", alignItems: "center", marginTop: 3 },
  historyMetaText: { fontSize: 11, color: "#9CA3AF" },
  historyDot: { fontSize: 11, color: "#DDD", marginHorizontal: 6 },
  stageBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  stageText: { fontSize: 10, fontWeight: "800" },
  historyStats: { flexDirection: "row", gap: 12, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F5F5F5" },
  historyStatItem: { fontSize: 12, color: "#9CA3AF" },
  historyTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 18, paddingBottom: 6 },
  historyHeading: { fontSize: 18, fontWeight: "900", color: "#1F2937" },
  historyAddBtn: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: "#15A765", borderRadius: 16, paddingHorizontal: 12, minHeight: 34 },
  historyAddText: { color: "#FFFFFF", fontSize: 12.5, fontWeight: "800" },
  historyMeta: { paddingHorizontal: 16, marginBottom: 12 },
  visibilityRow: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginBottom: 10, minHeight: 28 },
  visibilityText: { fontSize: 12, color: "#6B7280" },
  visibilityStrong: { fontWeight: "700", color: "#1F2937" },
  requestsBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEF3C7", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  requestsText: { flex: 1, fontSize: 12, color: "#92400E", fontWeight: "600" },
  journeyHead: { paddingHorizontal: 16, marginTop: 30, marginBottom: 12 },
  journeySub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  statsHeading: { fontSize: 18, fontWeight: "900", color: "#1F2937", paddingHorizontal: 16, marginTop: 28 },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyText: { fontSize: 14, color: "#AAA", marginTop: 12 },
});

export default TournamentHistory;
