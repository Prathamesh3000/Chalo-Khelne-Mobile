import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { fetchTimeline } from "../../api/playerHistory";
import HistoryTimeline from "../../components/HistoryTimeline";

const GREEN = "#15A765";
const TEXT_DARK = "#1A181B";
const TEXT_MUTED = "#6B7280";

/**
 * Shown once, the first time a player lands on Home with an empty timeline
 * (see PlayerHomeScreen). Registration ends at the login screen with no session,
 * so this is the first moment history can actually be saved.
 */
const HistorySetupScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const uid = user?.id || user?._id;
      if (!uid) return;
      fetchTimeline(uid)
        .then(setEntries)
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [user])
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="trophy" size={44} color="#fff" />
        </View>
        <Text style={styles.title}>Build your playing history</Text>
        <Text style={styles.sub}>
          Add the tournaments and events you've played. They appear on your profile as a timeline, and
          anything you post about a match is added automatically.
        </Text>

        {loading ? (
          <ActivityIndicator color={GREEN} style={{ marginTop: 24 }} />
        ) : (
          entries.length > 0 && (
            <View style={styles.listCard}>
              <HistoryTimeline entries={entries} surface="#F7F8FA" />
            </View>
          )
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate("AddHistory", { source: "signup" })}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addText}>{entries.length ? "Add another event" : "Add an event"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.skipText}>{entries.length ? "Done" : "Skip for now"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 24, alignItems: "center" },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  title: { fontSize: 24, fontWeight: "800", color: TEXT_DARK, marginTop: 20, textAlign: "center" },
  sub: { fontSize: 14, color: TEXT_MUTED, lineHeight: 21, textAlign: "center", marginTop: 10 },
  listCard: {
    alignSelf: "stretch",
    marginTop: 24,
    backgroundColor: "#F7F8FA",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
  },
  footer: { paddingHorizontal: 24, paddingBottom: 16 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 15,
  },
  addText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  skipBtn: { alignItems: "center", paddingVertical: 14 },
  skipText: { color: TEXT_MUTED, fontSize: 14, fontWeight: "600" },
});

export default HistorySetupScreen;
