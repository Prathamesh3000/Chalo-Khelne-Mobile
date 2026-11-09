import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Avatar from "./Avatar";
import { formatDate, hasValidDate, isWin, sportIcon, whenOf } from "./historyUi";
import type { PlayerHistoryEntry } from "../api/playerHistory";

const GREEN = "#15A765";
const GREEN_DARK = "#0F5132";
const RAIL = "#BFE6D1";
const TEXT_DARK = "#1A181B";
const TEXT_MUTED = "#6B7280";
const GOLD = "#F5C31C";
const NODE = 38;
const RAIL_COL = 52;
const COLLAPSED_COUNT = 4;
const MAX_AVATARS = 3;

interface Props {
  entries: PlayerHistoryEntry[];
  /** When the player joined; adds a "Joined Chalo Khelne" start marker at the bottom. */
  startedAt?: string | null;
  /** Colour of the page behind the timeline, used for the ring around each node. */
  surface?: string;
  emptyText?: string;
}

type Row =
  | { kind: "year"; year: string; count: number }
  | { kind: "entry"; entry: PlayerHistoryEntry; last: boolean };

/**
 * Classic vertical timeline, newest first: one continuous green rail, a sport
 * badge for each event (gold = win, green = verified, grey = self-reported),
 * year flags, and a "Joined Chalo Khelne" marker where it all began.
 */
const HistoryVerticalTimeline = ({ entries, startedAt, surface = "#F8F9FB", emptyText }: Props) => {
  const [expanded, setExpanded] = useState(false);

  const sorted = useMemo(
    () => entries.filter(hasValidDate).sort((a, b) => whenOf(b).getTime() - whenOf(a).getTime()),
    [entries]
  );
  const shown = expanded ? sorted : sorted.slice(0, COLLAPSED_COUNT);
  const hiddenCount = sorted.length - shown.length;

  const joined = useMemo(() => {
    if (!startedAt) return null;
    const d = new Date(startedAt);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  }, [startedAt]);

  const rows: Row[] = useMemo(() => {
    const yearCounts = new Map<string, number>();
    sorted.forEach((e) => {
      const y = String(whenOf(e).getFullYear());
      yearCounts.set(y, (yearCounts.get(y) || 0) + 1);
    });
    const out: Row[] = [];
    let current = "";
    shown.forEach((e, i) => {
      const y = String(whenOf(e).getFullYear());
      if (y !== current) {
        current = y;
        out.push({ kind: "year", year: y, count: yearCounts.get(y) || 0 });
      }
      // The rail keeps going after the last visible entry when there is more
      // below it (hidden entries, or the join marker).
      out.push({ kind: "entry", entry: e, last: i === shown.length - 1 && hiddenCount === 0 && !joined });
    });
    return out;
  }, [shown, sorted, hiddenCount, joined]);

  if (!sorted.length) {
    return <Text style={styles.empty}>{emptyText || "Your journey will appear here as you add events."}</Text>;
  }

  return (
    <View>
      {rows.map((r, idx) => {
        if (r.kind === "year") {
          return (
            <View key={`y-${r.year}`} style={styles.yearRow}>
              <View style={styles.railCol}>
                <View style={styles.railFull} />
                <View style={[styles.yearDot, { borderColor: surface }]} />
              </View>
              <View style={styles.yearPill}>
                <Text style={styles.yearText}>{r.year}</Text>
                <Text style={styles.yearCount}>
                  {r.count} {r.count === 1 ? "event" : "events"}
                </Text>
              </View>
            </View>
          );
        }

        const e = r.entry;
        const win = isWin(e);
        const nodeBg = win ? GOLD : e.verified ? GREEN : "#C3CDC7";
        const mates = e.teammates || [];
        const shownMates = mates.slice(0, MAX_AVATARS);
        const extra = mates.length - shownMates.length;

        return (
          <View key={e.id} style={styles.row}>
            <View style={styles.railCol}>
              {/* rail above the node is the previous row's tail; this row draws its own tail below */}
              <View style={[styles.node, { backgroundColor: nodeBg, borderColor: surface }]}>
                <Ionicons name={sportIcon(e.sport, win)} size={17} color={win ? "#3D2900" : "#FFFFFF"} />
              </View>
              {!r.last && <View style={styles.tail} />}
            </View>

            <View style={[styles.card, { marginBottom: idx === rows.length - 1 ? 0 : 14 }]}>
              <Text style={styles.date}>{formatDate(e).toUpperCase()}</Text>
              <Text style={styles.title} numberOfLines={2}>
                {e.tournamentName}
              </Text>
              {(!!e.sport || !!e.location) && (
                <Text style={styles.meta} numberOfLines={1}>
                  {[e.sport, e.location].filter(Boolean).join("  ·  ")}
                </Text>
              )}

              <View style={styles.tags}>
                {!!e.result && (
                  <View style={[styles.tag, win ? styles.tagGold : styles.tagGreen]}>
                    <Ionicons name="medal" size={11} color={win ? "#3D2900" : GREEN_DARK} />
                    <Text style={[styles.tagText, { color: win ? "#3D2900" : GREEN_DARK }]}>{e.result}</Text>
                  </View>
                )}
                {e.verified ? (
                  <View style={[styles.tag, styles.tagGreen]}>
                    <Ionicons name="checkmark-circle" size={11} color={GREEN} />
                    <Text style={[styles.tagText, { color: GREEN_DARK }]}>Verified</Text>
                  </View>
                ) : (
                  <View style={[styles.tag, styles.tagGrey]}>
                    <Text style={[styles.tagText, { color: TEXT_MUTED }]}>Self-reported</Text>
                  </View>
                )}
                {mates.length > 0 && (
                  <View
                    style={styles.mates}
                    accessible
                    accessibilityLabel={`Played with ${mates.map((m) => m.name).filter(Boolean).join(", ")}`}
                  >
                    {shownMates.map((m, i) => (
                      <View key={m.id} style={[styles.mateWrap, i > 0 && styles.mateOverlap]}>
                        <Avatar uri={m.avatar} size={22} />
                      </View>
                    ))}
                    {extra > 0 && (
                      <View style={[styles.mateWrap, styles.mateOverlap, styles.mateMore]}>
                        <Text style={styles.mateMoreText}>+{extra}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          </View>
        );
      })}

      {hiddenCount > 0 && (
        <View style={styles.row}>
          <View style={styles.railCol}>
            <View style={styles.railFull} />
          </View>
          <TouchableOpacity
            style={styles.more}
            onPress={() => setExpanded(true)}
            accessibilityRole="button"
            accessibilityLabel={`Show ${hiddenCount} more events`}
          >
            <Text style={styles.moreText}>Show {hiddenCount} more</Text>
            <Ionicons name="chevron-down" size={14} color={GREEN} />
          </TouchableOpacity>
        </View>
      )}

      {expanded && sorted.length > COLLAPSED_COUNT && (
        <View style={[styles.row, { marginTop: 4 }]}>
          <View style={styles.railCol} />
          <TouchableOpacity
            style={styles.more}
            onPress={() => setExpanded(false)}
            accessibilityRole="button"
            accessibilityLabel="Show fewer events"
          >
            <Text style={styles.moreText}>Show less</Text>
            <Ionicons name="chevron-up" size={14} color={GREEN} />
          </TouchableOpacity>
        </View>
      )}

      {!!joined && (
        <View style={styles.startRow}>
          <View style={styles.railCol}>
            <View style={styles.railHalf} />
            <View style={[styles.startNode, { borderColor: surface }]}>
              <Ionicons name="flag" size={15} color="#FFFFFF" />
            </View>
          </View>
          <View style={styles.startText}>
            <Text style={styles.startTitle}>Joined Chalo Khelne</Text>
            <Text style={styles.startSub}>{joined}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  empty: { color: TEXT_MUTED, fontSize: 13, paddingHorizontal: 16, fontFamily: "Montserrat_500Medium" },

  row: { flexDirection: "row", paddingRight: 16 },
  railCol: { width: RAIL_COL, alignItems: "center" },
  // Full-height rail behind a marker.
  railFull: { position: "absolute", top: 0, bottom: 0, width: 3, backgroundColor: RAIL },
  railHalf: { position: "absolute", top: 0, height: 22, width: 3, backgroundColor: RAIL },
  tail: { flex: 1, width: 3, backgroundColor: RAIL, marginTop: -2 },

  yearRow: { flexDirection: "row", alignItems: "center", paddingRight: 16, minHeight: 44 },
  yearDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: GREEN, borderWidth: 3 },
  yearPill: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: GREEN_DARK, borderRadius: 999, paddingLeft: 14, paddingRight: 12, minHeight: 30 },
  yearText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Montserrat_700Bold" },
  yearCount: { color: "rgba(255,255,255,0.75)", fontSize: 11, fontFamily: "Montserrat_500Medium" },

  node: { width: NODE, height: NODE, borderRadius: NODE / 2, borderWidth: 3, alignItems: "center", justifyContent: "center", zIndex: 1 },

  card: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "#E8EEEA" },
  date: { fontSize: 10.5, letterSpacing: 0.8, color: GREEN, fontFamily: "Montserrat_700Bold" },
  title: { fontSize: 14.5, lineHeight: 19, color: TEXT_DARK, marginTop: 3, fontFamily: "Montserrat_700Bold" },
  meta: { fontSize: 12, color: TEXT_MUTED, marginTop: 3, fontFamily: "Montserrat_500Medium" },

  tags: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 10 },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  tagGold: { backgroundColor: "#FFF1BF" },
  tagGreen: { backgroundColor: "#E4F6EC" },
  tagGrey: { backgroundColor: "#F1F3F2" },
  tagText: { fontSize: 10.5, fontFamily: "Montserrat_700Bold" },

  mates: { flexDirection: "row", alignItems: "center", marginLeft: "auto" },
  mateWrap: { borderWidth: 2, borderColor: "#FFFFFF", borderRadius: 13 },
  mateOverlap: { marginLeft: -7 },
  mateMore: { width: 26, height: 26, backgroundColor: GREEN_DARK, alignItems: "center", justifyContent: "center" },
  mateMoreText: { color: "#FFFFFF", fontSize: 9.5, fontFamily: "Montserrat_700Bold" },

  more: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, paddingLeft: 4 },
  moreText: { fontSize: 13, color: GREEN, fontFamily: "Montserrat_700Bold" },

  startRow: { flexDirection: "row", alignItems: "center", paddingRight: 16, marginTop: 2 },
  startNode: { width: 34, height: 34, borderRadius: 17, borderWidth: 3, backgroundColor: GREEN_DARK, alignItems: "center", justifyContent: "center", marginTop: 22 },
  startText: { flex: 1, paddingTop: 22 },
  startTitle: { fontSize: 13.5, color: TEXT_DARK, fontFamily: "Montserrat_700Bold" },
  startSub: { fontSize: 12, color: TEXT_MUTED, marginTop: 2, fontFamily: "Montserrat_500Medium" },
});

export default HistoryVerticalTimeline;
