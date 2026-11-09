import React, { useMemo, useState } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import TimeDial, { DialItem } from "./TimeDial";
import HistoryCard from "./HistoryCard";
import type { PlayerHistoryEntry } from "../api/playerHistory";

const GREEN = "#15A765";
const TEXT_DARK = "#1A181B";
const TEXT_MUTED = "#6B7280";
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
/** The dial always spans at least this many years, so it never looks empty or tiny. */
const MIN_YEARS = 10;

type Mode = "year" | "month" | "day";
interface Sel {
  mode: Mode;
  year: number;
  month: number | null;
  day: number | null;
}

interface Props {
  entries: PlayerHistoryEntry[];
  /** Owner sees the ⋮ menu with edit / delete. */
  isOwner?: boolean;
  onEdit?: (entry: PlayerHistoryEntry) => void;
  onDelete?: (entry: PlayerHistoryEntry) => void;
  emptyText?: string;
  /** Colour of the surface behind the dial (centre pill + edge fades). */
  surface?: string;
  /** Horizontal padding for the mode pill and cards; the dial itself is always full width. */
  inset?: number;
}

const whenOf = (e: PlayerHistoryEntry): Date => new Date(e.eventDate || e.createdAt);
const validWhen = (e: PlayerHistoryEntry) => !Number.isNaN(whenOf(e).getTime());

/**
 * Full-range history browser: a ruler dial for year / month / day on top, the
 * matching entries below. Periods without entries still exist on the dial and
 * show an empty message.
 */
const HistoryTimeline = ({ entries, isOwner, onEdit, onDelete, emptyText, surface = "#FFFFFF", inset = 0 }: Props) => {
  const dated = useMemo(() => entries.filter(validWhen), [entries]);
  const thisYear = new Date().getFullYear();

  const { minYear, maxYear, startYear } = useMemo(() => {
    const ys = dated.map((e) => whenOf(e).getFullYear());
    const earliest = ys.length ? Math.min(...ys) : thisYear;
    const latest = ys.length ? Math.max(...ys) : thisYear;
    return {
      minYear: Math.min(earliest, thisYear - (MIN_YEARS - 1)),
      maxYear: Math.max(latest, thisYear),
      // Open on the newest year that actually has something, else this year.
      startYear: latest,
    };
  }, [dated, thisYear]);

  const [sel, setSel] = useState<Sel>({ mode: "year", year: startYear, month: null, day: null });
  const [viewing, setViewing] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<PlayerHistoryEntry | null>(null);

  const countIn = (year: number, month: number | null, day: number | null) =>
    dated.filter((e) => {
      const d = whenOf(e);
      if (d.getFullYear() !== year) return false;
      if (month !== null && d.getMonth() !== month) return false;
      if (day !== null && d.getDate() !== day) return false;
      return true;
    }).length;

  const items: DialItem[] = useMemo(() => {
    if (sel.mode === "year") {
      const out: DialItem[] = [];
      for (let y = minYear; y <= maxYear; y++) out.push({ key: String(y), label: String(y), count: countIn(y, null, null) });
      return out;
    }
    if (sel.mode === "month") {
      return [
        { key: "all", label: "All", count: countIn(sel.year, null, null) },
        ...MONTHS.map((m, i) => ({ key: String(i), label: m, count: countIn(sel.year, i, null) })),
      ];
    }
    const month = sel.month ?? 0;
    const days = new Date(sel.year, month + 1, 0).getDate();
    const out: DialItem[] = [{ key: "all", label: "All", count: countIn(sel.year, month, null) }];
    for (let d = 1; d <= days; d++) out.push({ key: String(d), label: String(d), count: countIn(sel.year, month, d) });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel.mode, sel.year, sel.month, minYear, maxYear, dated]);

  const selectedKey =
    sel.mode === "year"
      ? String(sel.year)
      : sel.mode === "month"
      ? sel.month === null
        ? "all"
        : String(sel.month)
      : sel.day === null
      ? "all"
      : String(sel.day);

  const onSelect = (key: string) =>
    setSel((s) => {
      if (s.mode === "year") return { ...s, year: Number(key), month: null, day: null };
      if (s.mode === "month") return { ...s, month: key === "all" ? null : Number(key), day: null };
      return { ...s, day: key === "all" ? null : Number(key) };
    });

  const setMode = (mode: Mode) =>
    setSel((s) => {
      if (mode === "day" && s.month === null) {
        // Day needs a month: jump to the newest month in this year that has entries.
        const months = dated.filter((e) => whenOf(e).getFullYear() === s.year).map((e) => whenOf(e).getMonth());
        return { ...s, mode, month: months.length ? Math.max(...months) : new Date().getMonth(), day: null };
      }
      return { ...s, mode };
    });

  const visible = useMemo(
    () =>
      dated
        .filter((e) => {
          const d = whenOf(e);
          if (d.getFullYear() !== sel.year) return false;
          if (sel.month !== null && d.getMonth() !== sel.month) return false;
          if (sel.day !== null && d.getDate() !== sel.day) return false;
          return true;
        })
        .sort((a, b) => whenOf(b).getTime() - whenOf(a).getTime()),
    [dated, sel.year, sel.month, sel.day]
  );

  if (!entries.length) {
    return (
      <Text style={[styles.empty, { marginHorizontal: inset }]}>
        {emptyText || (isOwner ? "No playing history yet. Add your first event." : "No playing history yet.")}
      </Text>
    );
  }

  let readout = String(sel.year);
  if (sel.month !== null) readout = `${MONTHS[sel.month]} ${readout}`;
  if (sel.day !== null) readout = `${sel.day} ${readout}`;
  const level = sel.day !== null ? "day" : sel.month !== null ? "month" : "year";
  // A fresh ScrollView per level/context, so the dial never carries a stale offset across a change.
  const dialKey = `${sel.mode}:${sel.mode === "day" ? `${sel.year}-${sel.month}` : sel.mode === "month" ? sel.year : ""}`;

  return (
    <View>
      <View style={[styles.segWrap, { marginHorizontal: inset }]}>
        <View style={styles.seg}>
          {(["year", "month", "day"] as Mode[]).map((m) => {
            const on = sel.mode === m;
            return (
              <TouchableOpacity
                key={m}
                onPress={() => setMode(m)}
                style={[styles.segBtn, on && styles.segBtnOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`Pick by ${m}`}
              >
                <Text style={[styles.segText, on && styles.segTextOn]}>{m[0].toUpperCase() + m.slice(1)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <Text style={styles.readout} accessibilityLiveRegion="polite">
        {readout}
      </Text>
      <TimeDial key={dialKey} items={items} selectedKey={selectedKey} onSelect={onSelect} surface={surface} />
      <Text style={styles.summary}>
        {visible.length} {visible.length === 1 ? "event" : "events"}
        <Text style={styles.summaryMuted}>{`  ·  in this ${level}`}</Text>
      </Text>

      <View style={[styles.list, { marginHorizontal: inset }]}>
        {visible.length === 0 ? (
          <View style={styles.none}>
            <Ionicons name="calendar-clear-outline" size={34} color="#B8C4BD" />
            <Text style={styles.noneTitle}>Don't have any history at this timeline</Text>
            <Text style={styles.noneSub}>Slide the dial to a green tick to see your events.</Text>
          </View>
        ) : (
          visible.map((e) => (
            <HistoryCard key={e.id} entry={e} isOwner={isOwner} onMenu={setMenuFor} onPhoto={setViewing} />
          ))
        )}
      </View>

      {/* Owner action sheet */}
      <Modal visible={!!menuFor} transparent animationType="fade" onRequestClose={() => setMenuFor(null)}>
        <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setMenuFor(null)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle} numberOfLines={1}>
              {menuFor?.tournamentName}
            </Text>
            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => {
                const target = menuFor;
                setMenuFor(null);
                if (target) onEdit?.(target);
              }}
            >
              <Ionicons name="pencil" size={18} color={TEXT_DARK} />
              <Text style={styles.sheetText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => {
                const target = menuFor;
                setMenuFor(null);
                if (target) onDelete?.(target);
              }}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text style={[styles.sheetText, { color: "#EF4444" }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Photo viewer */}
      <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <TouchableOpacity style={styles.viewer} activeOpacity={1} onPress={() => setViewing(null)}>
          {!!viewing && <Image source={{ uri: viewing }} style={styles.viewerImg} resizeMode="contain" />}
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  empty: { color: TEXT_MUTED, fontSize: 13, marginTop: 4, fontFamily: "Montserrat_500Medium" },

  segWrap: { alignItems: "center", marginTop: 4 },
  seg: { flexDirection: "row", backgroundColor: "#E6ECE8", borderRadius: 999, padding: 4 },
  segBtn: { minHeight: 36, paddingHorizontal: 20, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  segBtnOn: { backgroundColor: GREEN },
  segText: { fontSize: 12.5, color: TEXT_MUTED, fontFamily: "Montserrat_700Bold" },
  segTextOn: { color: "#FFFFFF" },

  readout: { textAlign: "center", fontSize: 16, color: GREEN, letterSpacing: 0.3, marginTop: 14, marginBottom: 2, fontFamily: "Montserrat_700Bold" },
  summary: { textAlign: "center", fontSize: 14, color: TEXT_DARK, marginTop: 8, fontFamily: "Montserrat_700Bold" },
  summaryMuted: { fontSize: 12, color: TEXT_MUTED, fontFamily: "Montserrat_500Medium" },

  list: { marginTop: 16, gap: 14 },
  none: { alignItems: "center", paddingVertical: 36, paddingHorizontal: 24 },
  noneTitle: { fontSize: 15, color: TEXT_DARK, marginTop: 12, textAlign: "center", fontFamily: "Montserrat_700Bold" },
  noneSub: { fontSize: 12.5, color: TEXT_MUTED, marginTop: 6, textAlign: "center", fontFamily: "Poppins_400Regular" },

  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
  sheetTitle: { fontSize: 14, color: TEXT_MUTED, marginBottom: 8, fontFamily: "Montserrat_600SemiBold" },
  sheetItem: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52 },
  sheetText: { fontSize: 16, color: TEXT_DARK, fontFamily: "Montserrat_600SemiBold" },

  viewer: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", justifyContent: "center", alignItems: "center" },
  viewerImg: { width: "100%", height: "80%" },
});

export default HistoryTimeline;
