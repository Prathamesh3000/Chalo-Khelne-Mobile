// One-time DOB + Gender capture before a player can enter the tournament
// booking wizard. Driven by TournamentDetails when the user's profile is
// missing dateOfBirth or sex — required for the category-eligibility check.
//
// Saves via PUT /user/profile/:userId (same endpoint EditPlayerProfileScreen
// uses) and pushes the result into AuthContext via updateUser so the wizard
// reads the fresh values from the next useAuth() call.

import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuth } from "../../context/AuthContext";
import AUTH from "../../api/auth";
import { authFetch } from "../../api/authFetch";

const ACCENT = "#FF6A00";

const formatDDMMYYYY = (d) => {
  if (!d) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

// Minimum self-managed age (Families Policy). Under-13s cannot hold their own
// account — a parent/guardian must create and supervise it. Mirrors the server
// check in authRoutes /register (code UNDER_13_SELF_SIGNUP).
const MIN_SELF_MANAGED_AGE = 13;

const ageFrom = (d) => {
  if (!d) return null;
  const t = new Date();
  let a = t.getFullYear() - d.getFullYear();
  const m = t.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--;
  return a;
};

// `mandatory` turns this into a blocking gate: no close button, no back-out,
// no dismiss-on-backdrop. Used by <DobGate> for accounts that have no DOB at
// all (Google Sign-In, and legacy accounts predating the requirement), which
// are locked out of every age-gated route server-side until this is filled in.
export default function DOBGateModal({ visible, onClose, onSaved, mandatory = false }) {
  const { user, token, updateUser, logout } = useAuth();
  const [blockedUnder13, setBlockedUnder13] = useState(false);

  // Pre-fill from existing user values if the profile only has one of the
  // two fields — saves the player typing what's already there.
  const initialDob = user?.dateOfBirth ? new Date(user.dateOfBirth) : null;
  const initialSex = (user?.sex || "").toLowerCase();

  const [dob, setDob] = useState(initialDob);
  const [sex, setSex] = useState(initialSex);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const onDateChange = (event, selected) => {
    // Android closes itself on dismissal; iOS keeps the picker visible.
    if (Platform.OS === "android") setShowPicker(false);
    if (event?.type === "dismissed") return;
    if (selected) setDob(selected);
  };

  const handleSave = async () => {
    setError("");
    if (!dob) {
      setError("Please select your date of birth.");
      return;
    }
    if (!sex) {
      setError("Please select your gender.");
      return;
    }
    if (dob.getTime() > Date.now()) {
      setError("Date of birth can't be in the future.");
      return;
    }
    // Under-13 cannot hold a self-managed account. Refuse the save and show the
    // parent-managed message rather than storing a DOB that would immediately
    // put the account in a non-compliant state.
    if (ageFrom(dob) < MIN_SELF_MANAGED_AGE) {
      setBlockedUnder13(true);
      return;
    }

    const userId = user?._id || user?.id;
    if (!userId) {
      setError("Couldn't identify your account — please log in again.");
      return;
    }

    setSaving(true);
    try {
      const body = {
        dateOfBirth: dob.toISOString(),
        sex: sex.toLowerCase(),
      };
      const res = await authFetch(AUTH.ENDPOINTS.USER.PROFILE(userId), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || `Save failed (${res.status})`);
      }

      // `requiresDob` is cleared here (not by the caller) so the local user
      // object never sits in a half-updated state where the blocking gate
      // re-evaluates as still-required and flashes back open.
      const next = { ...user, dateOfBirth: body.dateOfBirth, sex: body.sex, requiresDob: false };
      if (updateUser) await updateUser(next);
      onSaved?.(next);
    } catch (e) {
      setError(e.message || "Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      // In mandatory mode the Android hardware back button must not dismiss
      // this — the account is locked until a DOB is supplied.
      onRequestClose={mandatory ? () => {} : onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {blockedUnder13 ? (
            <>
              <View style={styles.header}>
                <Text style={styles.title}>A parent needs to set this up</Text>
              </View>
              <Text style={styles.hint}>
                Players under {MIN_SELF_MANAGED_AGE} can't have their own account. Ask a parent or
                guardian to create one and add you to it, so they can manage your
                activity and safety settings.
              </Text>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => (mandatory ? logout?.() : onClose?.())}
                activeOpacity={0.85}
              >
                <Text style={styles.saveBtnText}>
                  {mandatory ? "Sign out" : "Close"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setBlockedUnder13(false)}
                style={{ paddingVertical: 12, alignItems: "center" }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 13, color: "#666" }}>
                  I entered the wrong date
                </Text>
              </TouchableOpacity>
            </>
          ) : (
          <>
          <View style={styles.header}>
            <Text style={styles.title}>
              {mandatory ? "One last step" : "Before you register"}
            </Text>
            {!mandatory && (
              <TouchableOpacity onPress={onClose} disabled={saving}>
                <Ionicons name="close" size={22} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.hint}>
            {mandatory
              ? "We need your date of birth to keep younger players safe and to show you the right tournament categories. You'll only be asked once."
              : "Tournaments may have age or gender restrictions on categories. We need this once to show you what you're eligible for."}
          </Text>

          <Text style={styles.label}>Date of birth</Text>
          <TouchableOpacity
            style={styles.field}
            onPress={() => setShowPicker(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={18} color="#666" />
            <Text style={[styles.fieldText, !dob && { color: "#9AA0A6" }]}>
              {dob ? formatDDMMYYYY(dob) : "DD/MM/YYYY"}
            </Text>
          </TouchableOpacity>
          {showPicker && (
            <DateTimePicker
              value={dob || new Date(2000, 0, 1)}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              maximumDate={new Date()}
              onChange={onDateChange}
            />
          )}

          <Text style={styles.label}>Gender</Text>
          <View style={styles.genderRow}>
            {[
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
              { value: "other", label: "Other" },
            ].map((opt) => {
              const active = sex === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.genderChip, active && styles.genderChipActive]}
                  onPress={() => setSex(opt.value)}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.genderChipText,
                      active && styles.genderChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveBtnText}>Save & continue</Text>
            )}
          </TouchableOpacity>
          </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  hint: {
    fontSize: 13,
    color: "#5F6368",
    lineHeight: 19,
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3C4043",
    marginTop: 8,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 46,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#FAFAFA",
  },
  fieldText: {
    fontSize: 14,
    color: "#1A1A1A",
  },
  genderRow: {
    flexDirection: "row",
    gap: 8,
  },
  genderChip: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#FAFAFA",
    alignItems: "center",
    justifyContent: "center",
  },
  genderChipActive: {
    borderColor: ACCENT,
    backgroundColor: "rgba(255,106,0,0.08)",
  },
  genderChipText: {
    fontSize: 13,
    color: "#5F6368",
    fontWeight: "600",
  },
  genderChipTextActive: {
    color: ACCENT,
  },
  error: {
    color: "#D32F2F",
    fontSize: 12,
    marginTop: 10,
    fontWeight: "500",
  },
  saveBtn: {
    marginTop: 18,
    height: 48,
    borderRadius: 12,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
