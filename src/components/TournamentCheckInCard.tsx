import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { showMessage } from "react-native-flash-message";
import axios from "axios";
import TournamentConfig from "../api/tournaments";
import { colors } from "../theme";

/**
 * Tournament-day self check-in.
 *
 * WHY: local tournaments take 53 registrations and see 16–25 players on the
 * day, and the draw has to be built from who is PRESENT. Letting players mark
 * themselves present from the app shortens the queue at the registration desk —
 * the manager still sees everyone and can override.
 *
 * What the player CANNOT do (enforced server-side, not here):
 *   • check anyone else in — the endpoint only ever touches the caller's own
 *     registration, whatever the request body says;
 *   • mark themselves absent or withdrawn — removing someone from the draw is
 *     a manager decision.
 *
 * Renders nothing when the player is not registered for this tournament.
 */

interface Entry {
  sportId: string;
  sportName?: string | null;
  categoryName: string;
  attendanceStatus: "registered" | "checked_in" | "no_show" | "withdrawn";
  markedAt?: string | null;
}

interface Props {
  tournamentId: string;
  /** Rendered above the card; omit for a bare card. */
  title?: string;
}

export default function TournamentCheckInCard({ tournamentId, title = "Your check-in" }: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [registered, setRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  const load = useCallback(async () => {
    if (!tournamentId) return;
    try {
      const res = await axios.get(TournamentConfig.ENDPOINTS.ATTENDANCE.ME(tournamentId));
      setRegistered(Boolean(res.data?.registered));
      setEntries(res.data?.entries || []);
    } catch {
      // Non-fatal: the card simply doesn't render.
      setRegistered(false);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    load();
  }, [load]);

  const checkIn = async (entry?: Entry) => {
    setCheckingIn(true);
    try {
      const res = await axios.post(
        TournamentConfig.ENDPOINTS.ATTENDANCE.SELF_CHECK_IN(tournamentId),
        entry ? { sportId: entry.sportId, categoryName: entry.categoryName } : {}
      );
      showMessage({
        message: "You're checked in",
        description: res.data?.message || "The organiser can see you've arrived.",
        type: "success",
        icon: "success",
        duration: 3000,
      });
      await load();
    } catch (err: any) {
      showMessage({
        message: "Could not check in",
        description:
          err?.response?.data?.message || "Please try again, or check in at the desk.",
        type: "danger",
        icon: "danger",
        duration: 4000,
      });
    } finally {
      setCheckingIn(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // Not registered for this tournament — nothing to check into.
  if (!registered || entries.length === 0) return null;

  const pending = entries.filter((e) => e.attendanceStatus === "registered");
  const allIn = pending.length === 0;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Ionicons
          name={allIn ? "checkmark-circle" : "location-outline"}
          size={18}
          color={allIn ? colors.primary : colors.textSub}
        />
        <Text style={styles.title}>{title}</Text>
      </View>

      {entries.map((e) => {
        const isIn = e.attendanceStatus === "checked_in";
        const isOut = e.attendanceStatus === "no_show" || e.attendanceStatus === "withdrawn";
        return (
          <View key={`${e.sportId}-${e.categoryName}`} style={styles.entryRow}>
            <View style={styles.entryInfo}>
              <Text style={styles.entryCategory}>{e.categoryName}</Text>
              {!!e.sportName && <Text style={styles.entrySport}>{e.sportName}</Text>}
            </View>

            {isIn ? (
              <View style={[styles.badge, styles.badgeIn]}>
                <Ionicons name="checkmark" size={13} color="#0B7A4B" />
                <Text style={styles.badgeInText}>Checked in</Text>
              </View>
            ) : isOut ? (
              <View style={[styles.badge, styles.badgeOut]}>
                <Text style={styles.badgeOutText}>
                  {e.attendanceStatus === "no_show" ? "Marked absent" : "Withdrawn"}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.checkInBtn}
                onPress={() => checkIn(e)}
                disabled={checkingIn}
                accessibilityRole="button"
                accessibilityLabel={`Check in for ${e.categoryName}`}
              >
                <Text style={styles.checkInBtnText}>
                  {checkingIn ? "…" : "I'm here"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {pending.length > 1 && (
        <TouchableOpacity
          style={styles.allBtn}
          onPress={() => checkIn()}
          disabled={checkingIn}
          accessibilityRole="button"
          accessibilityLabel="Check in for all my entries"
        >
          <Text style={styles.allBtnText}>
            {checkingIn ? "Checking in…" : `Check in for all ${pending.length} entries`}
          </Text>
        </TouchableOpacity>
      )}

      {entries.some((e) => e.attendanceStatus === "no_show") && (
        <Text style={styles.helpText}>
          Marked absent by mistake? Speak to the organiser at the desk — only they
          can change it.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  title: { fontSize: 15, fontWeight: "700", color: colors.text },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  entryInfo: { flex: 1, paddingRight: 12 },
  entryCategory: { fontSize: 14, fontWeight: "600", color: colors.text },
  entrySport: { fontSize: 12, color: colors.textSub, marginTop: 2 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeIn: { backgroundColor: "#D8F5E6" },
  badgeInText: { fontSize: 12, fontWeight: "700", color: "#0B7A4B" },
  badgeOut: { backgroundColor: "#FBE4E4" },
  badgeOutText: { fontSize: 12, fontWeight: "700", color: "#A62B2B" },
  checkInBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  checkInBtnText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  allBtn: {
    marginTop: 10,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  allBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  helpText: { fontSize: 11, color: colors.textSub, marginTop: 10, lineHeight: 16 },
});
