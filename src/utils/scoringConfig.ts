/**
 * Scoring configuration — fed by the server, read synchronously.
 *
 * §6.1: the sport→scoringType mapping and its display labels used to be a
 * hardcoded object literal here, another in the web app, and a third on the
 * server. The three had drifted — most visibly Carrom, which the web app
 * resolved as "single" while this app and the server used "board", so one match
 * document rendered as two different scores on two screens. Foosball was in the
 * server's table and neither client's, so both fell through to a null type.
 *
 * The server is now the source of truth (GET /api/sports/scoring-config). This
 * module keeps a synchronous view of it, because readMatchResult() is called
 * during render and cannot await.
 *
 * SEED_CONFIG is a cache warmed from the server so the first paint (before the
 * fetch resolves, or offline) is correct. It is NOT an independent table — the
 * server's copy overwrites it on load, and the shared drift test asserts the two
 * agree.
 */

import API from "../api/api";

export interface ResultLabels {
  round: string;
  subRound: string | null;
  score: string;
  result: string;
}

export interface ScoringConfig {
  sports: Record<string, string>;
  labels: Record<string, ResultLabels>;
  defaultScoringType: string;
}

// Mirror of server/utils/matchFormatUtils.js — keep in sync.
const SEED_CONFIG: ScoringConfig = {
  sports: {
    "Table Tennis": "sets",
    Badminton: "sets",
    Tennis: "sets",
    Pickleball: "sets",
    Volleyball: "sets",
    Squash: "sets",
    Cricket: "innings",
    Football: "time",
    Basketball: "time",
    Hockey: "time",
    Kabaddi: "time",
    Chess: "single",
    Carrom: "board",
    Foosball: "sets",
  },
  labels: {
    sets: { round: "Set", subRound: "Game", score: "Points", result: "Sets" },
    time: { round: "Period", subRound: null, score: "Goals", result: "Score" },
    innings: { round: "Innings", subRound: "Over", score: "Runs", result: "Score" },
    board: { round: "Board", subRound: null, score: "Points", result: "Boards" },
    single: { round: "Game", subRound: null, score: "Result", result: "Result" },
  },
  defaultScoringType: "single",
};

let config: ScoringConfig = {
  sports: { ...SEED_CONFIG.sports },
  labels: { ...SEED_CONFIG.labels },
  defaultScoringType: SEED_CONFIG.defaultScoringType,
};

let loaded = false;
let inFlight: Promise<ScoringConfig> | null = null;

/**
 * Fetch the authoritative config. Safe to call repeatedly; concurrent calls
 * share one request. Failures are non-fatal — the seed keeps rendering correct,
 * which matters on a mobile client that may be offline.
 */
export function loadScoringConfig(): Promise<ScoringConfig> {
  if (inFlight) return inFlight;
  inFlight = fetch(`${API.BASE_URL}/sports/scoring-config`)
    .then((r) => (r.ok ? r.json() : null))
    .then((body) => {
      const data = body?.data;
      if (data?.sports && data?.labels) {
        config = {
          sports: { ...SEED_CONFIG.sports, ...data.sports },
          labels: { ...SEED_CONFIG.labels, ...data.labels },
          defaultScoringType: data.defaultScoringType || SEED_CONFIG.defaultScoringType,
        };
        loaded = true;
      }
      return config;
    })
    .catch(() => config)
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export function isScoringConfigLoaded(): boolean {
  return loaded;
}

/** Resolve a sport's scoring type. Case-insensitive; null when unknown. */
export function getScoringType(sportName?: string | null): string | null {
  if (!sportName) return null;
  const key = Object.keys(config.sports).find(
    (k) => k.toLowerCase() === String(sportName).toLowerCase()
  );
  return key ? config.sports[key] : null;
}

/**
 * Labels for a scoring type. Falls back to the neutral "single" rendering, not
 * to "sets" — inventing a racquet scoreline for an unmapped sport is exactly
 * what §6.1 describes.
 */
export function getLabelsFor(scoringType?: string | null): ResultLabels {
  return (
    (scoringType ? config.labels[scoringType] : undefined) ||
    config.labels[config.defaultScoringType] ||
    config.labels.single
  );
}

export const KNOWN_SCORING_TYPES = ["sets", "time", "innings", "board", "single"];

// Exposed for the drift test.
export const __SEED_CONFIG = SEED_CONFIG;
