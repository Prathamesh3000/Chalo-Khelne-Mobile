import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { assetUrl } from "../utils/assetUrl";
import Avatar from "./Avatar";
import { formatDate, isWin, sportIcon } from "./historyUi";
import type { PlayerHistoryEntry } from "../api/playerHistory";

const GREEN = "#15A765";
const MAX_AVATARS = 4;

type Tone = "gold" | "green" | "plain";

const TONES: Record<
  Tone,
  { colors: [string, string]; text: string; sub: string; chip: string; chipText: string }
> = {
  // Winners: gold. Verified results: deep brand green. Self-reported: soft neutral.
  gold: { colors: ["#F5C31C", "#F9E08A"], text: "#3D2900", sub: "rgba(61,41,0,0.72)", chip: "rgba(255,255,255,0.6)", chipText: "#3D2900" },
  green: { colors: ["#0F5132", "#15A765"], text: "#FFFFFF", sub: "rgba(255,255,255,0.82)", chip: "rgba(255,255,255,0.2)", chipText: "#FFFFFF" },
  plain: { colors: ["#EEF2F0", "#EEF2F0"], text: "#1A181B", sub: "#5F6B64", chip: "#FFFFFF", chipText: "#4B5563" },
};

const toneOf = (e: PlayerHistoryEntry): Tone => (isWin(e) ? "gold" : e.verified ? "green" : "plain");

interface Props {
  entry: PlayerHistoryEntry;
  isOwner?: boolean;
  onMenu?: (entry: PlayerHistoryEntry) => void;
  onPhoto?: (uri: string) => void;
}

/** One history entry as a full-width poster card. */
const HistoryCard = ({ entry: e, isOwner, onMenu, onPhoto }: Props) => {
  const win = isWin(e);
  const t = TONES[toneOf(e)];
  const mates = e.teammates || [];
  const shown = mates.slice(0, MAX_AVATARS);
  const extra = mates.length - shown.length;
  const date = formatDate(e);

  return (
    <LinearGradient colors={t.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
      <Ionicons name={sportIcon(e.sport, win)} size={150} color={t.text} style={styles.glyph} />

      <View style={styles.topRow}>
        <View style={styles.chips}>
          {!!e.result && (
            <View style={[styles.chip, { backgroundColor: t.chip }]}>
              <Ionicons name="medal" size={12} color={t.chipText} />
              <Text style={[styles.chipText, { color: t.chipText }]}>{e.result}</Text>
            </View>
          )}
          <View style={[styles.chip, { backgroundColor: t.chip }]}>
            <Ionicons
              name={e.verified ? "checkmark-circle" : "person-outline"}
              size={12}
              color={e.verified && toneOf(e) === "plain" ? GREEN : t.chipText}
            />
            <Text style={[styles.chipText, { color: t.chipText }]}>{e.verified ? "Verified" : "Self-reported"}</Text>
          </View>
        </View>

        {isOwner && (
          <TouchableOpacity
            onPress={() => onMenu?.(e)}
            style={styles.kebab}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Entry options"
          >
            <Ionicons name="ellipsis-vertical" size={20} color={t.text} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={[styles.title, { color: t.text }]} numberOfLines={2}>
        {e.tournamentName}
      </Text>
      {(!!e.sport || !!e.location) && (
        <Text style={[styles.meta, { color: t.sub }]} numberOfLines={1}>
          {[e.sport, e.location].filter(Boolean).join("  ·  ")}
        </Text>
      )}
      {!!e.description && (
        <Text style={[styles.desc, { color: t.sub }]} numberOfLines={3}>
          {e.description}
        </Text>
      )}

      {e.images.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photos}>
          {e.images.map((p) => {
            const uri = assetUrl(p);
            return uri ? (
              <TouchableOpacity key={p} onPress={() => onPhoto?.(uri)} activeOpacity={0.85} accessibilityLabel="View photo">
                <Image source={{ uri }} style={styles.photo} />
              </TouchableOpacity>
            ) : null;
          })}
        </ScrollView>
      )}

      <View style={styles.bottomRow}>
        {!!date && (
          <View style={styles.datePill}>
            <Ionicons name="calendar-outline" size={13} color={t.text} />
            <Text style={[styles.dateText, { color: t.text }]}>{date}</Text>
          </View>
        )}
        {mates.length > 0 && (
          <View
            style={styles.avatars}
            accessible
            accessibilityLabel={`Played with ${mates.map((m) => m.name).filter(Boolean).join(", ")}`}
          >
            {shown.map((m, i) => (
              <View key={m.id} style={[styles.avatarWrap, i > 0 && styles.avatarOverlap]}>
                <Avatar uri={m.avatar} size={28} />
              </View>
            ))}
            {extra > 0 && (
              <View style={[styles.avatarWrap, styles.avatarOverlap, styles.moreBubble]}>
                <Text style={styles.moreText}>+{extra}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  card: { borderRadius: 22, padding: 16, overflow: "hidden", minHeight: 150 },
  glyph: { position: "absolute", right: -26, bottom: -30, opacity: 0.13 },

  topRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  chips: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: 11, fontFamily: "Montserrat_700Bold" },
  kebab: { width: 32, height: 32, alignItems: "center", justifyContent: "center", marginRight: -8, marginTop: -4 },

  title: { fontSize: 19, lineHeight: 24, marginTop: 14, fontFamily: "Montserrat_700Bold" },
  meta: { fontSize: 12.5, marginTop: 4, fontFamily: "Montserrat_500Medium" },
  desc: { fontSize: 12.5, lineHeight: 18, marginTop: 8, fontFamily: "Poppins_400Regular" },
  photos: { marginTop: 10 },
  photo: { width: 76, height: 76, borderRadius: 12, marginRight: 8, backgroundColor: "rgba(255,255,255,0.4)" },

  bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 },
  datePill: { flexDirection: "row", alignItems: "center", gap: 6 },
  dateText: { fontSize: 12.5, fontFamily: "Montserrat_600SemiBold" },
  avatars: { flexDirection: "row", alignItems: "center" },
  avatarWrap: { borderWidth: 2, borderColor: "#FFFFFF", borderRadius: 16 },
  avatarOverlap: { marginLeft: -9 },
  moreBubble: { width: 32, height: 32, backgroundColor: "#0F5132", alignItems: "center", justifyContent: "center" },
  moreText: { fontSize: 10.5, color: "#FFFFFF", fontFamily: "Montserrat_700Bold" },
});

export default HistoryCard;
