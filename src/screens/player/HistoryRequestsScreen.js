import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchPending, decideEntry } from "../../api/playerHistory";
import { assetUrl } from "../../utils/assetUrl";

const GREEN = "#15A765";
const TEXT_DARK = "#1A181B";
const TEXT_MUTED = "#6B7280";

const fmt = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

/** Posts that tag you wait here until you approve them onto your timeline. */
const HistoryRequestsScreen = () => {
  const navigation = useNavigation();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      setEntries(await fetchPending());
    } catch (err) {
      Alert.alert("Couldn't load requests", err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const decide = async (entry, approve) => {
    if (busyId) return;
    setBusyId(entry.id);
    try {
      await decideEntry(entry.id, approve);
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    } catch (err) {
      Alert.alert("Couldn't update", err?.response?.data?.message || err.message);
    } finally {
      setBusyId(null);
    }
  };

  const renderItem = ({ item }) => {
    const thumb = item.images?.[0] ? assetUrl(item.images[0]) : null;
    const busy = busyId === item.id;
    return (
      <View style={styles.card}>
        <Text style={styles.by}>
          {item.taggedBy?.name ? `${item.taggedBy.name} tagged you` : "You were tagged"} in a post
        </Text>
        <View style={styles.body}>
          {thumb && <Image source={{ uri: thumb }} style={styles.thumb} />}
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{item.tournamentName}</Text>
            <Text style={styles.meta}>
              {[item.sport, fmt(item.eventDate), item.location].filter(Boolean).join("  ·  ")}
            </Text>
            {!!item.description && (
              <Text style={styles.desc} numberOfLines={3}>
                {item.description}
              </Text>
            )}
            {item.verified && (
              <View style={styles.verified}>
                <Ionicons name="checkmark-circle" size={13} color={GREEN} />
                <Text style={styles.verifiedText}>You were registered for this tournament</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.btn, styles.rejectBtn]}
            onPress={() => decide(item, false)}
            disabled={busy}
          >
            <Text style={styles.rejectText}>Not me</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.approveBtn, busy && { opacity: 0.6 }]}
            onPress={() => decide(item, true)}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.approveText}>Add to my history</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={22} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>History requests</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              colors={[GREEN]}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="checkmark-done-outline" size={40} color="#CCC" />
              <Text style={styles.emptyText}>No pending requests</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: TEXT_DARK },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 60 },
  emptyText: { color: "#999", fontSize: 14 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginBottom: 12,
  },
  by: { fontSize: 12, color: TEXT_MUTED, marginBottom: 8 },
  body: { flexDirection: "row", gap: 10 },
  thumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: "#F2F2F2" },
  title: { fontSize: 15, fontWeight: "700", color: TEXT_DARK },
  meta: { fontSize: 12, color: TEXT_MUTED, marginTop: 3 },
  desc: { fontSize: 13, color: "#3A363D", marginTop: 6, lineHeight: 18 },
  verified: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  verifiedText: { fontSize: 11, color: GREEN, fontWeight: "600" },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  btn: { flex: 1, borderRadius: 10, paddingVertical: 11, alignItems: "center", justifyContent: "center" },
  rejectBtn: { borderWidth: 1.5, borderColor: "#D1D5DB" },
  rejectText: { color: TEXT_MUTED, fontWeight: "700", fontSize: 13 },
  approveBtn: { backgroundColor: GREEN, flex: 1.6 },
  approveText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});

export default HistoryRequestsScreen;
