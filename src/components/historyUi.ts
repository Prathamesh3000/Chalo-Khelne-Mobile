import type React from "react";
import type { Ionicons } from "@expo/vector-icons";
import type { PlayerHistoryEntry } from "../api/playerHistory";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

/** A win or championship result earns the gold treatment. */
export const isWin = (e: PlayerHistoryEntry) => /^(winner|champion)/i.test(e.result || "");

/** Pick an icon from the sport name; wins always get the trophy. */
export function sportIcon(sport: string | null, win = false): IoniconName {
  if (win) return "trophy";
  const s = (sport || "").toLowerCase();
  if (/foot|soccer/.test(s)) return "football";
  if (/basket/.test(s)) return "basketball";
  if (/tennis|badminton|squash|pickle/.test(s)) return "tennisball";
  if (/cricket|baseball|softball/.test(s)) return "baseball";
  if (/swim|water/.test(s)) return "water";
  if (/run|marathon|athlet/.test(s)) return "walk";
  return "trophy";
}

/** When the event happened, falling back to when it was added. */
export const whenOf = (e: PlayerHistoryEntry): Date => new Date(e.eventDate || e.createdAt);

export const hasValidDate = (e: PlayerHistoryEntry) => !Number.isNaN(whenOf(e).getTime());

export const formatDate = (e: PlayerHistoryEntry) => {
  const d = whenOf(e);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};
