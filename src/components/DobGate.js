// Families Policy: blocking date-of-birth gate.
//
// Renders a non-dismissible DOB prompt over the whole app whenever the signed-in
// account has no known age. Two populations land here:
//
//   1. Google Sign-In accounts — Google never returns a birthday, so the server
//      creates them with `dobRequired: true` and returns `user.requiresDob`.
//   2. Legacy accounts created before DOB was mandatory (~70% of Player /
//      Trainer / Referee accounts as of 2026-08-05).
//
// Both are blocked server-side from every age-gated route once
// ENFORCE_DOB_GATE=true (see server/middleware/requireDob.js). This screen is
// the only way for them to resolve it, so it MUST ship before that flag flips.
//
// Note: PUT /user/profile/:id (which the modal saves through) is deliberately
// NOT behind the age gate — otherwise the user could never escape it.
import React from "react";
import { useAuth } from "../context/AuthContext";
import DOBGateModal from "../screens/player/DOBGateModal";

// Must match server User.AGE_GATED_ROLES. Business/admin roles (ClubAdmin,
// Manager, corporate_admin, …) are onboarded without a DOB by design.
const AGE_GATED_ROLES = ["Player", "Trainer", "Referee"];

export function needsDob(user) {
  if (!user) return false;
  if (!AGE_GATED_ROLES.includes(user.role)) return false;
  // Server's explicit signal wins; fall back to the raw field so accounts
  // restored from storage (which predate the flag) are still caught.
  if (user.requiresDob === true) return true;
  return !user.dateOfBirth;
}

export default function DobGate() {
  const { user, isAuthenticated } = useAuth();

  const show = isAuthenticated && needsDob(user);
  if (!show) return null;

  // No onSaved handler needed — DOBGateModal persists the DOB, clears
  // `requiresDob` on the local user, and pushes it through updateUser, which
  // re-renders this component with `needsDob` false and unmounts the gate.
  return <DOBGateModal visible mandatory />;
}
