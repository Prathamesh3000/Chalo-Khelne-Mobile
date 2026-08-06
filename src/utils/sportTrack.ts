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

// Per-sport track shape is deeply nested and varies by sport/stage, so it is
// kept loose here; call sites read the specific fields they need.
export interface SportTrack {
  sportId?: string | number;
  sportName?: string;
  type?: string;
  matchFormat?: unknown;
  categories?: unknown[];
  qualifyPerGroup?: number;
  drawSize?: number | null;
  groupStageFormat?: string;
  knockoutFormat?: string;
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

export function getTournamentType(tournament: TournamentLike | null | undefined, sportId?: SportId): string | null {
  return getSportTrack(tournament, sportId)?.type || null;
}

export function getMatchFormat(tournament: TournamentLike | null | undefined, sportId?: SportId): unknown {
  return getSportTrack(tournament, sportId)?.matchFormat || null;
}

export function getCategories(tournament: TournamentLike | null | undefined, sportId?: SportId): unknown[] {
  const cats = getSportTrack(tournament, sportId)?.categories;
  return Array.isArray(cats) ? cats : [];
}

export function getQualifyPerGroup(tournament: TournamentLike | null | undefined, sportId?: SportId): number {
  const v = getSportTrack(tournament, sportId)?.qualifyPerGroup;
  return v ?? 2;
}

export function getDrawSize(tournament: TournamentLike | null | undefined, sportId?: SportId): number | null {
  const v = getSportTrack(tournament, sportId)?.drawSize;
  return v ?? null;
}

export function getGroupStageFormat(tournament: TournamentLike | null | undefined, sportId?: SportId): string | null {
  return getSportTrack(tournament, sportId)?.groupStageFormat || null;
}

export function getKnockoutFormat(tournament: TournamentLike | null | undefined, sportId?: SportId): string | null {
  return getSportTrack(tournament, sportId)?.knockoutFormat || null;
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
