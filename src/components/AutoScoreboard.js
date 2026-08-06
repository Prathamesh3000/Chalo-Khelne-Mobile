import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * AutoScoreboard — the canonical "Auto" (tap-to-score) scoreboard, styled after
 * a classic table-tennis umpire board: two full-height colour halves (red /
 * teal), a huge zero-padded score on each side, player names on top, the
 * games-won tally at centre-top, a serve indicator + swap in the middle, and a
 * slim control bar at the bottom.
 *
 * Presentation-only + fully controlled — the parent owns the score state and
 * passes handlers. Used by BOTH the generic canonical scoreboard and the
 * team-tie rubber scorer so the Auto experience is identical everywhere.
 *
 * Tap a half → +1 for that side. Long-press a half → −1 (undo a mis-tap).
 *
 * Props:
 *   leftName / rightName          player or team labels
 *   leftScore / rightScore        current game points (numbers)
 *   leftGames / rightGames        games/sets won so far (centre tally)
 *   leftSub / rightSub            optional small subtitle under each score
 *   pointsToWinGame               used for serve rotation + deuce (default 11)
 *   firstServer ('left'|'right')  who served first this game
 *   onSwapServer                  flip the first server
 *   onScoreLeft / onScoreRight    +1 handlers (tap)
 *   onMinusLeft / onMinusRight    −1 handlers (long-press)
 *   onUndo / canUndo              undo last point
 *   onSubmit / submitLabel        finish/submit the game (optional)
 *   submitting                    disables interaction while posting
 *   onClose                       close the board
 *   title                         bottom-left caption
 */

const pad = (n) => String(Math.max(0, Number(n) || 0)).padStart(2, "0");

// Standard TT serve rotation: change every 2 points, every 1 point at deuce
// (both sides ≥ pointsToWinGame − 1). Returns 'left' | 'right' | null.
function computeServer(firstServer, l, r, pts) {
  if (!firstServer) return null;
  const total = (l || 0) + (r || 0);
  const deuce = l >= pts - 1 && r >= pts - 1;
  const changes = deuce ? total - (pts - 1) : Math.floor(total / 2);
  const flipped = ((changes % 2) + 2) % 2 === 1;
  const other = firstServer === "left" ? "right" : "left";
  return flipped ? other : firstServer;
}

export default function AutoScoreboard({
  leftName = "Player A",
  rightName = "Player B",
  leftScore = 0,
  rightScore = 0,
  leftGames = 0,
  rightGames = 0,
  leftSub,
  rightSub,
  pointsToWinGame = 11,
  firstServer = "left",
  onSwapServer,
  onScoreLeft,
  onScoreRight,
  onMinusLeft,
  onMinusRight,
  onUndo,
  canUndo,
  onSubmit,
  submitLabel = "Submit game",
  submitting,
  onClose,
  title = "Scoreboard",
  menu, // optional [{key,label,sub,right,active,disabled,onPress}] → shows a ⋯ button
  menuTitle = "Matches",
}) {
  const server = computeServer(firstServer, leftScore, rightScore, pointsToWinGame);
  const [menuOpen, setMenuOpen] = useState(false);
  const hasMenu = Array.isArray(menu) && menu.length > 0;

  return (
    <View style={styles.root}>
      {/* Two tappable colour halves */}
      <View style={styles.halves}>
        <TouchableOpacity
          style={[styles.half, styles.left]}
          activeOpacity={0.9}
          onPress={onScoreLeft}
          onLongPress={onMinusLeft}
          disabled={submitting}
        >
          <View style={styles.nameRow}>
            {server === "left" && <View style={styles.serveDot} />}
            <Text style={styles.name} numberOfLines={1}>{leftName}</Text>
          </View>
          <Text style={styles.score}>{pad(leftScore)}</Text>
          {!!leftSub && <Text style={styles.sub} numberOfLines={1}>{leftSub}</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.half, styles.right]}
          activeOpacity={0.9}
          onPress={onScoreRight}
          onLongPress={onMinusRight}
          disabled={submitting}
        >
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{rightName}</Text>
            {server === "right" && <View style={styles.serveDot} />}
          </View>
          <Text style={styles.score}>{pad(rightScore)}</Text>
          {!!rightSub && <Text style={styles.sub} numberOfLines={1}>{rightSub}</Text>}
        </TouchableOpacity>
      </View>

      {/* Centre overlay — games tally + serve swap */}
      <View style={styles.center} pointerEvents="box-none">
        <View style={styles.gamesRow}>
          <Text style={styles.gamesNum}>{leftGames}</Text>
          <Text style={styles.gamesNum}>{rightGames}</Text>
        </View>
        <TouchableOpacity style={styles.serveSwap} onPress={onSwapServer} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="swap-horizontal" size={26} color="rgba(255,255,255,0.92)" />
        </TouchableOpacity>
      </View>

      {/* Bottom control bar */}
      <View style={styles.bar}>
        <Text style={styles.barTitle} numberOfLines={1}>{title}</Text>
        <View style={styles.barControls}>
          {hasMenu && (
            <TouchableOpacity style={styles.iconBtn} onPress={() => setMenuOpen(true)} disabled={submitting}>
              <Ionicons name="ellipsis-horizontal" size={22} color="#fff" />
            </TouchableOpacity>
          )}
          {onUndo && (
            <TouchableOpacity
              style={[styles.iconBtn, !canUndo && styles.iconBtnOff]}
              onPress={onUndo}
              disabled={!canUndo || submitting}
            >
              <Ionicons name="arrow-undo" size={20} color="#fff" />
            </TouchableOpacity>
          )}
          {onSubmit && (
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={onSubmit}
              disabled={submitting || (leftScore === 0 && rightScore === 0)}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={styles.submitText}>{submitLabel}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.iconBtn} onPress={onClose} disabled={submitting}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Matches / rubbers panel (slides in from the right) */}
      {hasMenu && menuOpen && (
        <View style={styles.menuOverlay}>
          <TouchableOpacity style={styles.menuBackdrop} activeOpacity={1} onPress={() => setMenuOpen(false)} />
          <View style={styles.menuPanel}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>{menuTitle}</Text>
              <TouchableOpacity onPress={() => setMenuOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {menu.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.menuRow, m.active && styles.menuRowActive]}
                  activeOpacity={m.disabled ? 1 : 0.7}
                  disabled={m.disabled}
                  onPress={() => { m.onPress && m.onPress(); setMenuOpen(false); }}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.menuRowLabel} numberOfLines={1}>{m.label}</Text>
                    {!!m.sub && <Text style={styles.menuRowSub} numberOfLines={1}>{m.sub}</Text>}
                  </View>
                  {!!m.right && <Text style={[styles.menuRowRight, m.active && styles.menuRowRightActive]}>{m.right}</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const RED = "#CE2B37";
const TEAL = "#4B98AC";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#111" },
  halves: { flex: 1, flexDirection: "row" },
  half: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 40 },
  left: { backgroundColor: RED },
  right: { backgroundColor: TEAL },
  nameRow: { position: "absolute", top: 18, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12 },
  name: { color: "#fff", fontSize: 22, fontWeight: "700", maxWidth: 220 },
  serveDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#FFEB3B" },
  score: { color: "#fff", fontSize: 150, fontWeight: "900", lineHeight: 168, includeFontPadding: false },
  sub: { position: "absolute", bottom: 16, color: "rgba(255,255,255,0.85)", fontSize: 16, fontWeight: "600" },

  center: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "flex-start" },
  gamesRow: { flexDirection: "row", gap: 44, marginTop: 14 },
  gamesNum: { color: "rgba(255,255,255,0.75)", fontSize: 34, fontWeight: "800", width: 40, textAlign: "center" },
  serveSwap: { position: "absolute", top: "44%", width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.18)" },

  bar: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    height: 52, backgroundColor: "#181A22",
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  barTitle: { color: "#fff", fontSize: 15, fontWeight: "700", flexShrink: 1 },
  barControls: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: { width: 40, height: 36, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.12)" },
  iconBtnOff: { opacity: 0.4 },
  submitBtn: { flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 16, borderRadius: 9, backgroundColor: "#15A765" },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  // Matches / rubbers side panel
  menuOverlay: { ...StyleSheet.absoluteFillObject, flexDirection: "row" },
  menuBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  menuPanel: { width: 380, maxWidth: "72%", backgroundColor: "#1B1D26", paddingTop: 14 },
  menuHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  menuTitle: { color: "#fff", fontSize: 15, fontWeight: "800", letterSpacing: 0.5 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  menuRowActive: { backgroundColor: "rgba(21,167,101,0.16)" },
  menuRowLabel: { color: "#E5E7EB", fontSize: 13.5, fontWeight: "700" },
  menuRowSub: { color: "rgba(255,255,255,0.5)", fontSize: 11.5, marginTop: 2 },
  menuRowRight: { color: "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: "800", marginLeft: 8 },
  menuRowRightActive: { color: "#6EE7B7" },
});
