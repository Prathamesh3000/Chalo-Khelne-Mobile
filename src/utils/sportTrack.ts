// client/src/utils/sportTrack.js
//
// Mobile-side mirror of server/utils/sportTrackUtils.js — read-only.
// Used by mobile screens to read per-sport fields off
// `tournament.sports[]` instead of the deprecated root scalars
// (sportsType, type, matchFormat, …).
//
// No legacy synthesize fallback: after STEP 16 every tournament has
// sports[] populated. Returns null/[]/{} when track is missing, and
// call sites apply their own display defaults.

// One category row on a sport track. The format fields are per-category
// OVERRIDES: null means "inherit the track", which is how every tournament
// created before per-category format was added reads.
export interface CategoryRow {
  name?: string;
  fee?: number;
  minAge?: number | null;
  maxAge?: number | null;
  gender?: string;
  // Play day "YYYY-MM-DD" for multi-day events; null = the whole tournament.
  date?: string | null;
  type?: string | null;
  groupStageFormat?: string | null;
  knockoutFormat?: string | null;
  qualifyPerGroup?: number | null;
  drawSize?: number | null;
  [key: string]: unknown;
}

// Per-sport track shape is deeply nested and varies by sport/stage, so it is
// kept loose here; call sites read the specific fields they need.
export interface SportTrack {
  sportId?: string | number;
  sportName?: string;
  type?: string;
  matchFormat?: unknown;
  categories?: CategoryRow[];
  qualifyPerGroup?: number;
  drawSize?: number | null;
  groupStageFormat?: string;
  knockoutFormat?: string;
  formatScope?: string;
  davisCupFormatId?: string;
  sportRules?: unknown;
  currentStage?: string;
  stageConfig?: Record<string, unknown>;
  [key: string]: unknown;
}

interface TournamentLike {
  sports?: SportTrack[];
  [key: string]: unknown;
}

type SportId = string | number | null | undefined;

export function getSportTrack(
  tournament: TournamentLike | null | undefined,
  sportId?: SportId
): SportTrack | null {
  if (!tournament) return null;
  const tracks = Array.isArray(tournament.sports) ? tournament.sports : [];
  if (tracks.length === 0) return null;
  if (!sportId) return tracks[0];
  const idStr = String(sportId);
  return tracks.find((t) => String(t?.sportId) === idStr) || tracks[0];
}

export function getSportName(tournament: TournamentLike | null | undefined, sportId?: SportId): string | null {
  return getSportTrack(tournament, sportId)?.sportName || null;
}

export function getCategories(tournament: TournamentLike | null | undefined, sportId?: SportId): CategoryRow[] {
  const cats = getSportTrack(tournament, sportId)?.categories;
  return Array.isArray(cats) ? cats : [];
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-10-31" → "Sat, 31 Oct"; null when the category has no play day.
// Parsed as a local calendar date — new Date("2026-10-31") is UTC midnight
// and would show the previous day in timezones west of UTC.
export function formatCategoryDay(date?: string | null): string | null {
  const m = typeof date === "string" ? date.match(/^(\d{4})-(\d{2})-(\d{2})/) : null;
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return null;
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

// Find one category row by name. Matching is case-insensitive and trimmed
// because the category name is a free string on the booking side and will not
// always match the tournament's casing. Mirrors the server's getCategory.
export function getCategory(
  tournament: TournamentLike | null | undefined,
  sportId?: SportId,
  categoryName?: string | null
): CategoryRow | null {
  if (!categoryName) return null;
  const wanted = String(categoryName).trim().toLowerCase();
  if (!wanted) return null;
  return (
    getCategories(tournament, sportId).find(
      (c) => String(c?.name || "").trim().toLowerCase() === wanted
    ) || null
  );
}

// A track holds ONE format for all its categories, and the enum allows the
// combined "Singles, Doubles" for tracks running both. Resolution order —
// identical to server/utils/sportTrackUtils.js, which is authoritative:
//
//   1. the category's own override;
//   2. the track value, when it names a single format;
//   3. for the combined value, the category name (the only signal left);
//   4. null — the caller applies its own display default.
//
// Omitting categoryName gives the old track-only behaviour, so existing call
// sites are unaffected.
const COMBINED_FORMAT = "Singles, Doubles";

function resolveFormat(
  trackValue: string | null,
  categoryValue: string | null,
  categoryName?: string | null
): string | null {
  if (categoryValue) return categoryValue;
  if (trackValue && trackValue !== COMBINED_FORMAT) return trackValue;
  if (trackValue === COMBINED_FORMAT) {
    return /doubles/i.test(String(categoryName || "")) ? "Doubles" : "Singles";
  }
  return null;
}

export function getTournamentType(
  tournament: TournamentLike | null | undefined,
  sportId?: SportId,
  categoryName?: string | null
): string | null {
  const category = getCategory(tournament, sportId, categoryName);
  return category?.type || getSportTrack(tournament, sportId)?.type || null;
}

export function getMatchFormat(tournament: TournamentLike | null | undefined, sportId?: SportId): unknown {
  return getSportTrack(tournament, sportId)?.matchFormat || null;
}

export function getQualifyPerGroup(
  tournament: TournamentLike | null | undefined,
  sportId?: SportId,
  categoryName?: string | null
): number {
  const category = getCategory(tournament, sportId, categoryName);
  const track = getSportTrack(tournament, sportId);
  return category?.qualifyPerGroup ?? track?.qualifyPerGroup ?? 2;
}

export function getDrawSize(
  tournament: TournamentLike | null | undefined,
  sportId?: SportId,
  categoryName?: string | null
): number | null {
  const category = getCategory(tournament, sportId, categoryName);
  const track = getSportTrack(tournament, sportId);
  return category?.drawSize ?? track?.drawSize ?? null;
}

export function getGroupStageFormat(
  tournament: TournamentLike | null | undefined,
  sportId?: SportId,
  categoryName?: string | null
): string | null {
  const track = getSportTrack(tournament, sportId);
  if (!track) return null;
  const category = getCategory(tournament, sportId, categoryName);
  return resolveFormat(track.groupStageFormat || null, category?.groupStageFormat || null, categoryName);
}

export function getKnockoutFormat(
  tournament: TournamentLike | null | undefined,
  sportId?: SportId,
  categoryName?: string | null
): string | null {
  const track = getSportTrack(tournament, sportId);
  if (!track) return null;
  const category = getCategory(tournament, sportId, categoryName);
  return resolveFormat(track.knockoutFormat || null, category?.knockoutFormat || null, categoryName);
}

// Authoring mode the manager chose in the wizard. Never gates resolution — a
// category override is honoured in either mode.
export function getFormatScope(
  tournament: TournamentLike | null | undefined,
  sportId?: SportId
): "sport" | "category" {
  return getSportTrack(tournament, sportId)?.formatScope === "category" ? "category" : "sport";
}

/**
 * Does entering this category require a partner?
 *
 * True when the category is played as doubles in EITHER stage. Registration
 * needs one answer before any match exists, and a category that reaches a
 * doubles knockout must be entered as a pair from the start — a lone player
 * has no partner to bring into the bracket.
 */
export function isDoublesCategory(
  tournament: TournamentLike | null | undefined,
  sportId?: SportId,
  categoryName?: string | null
): boolean {
  return (
    getGroupStageFormat(tournament, sportId, categoryName) === "Doubles" ||
    getKnockoutFormat(tournament, sportId, categoryName) === "Doubles"
  );
}

export function getDavisCupFormatId(tournament: TournamentLike | null | undefined, sportId?: SportId): string | null {
  return getSportTrack(tournament, sportId)?.davisCupFormatId || null;
}

export function getSportRules(tournament: TournamentLike | null | undefined, sportId?: SportId): unknown {
  return getSportTrack(tournament, sportId)?.sportRules || null;
}

export function getCurrentStage(tournament: TournamentLike | null | undefined, sportId?: SportId): string | null {
  return getSportTrack(tournament, sportId)?.currentStage || null;
}

export function getStageConfig(
  tournament: TournamentLike | null | undefined,
  sportId?: SportId
): Record<string, unknown> {
  return getSportTrack(tournament, sportId)?.stageConfig || {};
}
