import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import TOURNAMENTS from "../../api/tournaments";
import { createEntry, updateEntry } from "../../api/playerHistory";
import { assetUrl } from "../../utils/assetUrl";

const GREEN = "#15A765";
const TEXT_DARK = "#1A181B";
const TEXT_MUTED = "#6B7280";
const FIELD_BG = "#F4F4F5";
const MAX_IMAGES = 5;
const RESULTS = ["Winner", "Runner-up", "Semi-finalist", "Quarter-finalist", "Participated"];

const toISODate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// Module-level on purpose: a component defined inside the screen gets a new
// identity every render, which remounts its TextInput and drops keyboard focus
// after each keystroke.
const Field = ({ label, children, error, hint }) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    {children}
    {!!hint && !error && <Text style={styles.hint}>{hint}</Text>}
    {!!error && <Text style={styles.error}>{error}</Text>}
  </View>
);

/**
 * Add (or edit) one event on the player's history timeline.
 * route.params:
 *   entry  — existing PlayerHistoryEntry → edit mode
 *   source — "signup" when opened from onboarding, otherwise "profile"
 */
const AddHistoryScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const editing = route.params?.entry || null;
  const source = route.params?.source === "signup" ? "signup" : "profile";

  const [name, setName] = useState(editing?.tournamentName || "");
  const [sport, setSport] = useState(editing?.sport || "");
  const [date, setDate] = useState(editing?.eventDate ? new Date(editing.eventDate) : null);
  const [result, setResult] = useState(editing?.result || "");
  const [location, setLocation] = useState(editing?.location || "");
  const [description, setDescription] = useState(editing?.description || "");
  const [keptImages, setKeptImages] = useState(editing?.images || []);
  const [newImages, setNewImages] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const [tournaments, setTournaments] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Tournament list powers the suggestions and the "we'll verify this" hint.
  useEffect(() => {
    if (editing) return;
    axios
      .get(TOURNAMENTS.ENDPOINTS.BASE)
      .then((res) => setTournaments(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, [editing]);

  const titleOf = (t) => t.title || t.name || "";
  const suggestions = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (!q) return [];
    return tournaments.filter((t) => titleOf(t).toLowerCase().includes(q)).slice(0, 5);
  }, [name, tournaments]);
  const matchesKnown = useMemo(
    () => tournaments.some((t) => titleOf(t).trim().toLowerCase() === name.trim().toLowerCase()),
    [name, tournaments]
  );

  const pickImages = async () => {
    const room = MAX_IMAGES - keptImages.length - newImages.length;
    if (room <= 0) {
      Alert.alert("Limit reached", `You can add up to ${MAX_IMAGES} photos.`);
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo library access to add photos.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: room,
    });
    if (res.canceled) return;
    const picked = (res.assets || []).map((a) => ({
      uri: a.uri,
      fileName: a.fileName,
      mimeType: a.mimeType,
    }));
    setNewImages((prev) => [...prev, ...picked].slice(0, MAX_IMAGES - keptImages.length));
  };

  const save = async () => {
    const next = {};
    if (!editing && !name.trim()) next.name = "Tournament or event name is required";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const fields = {
        sport: sport.trim(),
        eventDate: date ? toISODate(date) : undefined,
        result: result.trim(),
        location: location.trim(),
        description: description.trim(),
      };
      if (editing) {
        await updateEntry(editing.id, fields, {
          newImages,
          removeImages: (editing.images || []).filter((p) => !keptImages.includes(p)),
        });
      } else {
        await createEntry({ tournamentName: name.trim(), source, ...fields }, newImages);
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert("Couldn't save", err?.response?.data?.message || err.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={22} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editing ? "Edit history" : "Add to history"}</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }}
          keyboardShouldPersistTaps="handled"
        >
          <Field
            label="Tournament / event"
            error={errors.name}
            hint={
              editing
                ? "The tournament can't be changed after saving."
                : matchesKnown
                ? "Found on Chalo Khelne — we'll check your registration and mark it Verified."
                : "Not on Chalo Khelne? You can still add it; it will show as self-reported."
            }
          >
            <TextInput
              style={[styles.input, editing && styles.inputDisabled, errors.name && styles.inputError]}
              value={name}
              editable={!editing}
              placeholder="e.g. City Open Table Tennis"
              placeholderTextColor="#9CA3AF"
              onChangeText={(t) => {
                setName(t);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
            />
            {!editing && showSuggestions && suggestions.length > 0 && !matchesKnown && (
              <View style={styles.suggestions}>
                {suggestions.map((t) => (
                  <TouchableOpacity
                    key={String(t._id || titleOf(t))}
                    style={styles.suggestionRow}
                    onPress={() => {
                      setName(titleOf(t));
                      setShowSuggestions(false);
                    }}
                  >
                    <Text style={styles.suggestionText}>{titleOf(t)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Field>

          <Field label="Sport">
            <TextInput
              style={styles.input}
              value={sport}
              placeholder="e.g. Table Tennis"
              placeholderTextColor="#9CA3AF"
              onChangeText={setSport}
            />
          </Field>

          <Field label="Date">
            <TouchableOpacity style={[styles.input, styles.dateBtn]} onPress={() => setShowPicker(true)}>
              <Text style={{ color: date ? TEXT_DARK : "#9CA3AF", fontSize: 14 }}>
                {date
                  ? date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
                  : "Select date"}
              </Text>
              <Ionicons name="calendar-outline" size={18} color={TEXT_MUTED} />
            </TouchableOpacity>
          </Field>
          {showPicker && (
            <DateTimePicker
              value={date || new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              maximumDate={new Date()}
              onChange={(_, d) => {
                if (Platform.OS !== "ios") setShowPicker(false);
                if (d) setDate(d);
              }}
            />
          )}
          {showPicker && Platform.OS === "ios" && (
            <TouchableOpacity style={styles.doneBtn} onPress={() => setShowPicker(false)}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          )}

          <Field label="Result / position">
            <View style={styles.resultRow}>
              {RESULTS.map((r) => {
                const active = result.trim().toLowerCase() === r.toLowerCase();
                return (
                  <TouchableOpacity
                    key={r}
                    style={[styles.pill, active && styles.pillActive]}
                    onPress={() => setResult(active ? "" : r)}
                  >
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>{r}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              style={[styles.input, { marginTop: 8 }]}
              value={result}
              placeholder="or type your own"
              placeholderTextColor="#9CA3AF"
              onChangeText={setResult}
            />
          </Field>

          <Field label="Location">
            <TextInput
              style={styles.input}
              value={location}
              placeholder="City / venue"
              placeholderTextColor="#9CA3AF"
              onChangeText={setLocation}
            />
          </Field>

          <Field label="About this event">
            <TextInput
              style={[styles.input, { height: 90, textAlignVertical: "top", paddingTop: 10 }]}
              value={description}
              multiline
              placeholder="How did it go?"
              placeholderTextColor="#9CA3AF"
              onChangeText={setDescription}
            />
          </Field>

          <Field label={`Photos (${keptImages.length + newImages.length}/${MAX_IMAGES})`}>
            <View style={styles.photoGrid}>
              {keptImages.map((p) => (
                <View key={p} style={styles.photoWrap}>
                  <Image source={{ uri: assetUrl(p) }} style={styles.photo} />
                  <TouchableOpacity
                    style={styles.photoRemove}
                    onPress={() => setKeptImages((prev) => prev.filter((x) => x !== p))}
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {newImages.map((img, i) => (
                <View key={img.uri + i} style={styles.photoWrap}>
                  <Image source={{ uri: img.uri }} style={styles.photo} />
                  <TouchableOpacity
                    style={styles.photoRemove}
                    onPress={() => setNewImages((prev) => prev.filter((_, j) => j !== i))}
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {keptImages.length + newImages.length < MAX_IMAGES && (
                <TouchableOpacity style={[styles.photoWrap, styles.photoAdd]} onPress={pickImages}>
                  <Ionicons name="add" size={26} color={GREEN} />
                </TouchableOpacity>
              )}
            </View>
          </Field>

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={save}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: TEXT_DARK },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: TEXT_DARK, marginBottom: 6 },
  hint: { fontSize: 12, color: TEXT_MUTED, marginTop: 4 },
  error: { fontSize: 12, color: "#EF4444", marginTop: 4, fontWeight: "500" },
  input: {
    backgroundColor: FIELD_BG,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
    color: TEXT_DARK,
  },
  inputDisabled: { color: TEXT_MUTED },
  inputError: { borderWidth: 1, borderColor: "#EF4444" },
  dateBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  doneBtn: { alignSelf: "flex-end", paddingVertical: 6, paddingHorizontal: 12, marginBottom: 8 },
  doneText: { color: GREEN, fontWeight: "700" },
  suggestions: {
    marginTop: 6,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  suggestionRow: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  suggestionText: { fontSize: 14, color: TEXT_DARK },
  resultRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillActive: { backgroundColor: GREEN, borderColor: GREEN },
  pillText: { fontSize: 12, color: TEXT_MUTED, fontWeight: "600" },
  pillTextActive: { color: "#fff" },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoWrap: { width: 76, height: 76, borderRadius: 10, overflow: "visible" },
  photo: { width: 76, height: 76, borderRadius: 10, backgroundColor: "#F2F2F2" },
  photoRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  photoAdd: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    marginTop: 8,
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});

export default AddHistoryScreen;
