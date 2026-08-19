/**
 * Mobile match result abstraction.
 * Normalizes match data for sport-aware display.
 *
 * Usage:
 *   import { readMatchResult, getScoreDisplay, getResultLabels } from '../utils/matchResultUtils';
 *   const result = readMatchResult(match);
 *   // result.type → "sets" | "time" | "innings" | "single"
 *   // result.player1Score, result.player2Score
 *   // result.labels → { round, score, result }
 *
 * Match objects are deeply nested legacy/polymorphic shapes (server schema has
 * shifted across STEPs), so `match` is intentionally typed loosely; the public
 * return shapes below are what call sites actually consume.
 */

import {
  getScoringType,
  getLabelsFor,
  KNOWN_SCORING_TYPES,
} from "./scoringConfig";

export { getScoringType };

export interface ResultLabels {
  round: string;
  subRound: string | null;
  score: string;
  result: string;
}

export interface MatchWinner {
  // Nullable on purpose: the legacy semifinal schema stores the winner as a
  // plain team-name String with no id at all, and TeamKnockoutMatch stores a
  // TEAM id rather than a player id (§6.2).
  playerId?: string | null;
  playerName?: string | null;
  isTeam?: boolean;
  [key: string]: any;
}

export interface MatchResult {
  type: string;
  completed?: boolean;
  player1Score?: number;
  player2Score?: number;
  winner?: MatchWinner | null;
  details?: any[];
  cricketResult?: any;
  labels: ResultLabels;
  isSetBased?: boolean;
  [key: string]: any;
}

interface MatchResultOpts {
  sportName?: string | null;
}

// §6.1 — the sport→scoringType map and the label table used to be hardcoded
// HERE, and again in the web app, and again on the server; the three had
// drifted (Carrom rendered as "single" on web and "board" here; Foosball was
// unknown to both clients). They now come from the server via
// utils/scoringConfig.ts. Re-inlining either table is how §6.1 comes back.

/**
 * Normalize the winner from any match schema — mirrors the server's
 * utils/matchUtils.js#getWinner, which handles five different shapes:
 *
 *   Match, DirectKnockoutMatch → result.winner.playerId
 *   SuperMatch, KnockoutMatch  → winner.playerId
 *   TeamKnockoutMatch          → winnerId (bare ObjectId, no name)
 *   legacy semifinal           → winner as a plain team-name String
 *
 * Returns null when the match genuinely has no winner yet.
 */
export function resolveWinner(match: any): MatchWinner | null {
  if (!match) return null;

  if (match.result?.winner?.playerId) {
    return {
      playerId: match.result.winner.playerId,
      playerName: match.result.winner.playerName || null,
    };
  }
  if (match.result?.winner && typeof match.result.winner === "object") {
    return match.result.winner;
  }

  if (match.winner?.playerId) {
    return {
      playerId: match.winner.playerId,
      playerName: match.winner.playerName || null,
    };
  }

  // TeamKnockoutMatch — a bare ObjectId ref to the winning TEAM.
  if (match.winnerId) {
    return {
      playerId: match.winnerId,
      playerName: match.winnerTeamName || match.winnerName || null,
      isTeam: true,
    };
  }

  // Legacy semifinal schema — winner is the team name itself.
  if (typeof match.winner === "string" && match.winner) {
    return { playerId: null, playerName: match.winner, isTeam: true };
  }

  return null;
}

/**
 * Read normalized match result from any match object.
 */
export function readMatchResult(match: any, opts: MatchResultOpts = {}): MatchResult | null {
  if (!match) return null;

  // FAST PATH: use pre-computed matchResult if available
  if (match.matchResult && match.matchResult.type) {
    const t = match.matchResult.type;
    return {
      ...match.matchResult,
      labels: getLabelsFor(t),
      isSetBased: t === "sets",
      // Per-sport detail: cricket innings / carrom boards (from the backend
      // matchResult.details), falling back to the raw result/live blocks.
      cricketResult: match.matchResult.cricketResult || match.result?.cricketResult || null,
      details: match.matchResult.details
        || (t === "innings" ? (match.result?.innings || match.liveScore?.innings) : null)
        || (t === "board" ? (match.result?.boards || match.liveScore?.boards) : null)
        || [],
    };
  }

  // LEGACY PATH: extract from old schema fields.
  // STEP 13: prefer denormalized `match.sportName` (populated by
  // MatchFactory._stamp on every match); legacy `sportsType`/`sport`
  // retained for matches created before STEP 9a stamping landed.
  const scoringType = match.matchFormat?.scoringType
    || getScoringType(match.sportName || match.sportsType || match.sport || opts.sportName)
    || "sets";

  const completed = (match.status || "").toUpperCase() === "COMPLETED";

  let p1Score = 0, p2Score = 0;

  if (match.result?.finalScore) {
    p1Score = match.result.finalScore.player1Sets || 0;
    p2Score = match.result.finalScore.player2Sets || 0;
  } else if (match.score) {
    p1Score = match.score.player1Sets || 0;
    p2Score = match.score.player2Sets || 0;
  } else if (match.setsWon) {
    p1Score = match.setsWon.home || 0;
    p2Score = match.setsWon.away || 0;
  }

  // §6.2 — resolve the winner from every shape the server can store. See the
  // resolveWinner docblock; this used to handle only two of five shapes and
  // rendered no winner for a completed team knockout.
  const winner: MatchWinner | null = resolveWinner(match);

  // Per-sport detail for rich display (cricket innings / carrom boards / sets).
  let details: any[] = [];
  if (scoringType === "innings") details = match.result?.innings || match.liveScore?.innings || [];
  else if (scoringType === "board") details = match.result?.boards || match.liveScore?.boards || [];
  else details = match.sets || [];

  return {
    type: scoringType,
    completed,
    player1Score: p1Score,
    player2Score: p2Score,
    winner,
    details,
    cricketResult: match.result?.cricketResult || null,
    labels: getLabelsFor(scoringType),
    isSetBased: scoringType === "sets",
  };
}

/**
 * Find a cricket innings for a given side ("player1"/"player2") from details.
 */
function _inningsFor(details: any[] | undefined, side: string): any {
  return (details || []).find((i) => i.battingSide === side) || null;
}

/**
 * Format a single cricket innings as "154/6 (20.0)".
 */
function formatInnings(inn: any): string {
  if (!inn) return "–";
  const overs = inn.overs != null ? ` (${inn.overs})`
    : (inn.oversBowled != null ? ` (${inn.oversBowled}.${inn.ballsBowled || 0})` : "");
  return `${inn.runs ?? 0}/${inn.wickets ?? 0}${overs}`;
}

/**
 * Sport-aware one-line score string for cards/lists. Examples:
 *   cricket  → "154/6 (20.0)  vs  150/8 (20.0)"
 *   sets     → "3 - 1"
 *   board    → "2 - 1 boards"
 *   single   → "1 - 0" / "½ - ½ (draw)" / winner name
 *   time     → "2 - 1"
 */
export function getScoreDisplay(match: any, opts: MatchResultOpts = {}): string {
  const r = readMatchResult(match, opts);
  if (!r) return "-";
  const completed = r.completed || (match?.status || "").toUpperCase() === "COMPLETED";

  if (r.type === "innings") {
    const i1 = _inningsFor(r.details, "player1");
    const i2 = _inningsFor(r.details, "player2");
    if (i1 || i2) return `${formatInnings(i1)}  vs  ${formatInnings(i2)}`;
    return completed ? `${r.player1Score} - ${r.player2Score}` : "Yet to bat";
  }

  if (r.type === "board") {
    return `${r.player1Score} - ${r.player2Score} boards`;
  }

  if (r.type === "single") {
    if (!completed) return "vs";
    const w = r.winner;
    const isDraw = !w || (!w.playerId && !w.playerName);
    if (isDraw) return "½ - ½ (draw)";
    return w.playerName ? `${w.playerName} won` : "Decided";
  }

  // sets / time
  return `${r.player1Score} - ${r.player2Score}`;
}

/**
 * Sport-specific one-line summary for a completed match card. Each sport reads
 * in its OWN format — never a generic "1-0":
 *   cricket → "omkar won by 10 runs"  /  "...by 4 wkts"
 *   sets    → "21-18, 19-21, 21-16"   (set-by-set)
 *   board   → "won 2-1 boards"
 *   single  → "White won" / "Match drawn"
 */
export function getMatchSummaryLine(match: any, opts: MatchResultOpts = {}): string {
  const r = readMatchResult(match, opts);
  if (!r) return "";
  const completed = r.completed || (match?.status || "").toUpperCase() === "COMPLETED";
  if (!completed) return "";
  const wname = r.winner?.playerName || "Winner";

  if (r.type === "innings") {
    const cr = r.cricketResult;
    if (cr?.isTie) return "Match tied";
    if (cr?.marginType === "wickets") return `${wname} won by ${cr.marginValue} wkts`;
    if (cr?.marginType === "runs") return `${wname} won by ${cr.marginValue} runs`;
    const i1 = (r.details || []).find((i) => i.battingSide === "player1");
    const i2 = (r.details || []).find((i) => i.battingSide === "player2");
    if (i1 && i2) return `${wname} won by ${Math.abs((i1.runs || 0) - (i2.runs || 0))} runs`;
    return `${wname} won`;
  }

  if (r.type === "sets") {
    const scores = (r.details || [])
      .map((s) => {
        const g = (s.subRounds && s.subRounds[0]) || (s.games && s.games[0]?.finalScore) || null;
        if (!g) return null;
        const a = g.player1Score ?? g.player1;
        const b = g.player2Score ?? g.player2;
        return (a == null && b == null) ? null : `${a ?? 0}-${b ?? 0}`;
      })
      .filter(Boolean)
      .join(", ");
    return scores || (r.winner?.playerName ? `${wname} won ${r.player1Score}-${r.player2Score}` : "");
  }

  if (r.type === "board") {
    return `${wname} won ${r.player1Score}-${r.player2Score} boards`;
  }

  if (r.type === "single") {
    const isDraw = !r.winner || (!r.winner.playerId && !r.winner.playerName);
    return isDraw ? "Match drawn" : `${wname} won`;
  }
  return "";
}

/**
 * Per-side score cell for two-column match layouts (player1 | VS | player2).
 *   cricket → "150/6"   sets/board → sets/boards won   chess → "1" / "½"
 */
export function getSideDisplay(match: any, side: string, opts: MatchResultOpts = {}): string {
  const r = readMatchResult(match, opts);
  if (!r) return "0";
  if (r.type === "innings") {
    const inn = (r.details || []).find((i) => i.battingSide === side);
    return inn ? `${inn.runs ?? 0}/${inn.wickets ?? 0}` : "–";
  }
  if (r.type === "single") {
    const isDraw = r.completed && (!r.winner || (!r.winner.playerId && !r.winner.playerName));
    if (isDraw) return "½";
  }
  return String(side === "player1" ? (r.player1Score ?? 0) : (r.player2Score ?? 0));
}

/**
 * Get sport-appropriate label for the "current period" indicator.
 * E.g., "Set 2, Game 3" for TT, "Period 1" for Football, "Innings 1" for Cricket
 */
export function getLiveLabel(match: any, opts: MatchResultOpts = {}): string {
  const r = readMatchResult(match, opts);
  if (!r) return "";

  const currentSet = match.currentSet || 1;
  const currentGame = match.currentGame || 1;

  switch (r.type) {
    case "sets":
      return `${r.labels.round} ${currentSet}, ${r.labels.subRound} ${currentGame}`;
    case "time":
      return `${r.labels.round} ${currentSet}`;
    case "innings":
      return `${r.labels.round} ${currentSet}`;
    case "board":
      return `${r.labels.round} ${(match.liveScore?.boards?.length || 0) + 1}`;
    case "single":
      return r.labels.round;
    default:
      return `Round ${currentSet}`;
  }
}

/**
 * Get labels for a sport.
 */
export function getResultLabels(sportNameOrType?: string | null): ResultLabels {
  // Accepts either a scoring type ("board") or a sport name ("Carrom").
  // An unknown sport falls back to the neutral "single" rendering, never to
  // "sets" — that fallback is what gave a Foosball match racquet headings.
  if (sportNameOrType && KNOWN_SCORING_TYPES.includes(sportNameOrType)) {
    return getLabelsFor(sportNameOrType);
  }
  return getLabelsFor(getScoringType(sportNameOrType));
}
