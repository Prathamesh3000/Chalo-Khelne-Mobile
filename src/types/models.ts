/**
 * Domain models — the shape of the core entities the app reads from the backend.
 *
 * Phase 2 (TypeScript, leaf-inward) foundation: define these ONCE so the api/,
 * hooks/ and screens layers share a single source of truth instead of each
 * screen re-inferring fields. Fields the backend returns inconsistently are
 * marked optional on purpose — tighten them as each flow is converted and its
 * real payload is confirmed. Do not over-constrain ahead of evidence.
 */

/** Mongo ObjectId, serialized as a string over the wire. */
export type ID = string;
/** ISO-8601 timestamp string (e.g. "2026-07-07T10:00:00.000Z"). */
export type ISODateString = string;
/** "YYYY-MM-DD" calendar date string. */
export type DateString = string;

export type UserRole =
  | "Player" | "Manager" | "ClubAdmin" | "club_admin" | "corporate_admin"
  | "Trainer" | "AgencyAdmin" | "SuperAdmin" | "vendor" | (string & {});

export interface User {
  _id: ID;
  name: string;
  email?: string;
  mobile?: string;
  role: UserRole;
  clubName?: string;
  clubId?: ID | null;
  profileImage?: string;
  followers?: ID[];
  following?: ID[];
}

export interface Sport {
  _id: ID;
  name: string;
  scoringType?: "sets" | "innings" | "time" | "single" | "board" | "custom";
  isTeamSport?: boolean;
  icon?: string;
}

/** A registration/booking against a tournament (backend BookingModel). */
export interface Booking {
  _id: ID;
  userId?: ID | null;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  tournamentId: ID;
  tournamentName?: string;
  tournamentType?: string;
  status: "pending" | "confirmed" | "cancelled";
  paymentStatus?: "pending" | "paid" | "waived";
  paymentAmount?: number;
  paymentMethod?: "cash" | "online";
  team?: {
    name?: string;
    captain?: { name?: string; id?: string };
    players?: { name?: string; id?: string }[];
  };
  sportSelections?: { sportId: ID; sportName?: string; categoryName?: string; fee?: number }[];
  totalFee?: number;
  createdAt?: ISODateString;
}

export interface Tournament {
  _id: ID;
  title: string;
  tournamentType?: string;
  managerId?: ID[];
  clubId?: ID;
  sports?: { sportId: ID; sportName?: string; type?: string; categories?: unknown[] }[];
  status?: string;
  startDate?: ISODateString;
  endDate?: ISODateString;
  registrationDeadline?: ISODateString;
  bannerImage?: string;
  location?: string;
}

export interface Turf {
  _id: ID;
  name: string;
  owner?: ID;
  clubId?: ID | null;
  images?: string[];
  address?: { fullAddress?: string; area?: string; city?: string; pincode?: string };
  sports?: { name: string; pricePerHour?: number; category?: "indoor" | "outdoor" }[];
  isActive?: boolean;
  isApproved?: boolean;
}

export interface TurfBooking {
  _id: ID;
  userId?: ID;
  turfId: ID;
  sportName?: string;
  date: DateString;
  timeSlot?: string;
  status?: string;
  paymentStatus?: string;
  amount?: number;
}

/** Store / equipment marketplace listing (backend EquipmentListing). */
export interface Listing {
  _id: ID;
  name: string;
  price?: number;
  category?: string;
  brand?: string;
  condition?: string;
  images?: string[];
  sellerId?: ID;
  sellUnit?: "single" | "pack";
  packSize?: number;
  status?: string;
}

export interface Story {
  _id: ID;
  userId: ID | User;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  createdAt?: ISODateString;
  expiresAt?: ISODateString;
  viewers?: ID[];
}

export interface Post {
  _id: ID;
  userId: ID | User;
  caption?: string;
  images?: string[];
  likes?: ID[];
  commentsCount?: number;
  createdAt?: ISODateString;
}

export interface JobPosting {
  _id: ID;
  title: string;
  description?: string;
  postedBy?: ID;
  sport?: string;
  location?: string;
  payRange?: string;
  status?: string;
  createdAt?: ISODateString;
}

export interface PlayerStats {
  userId: ID;
  sport?: string;
  matchesPlayed?: number;
  wins?: number;
  losses?: number;
  points?: number;
  ranking?: number;
}

export interface AppNotification {
  _id: ID;
  type?: string;
  title?: string;
  message?: string;
  read?: boolean;
  data?: Record<string, unknown>;
  createdAt?: ISODateString;
}
