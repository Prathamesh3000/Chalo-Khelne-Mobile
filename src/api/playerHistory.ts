// api/playerHistory.ts — player history timeline (backend: /api/player-history).
// The global axios interceptor attaches the live auth token, so calls here only
// set Content-Type where a body needs it.
import axios from "axios";
import API from "./api";

const BASE = `${(API as { BASE_URL: string }).BASE_URL}/player-history`;

export type HistoryStatus = "active" | "pending" | "rejected";
export type HistorySource = "signup" | "profile" | "post" | "tagged";

/** Another player with an active entry for the same post (approved tags only). */
export interface HistoryTeammate {
  id: string;
  name: string;
  /** Raw upload path or absolute URL — pass to <Avatar uri>. */
  avatar: string | null;
}

export interface PlayerHistoryEntry {
  id: string;
  user: string;
  status: HistoryStatus;
  source: HistorySource;
  tournamentName: string;
  tournamentId: string | null;
  sport: string | null;
  eventDate: string | null;
  result: string | null;
  location: string | null;
  description: string | null;
  /** Paths relative to the uploads dir — resolve with assetUrl(). */
  images: string[];
  /** Server-computed: registered / on the roster of the real tournament. */
  verified: boolean;
  postId: string | null;
  taggedBy: { id: string; name?: string } | null;
  createdAt: string;
  /** Only sent by the timeline list; absent on create/update/pending responses. */
  teammates?: HistoryTeammate[];
}

/** A photo chosen with expo-image-picker (only uri is required). */
export interface PickedImage {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}

export interface HistoryFields {
  tournamentName: string;
  sport?: string;
  /** ISO date string (YYYY-MM-DD). */
  eventDate?: string;
  result?: string;
  location?: string;
  description?: string;
  /** "signup" while onboarding, otherwise "profile". */
  source?: "signup" | "profile";
}

const ENDPOINTS = {
  BASE,
  USER: (userId: string) => `${BASE}/user/${userId}`,
  PENDING: `${BASE}/pending`,
  SETTINGS: `${BASE}/settings`,
  BY_ID: (id: string) => `${BASE}/${id}`,
  APPROVE: (id: string) => `${BASE}/${id}/approve`,
  REJECT: (id: string) => `${BASE}/${id}/reject`,
  // Used for tagging players in a post (same search the follow screens use).
  PLAYER_SEARCH: (q: string) =>
    `${(API as { BASE_URL: string }).BASE_URL}/follow/search?q=${encodeURIComponent(q)}`,
};

/** RN's FormData takes { uri, name, type } objects for files. */
export function imagePart(img: PickedImage, index = 0) {
  const name = img.fileName || img.uri.split("/").pop() || `photo-${Date.now()}-${index}.jpg`;
  const ext = (name.split(".").pop() || "jpg").toLowerCase();
  const type =
    img.mimeType ||
    (ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "gif" ? "image/gif" : "image/jpeg");
  return { uri: img.uri, name, type };
}

function toForm(
  fields: Record<string, string | undefined>,
  images: PickedImage[],
  imageField: string,
  extra?: Record<string, string[]>
): FormData {
  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") form.append(k, v);
  });
  Object.entries(extra || {}).forEach(([k, list]) => list.forEach((v) => form.append(k, v)));
  images.forEach((img, i) =>
    // RN's FormData accepts the { uri, name, type } shape; the DOM typings don't.
    form.append(imageField, imagePart(img, i) as unknown as Blob)
  );
  return form;
}

const MULTIPART = { headers: { "Content-Type": "multipart/form-data" } };

export type HistoryVisibility = "public" | "followers" | "private";

export const VISIBILITY_LABELS: Record<HistoryVisibility, string> = {
  public: "Everyone",
  followers: "Followers only",
  private: "Only me",
};

export interface TimelineResult {
  entries: PlayerHistoryEntry[];
  /** Set when the owner's privacy setting hides the timeline from this viewer. */
  restricted: HistoryVisibility | null;
}

export async function fetchTimelineResult(userId: string): Promise<TimelineResult> {
  const res = await axios.get(ENDPOINTS.USER(userId));
  return { entries: res.data?.entries || [], restricted: res.data?.restricted || null };
}

export async function fetchTimeline(userId: string): Promise<PlayerHistoryEntry[]> {
  return (await fetchTimelineResult(userId)).entries;
}

export async function fetchVisibility(): Promise<HistoryVisibility> {
  const res = await axios.get(ENDPOINTS.SETTINGS);
  return res.data?.visibility || "public";
}

export async function saveVisibility(visibility: HistoryVisibility): Promise<HistoryVisibility> {
  const res = await axios.put(ENDPOINTS.SETTINGS, { visibility });
  return res.data.visibility;
}

export async function fetchPending(): Promise<PlayerHistoryEntry[]> {
  const res = await axios.get(ENDPOINTS.PENDING);
  return res.data?.entries || [];
}

export async function createEntry(
  fields: HistoryFields,
  images: PickedImage[] = []
): Promise<PlayerHistoryEntry> {
  const form = toForm({ ...fields }, images, "historyImages");
  const res = await axios.post(ENDPOINTS.BASE, form, MULTIPART);
  return res.data.entry;
}

export async function updateEntry(
  id: string,
  fields: Partial<Omit<HistoryFields, "tournamentName" | "source">>,
  opts: { newImages?: PickedImage[]; removeImages?: string[] } = {}
): Promise<PlayerHistoryEntry> {
  const form = toForm({ ...fields }, opts.newImages || [], "historyImages", {
    removeImages: opts.removeImages || [],
  });
  const res = await axios.patch(ENDPOINTS.BY_ID(id), form, MULTIPART);
  return res.data.entry;
}

export async function deleteEntry(id: string): Promise<void> {
  await axios.delete(ENDPOINTS.BY_ID(id));
}

export async function decideEntry(id: string, approve: boolean): Promise<PlayerHistoryEntry> {
  const res = await axios.post(approve ? ENDPOINTS.APPROVE(id) : ENDPOINTS.REJECT(id));
  return res.data.entry;
}

export interface PlayerHit {
  _id: string;
  name: string;
  profileImage?: string | null;
}

export async function searchPlayers(q: string): Promise<PlayerHit[]> {
  if (q.trim().length < 2) return [];
  const res = await axios.get(ENDPOINTS.PLAYER_SEARCH(q.trim()));
  return res.data?.users || [];
}

/** Build the multipart body for POST /api/posts when photos/tags/date are used. */
export function buildPostForm(args: {
  tournamentName: string;
  caption: string;
  location?: string;
  link?: string;
  eventDate?: string;
  tags: string[];
  taggedUserIds: string[];
  images: PickedImage[];
}): FormData {
  return toForm(
    {
      tournamentName: args.tournamentName,
      caption: args.caption,
      location: args.location,
      link: args.link,
      eventDate: args.eventDate,
    },
    args.images,
    "postImages",
    { tags: args.tags, taggedUserIds: args.taggedUserIds }
  );
}

export default { BASE_URL: BASE, ENDPOINTS };
