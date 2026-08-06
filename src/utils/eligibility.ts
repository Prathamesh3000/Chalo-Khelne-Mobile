// Client-side mirror of server/utils/eligibility.js — same rules, same
// reasons. The server is the authoritative gate at POST /bookings/create;
// this version only powers the UI grey-out so players see why a category
// is locked before they even tap.

const GENDER_LABELS: Record<string, string> = { male: "Male", female: "Female" };

interface EligibilityUser {
  sex?: string | null;
  gender?: string | null;
  dateOfBirth?: string | Date | null;
  dob?: string | Date | null;
}

interface EligibilityCategory {
  gender?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
}

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
}

function parseTournamentDate(raw: string | Date | null | undefined): Date | null {
  if (!raw) return null;
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw;

  const s = String(raw).trim();
  const native = new Date(s);
  if (!Number.isNaN(native.getTime())) return native;

  // Fallback: DD-MM-YYYY or DD/MM/YYYY.
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    if (!Number.isNaN(d.getTime())) return d;
  }

  return null;
}

function ageOn(referenceDate: Date, dob: Date): number {
  let age = referenceDate.getFullYear() - dob.getFullYear();
  const md = referenceDate.getMonth() - dob.getMonth();
  if (md < 0 || (md === 0 && referenceDate.getDate() < dob.getDate())) age--;
  return age;
}

export function eligibilityFor(
  user: EligibilityUser | null | undefined,
  category: EligibilityCategory | null | undefined,
  tournamentStartDate: string | Date | null | undefined
): EligibilityResult {
  const categoryGender = (category?.gender || "any").toLowerCase();
  const userGender = (user?.sex || user?.gender || "").toLowerCase();

  if (categoryGender !== "any") {
    if (!userGender) {
      return { eligible: false, reason: "Set gender in your profile" };
    }
    if (userGender !== categoryGender) {
      return {
        eligible: false,
        reason: `${GENDER_LABELS[categoryGender]} players only`,
      };
    }
  }

  const hasAgeBound =
    (category?.minAge !== null && category?.minAge !== undefined) ||
    (category?.maxAge !== null && category?.maxAge !== undefined);

  if (!hasAgeBound) return { eligible: true };

  const dobRaw = user?.dateOfBirth || user?.dob;
  if (!dobRaw) return { eligible: false, reason: "Add date of birth" };

  const dob = dobRaw instanceof Date ? dobRaw : new Date(dobRaw);
  if (Number.isNaN(dob.getTime())) {
    return { eligible: false, reason: "Date of birth is invalid" };
  }

  const tStart = parseTournamentDate(tournamentStartDate);
  // If tournament start date is unparseable on the client, fail OPEN: the
  // server gate will still reject. Showing "ineligible" for a config bug
  // confuses the player.
  if (!tStart) return { eligible: true };

  const playerAge = ageOn(tStart, dob);
  if (category?.minAge != null && playerAge < category.minAge) {
    return { eligible: false, reason: `Minimum age is ${category.minAge}` };
  }
  if (category?.maxAge != null && playerAge > category.maxAge) {
    return { eligible: false, reason: `Maximum age is ${category.maxAge}` };
  }
  return { eligible: true };
}
