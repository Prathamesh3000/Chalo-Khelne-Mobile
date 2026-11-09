import React, { useState, useEffect, useRef } from "react";
import { Keyboard } from "react-native";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { buildPostForm, searchPlayers } from "../../api/playerHistory";
import { useAuth } from "../../context/AuthContext";
import POSTS from "../../api/posts"; // Import the posts API client
import TOURNAMENTS from "../../api/tournaments"; // Import the tournaments API client
import API from "../../api/api"; // Import the main API client
import { useNavigation } from "@react-navigation/native";

const AddPopUpModal = ({
  visible,
  onClose,
  selectedSports = [],
  setSelectedSports,
  onPostCreated,
}) => {
  const [formData, setFormData] = useState({
    tournamentName: "",
    bio: "",
    tag: "",
    location: "",
    link: "",
  });
  const [tournaments, setTournaments] = useState([]);
  const [filteredTournaments, setFilteredTournaments] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [tournamentsLoading, setTournamentsLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const [errors, setErrors] = useState({});
  const isSelectingSuggestionRef = useRef(false);

  // Timeline extras: when the match happened, who played, and photos.
  const MAX_POST_IMAGES = 5;
  const [eventDate, setEventDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [images, setImages] = useState([]);
  const [taggedPlayers, setTaggedPlayers] = useState([]);
  const [tagQuery, setTagQuery] = useState("");
  const [tagResults, setTagResults] = useState([]);
  const tagSearchSeq = useRef(0);

  const navigation = useNavigation()

  const [loading, setLoading] = useState(false);
  const { token, isAuthenticated } = useAuth();

  // Reset form data when modal is opened
  useEffect(() => {
    if (visible) {
      setFormData({
        tournamentName: "",
        bio: "",
        tag: "",
        location: "",
        link: "",
      });
      setEventDate(null);
      setImages([]);
      setTaggedPlayers([]);
      setTagQuery("");
      setTagResults([]);
    }
  }, [visible]);

  const pickImages = async () => {
    const room = MAX_POST_IMAGES - images.length;
    if (room <= 0) return;
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
    setImages((prev) => [...prev, ...picked].slice(0, MAX_POST_IMAGES));
  };

  // Debounce-free but race-safe: only the latest query's results are kept.
  const handleTagQuery = async (text) => {
    setTagQuery(text);
    const seq = ++tagSearchSeq.current;
    if (text.trim().length < 2) {
      setTagResults([]);
      return;
    }
    try {
      const hits = await searchPlayers(text);
      if (seq === tagSearchSeq.current) {
        setTagResults(hits.filter((h) => !taggedPlayers.some((t) => t._id === h._id)));
      }
    } catch {
      if (seq === tagSearchSeq.current) setTagResults([]);
    }
  };

  const addTagged = (player) => {
    setTaggedPlayers((prev) => [...prev, player]);
    setTagQuery("");
    setTagResults([]);
  };

  const isoDate = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // Fetch tournaments when component mounts
  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      setTournamentsLoading(true);
      const response = await axios.get(TOURNAMENTS.ENDPOINTS.BASE);
      const tournamentsData = response.data || [];
      setTournaments(tournamentsData);
      setFilteredTournaments(tournamentsData);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
    } finally {
      setTournamentsLoading(false);
    }
  };

  // Fetch users for mentions
  const fetchUsersForMentions = async (query) => {
    if (query.length < 2) {
      setFilteredUsers([]);
      return;
    }

    try {
      const response = await axios.get(API.ENDPOINTS.USER.SEARCH(query), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const usersData = response.data || [];
      setFilteredUsers(usersData);
    } catch (error) {
      console.error("Error fetching users for mentions:", error);
    }
  };

  const handleTournamentSelect = (tournament) => {
    isSelectingSuggestionRef.current = true;

    Keyboard.dismiss(); // ✅ critical fix

    setFormData((prev) => ({
      ...prev,
      tournamentName: tournament.title || tournament.name || "",
      bio: tournament.description || "",
      location: tournament.eventLocation || tournament.location || "",
    }));

    requestAnimationFrame(() => {
      setShowSuggestions(false);
      isSelectingSuggestionRef.current = false;
    });
  };

  const handleInputChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value,
    });

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Handle tournament name filtering
    if (field === "tournamentName") {
      if (value.length > 0) {
        const filtered = tournaments.filter(tournament =>
          tournament.title?.toLowerCase().includes(value.toLowerCase()) ||
          tournament.name?.toLowerCase().includes(value.toLowerCase())
        );
        setFilteredTournaments(filtered);
        setShowSuggestions(true);
      } else {
        setFilteredTournaments(tournaments);
        setShowSuggestions(false);
      }
    }

    // Handle user mentions in bio field
    if (field === "bio") {
      // Check if the user is typing after an @ symbol
      const lastAtIndex = value.lastIndexOf('@');
      const lastSpaceIndex = value.lastIndexOf(' ', lastAtIndex);

      // If there's an @ and it's not preceded by a non-space character
      if (lastAtIndex !== -1 && (lastSpaceIndex === lastAtIndex - 1 || lastAtIndex === 0)) {
        const query = value.substring(lastAtIndex + 1);
        if (query.length >= 2) {
          fetchUsersForMentions(query);
          setShowUserSuggestions(true);
        } else {
          setShowUserSuggestions(false);
        }
      } else {
        setShowUserSuggestions(false);
      }
    }
  };

  const handleSubmit = async () => {
    try {
      const newErrors = {};
      if (!formData.tournamentName.trim()) newErrors.tournamentName = "Tournament Name is required";
      if (!formData.bio.trim()) newErrors.bio = "Bio is required";
      if (!formData.link.trim()) newErrors.link = "Link is required";

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      setLoading(true);

      // Ensure valid token (context is source of truth; global axios
      // interceptor attaches the live token on the request itself).
      const authToken = token;
      if (!isAuthenticated || !authToken) {
        Alert.alert("Authentication Required", "Please sign in to create a post");
        setLoading(false);
        return;
      }

      const tagsArray = formData.tag
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag);

      const taggedUserIds = taggedPlayers.map((p) => p._id);
      const eventDateStr = eventDate ? isoDate(eventDate) : undefined;

      // Photos need multipart; without them keep the original JSON request.
      const response =
        images.length > 0
          ? await axios.post(
              POSTS.ENDPOINTS.CREATE,
              buildPostForm({
                tournamentName: formData.tournamentName,
                caption: formData.bio,
                location: formData.location,
                link: formData.link,
                eventDate: eventDateStr,
                tags: tagsArray,
                taggedUserIds,
                images,
              }),
              {
                headers: {
                  Authorization: `Bearer ${authToken}`,
                  "Content-Type": "multipart/form-data",
                },
              }
            )
          : await axios.post(
              POSTS.ENDPOINTS.CREATE,
              {
                tournamentName: formData.tournamentName,
                caption: formData.bio,
                tags: tagsArray,
                taggedUserIds,
                eventDate: eventDateStr,
                location: formData.location,
                link: formData.link,
              },
              {
                headers: {
                  Authorization: `Bearer ${authToken}`,
                  "Content-Type": "application/json",
                },
              }
            );

      Alert.alert("Success", "Post created successfully");

      if (response.data) {
        navigation.navigate("Social", { refresh: true });
      }

      onClose();
    } catch (error) {
      console.error("Full error object:", error);

      let errorMessage = "Failed to create post";
      if (error.response) {
        errorMessage = error.response.data.message || errorMessage;

        if (error.response.status === 401) {
          errorMessage = "Session expired. Please login again.";
        } else if (error.response.status === 404) {
          errorMessage =
            "API endpoint not found. Please check server configuration.";
        }
      }
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };


  const inputFields = [
    { label: "Tournament Name / League", field: "tournamentName", hasSuggestions: true },
    { label: "Bio", field: "bio", multiline: true, height: 80 },
    { label: "Tags (comma separated)", field: "tag" },
    { label: "Location", field: "location" },
    { label: "Link (Required)", field: "link" },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <MaterialIcons name="close" size={24} color="#000" />
        </TouchableOpacity>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalContainer}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.heading}>Add Post</Text>

            {inputFields.map(({ label, field, multiline, height, hasSuggestions }, index) => (
              <View key={index} style={styles.inputWrapper}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  placeholder={`Enter ${label}`}
                  style={[
                    styles.input,
                    errors[field] && styles.errorInput,
                    multiline && {
                      height: height || 80,
                      textAlignVertical: "top",
                    },
                  ]}
                  placeholderTextColor="#666"
                  value={formData[field]}
                  onChangeText={(text) => handleInputChange(field, text)}
                  multiline={multiline}
                  numberOfLines={multiline ? 4 : 1}
                  onFocus={() => {
                    if (field === "tournamentName") {
                      setShowSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    if (field === "tournamentName") {
                      requestAnimationFrame(() => {
                        if (!isSelectingSuggestionRef.current) {
                          setShowSuggestions(false);
                        }
                      });
                    }
                  }}
                />
                {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
                {/* Tournament Suggestions Dropdown */}
                {hasSuggestions && showSuggestions && (
                  <ScrollView
                    style={styles.suggestionsContainer}
                    keyboardShouldPersistTaps="handled"
                  >
                    {filteredTournaments.slice(0, 5).map((tournament, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.suggestionItem}
                        onPress={() => handleTournamentSelect(tournament)}
                      >
                        <Text style={styles.suggestionText}>
                          {tournament.title || tournament.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {filteredTournaments.length === 0 && !tournamentsLoading && (
                      <Text style={styles.noSuggestionsText}>No tournaments found</Text>
                    )}
                  </ScrollView>
                )}
              </View>
            ))}

            {/* When it happened — shown on your history timeline */}
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Match / event date</Text>
              <TouchableOpacity
                style={[styles.input, styles.dateRow]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{ color: eventDate ? "#333" : "#666", fontSize: 14 }}>
                  {eventDate
                    ? eventDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
                    : "Select date (optional)"}
                </Text>
                <MaterialIcons name="event" size={18} color="#666" />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={eventDate || new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  maximumDate={new Date()}
                  onChange={(_, d) => {
                    if (Platform.OS !== "ios") setShowDatePicker(false);
                    if (d) setEventDate(d);
                  }}
                />
              )}
              {showDatePicker && Platform.OS === "ios" && (
                <TouchableOpacity style={styles.dateDone} onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.dateDoneText}>Done</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Tag the players you played with — they approve it onto their own history */}
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Tag players</Text>
              <TextInput
                placeholder="Search players by name"
                placeholderTextColor="#666"
                style={styles.input}
                value={tagQuery}
                onChangeText={handleTagQuery}
                autoCapitalize="none"
              />
              {tagResults.length > 0 && (
                <View style={styles.tagResults}>
                  {tagResults.slice(0, 5).map((p) => (
                    <TouchableOpacity key={p._id} style={styles.suggestionItem} onPress={() => addTagged(p)}>
                      <Text style={styles.suggestionText}>{p.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {taggedPlayers.length > 0 && (
                <View style={styles.tagChips}>
                  {taggedPlayers.map((p) => (
                    <View key={p._id} style={styles.tagChip}>
                      <Text style={styles.tagChipText}>{p.name}</Text>
                      <TouchableOpacity
                        onPress={() => setTaggedPlayers((prev) => prev.filter((t) => t._id !== p._id))}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <MaterialIcons name="close" size={14} color="#666" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Photos */}
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>
                Photos ({images.length}/{MAX_POST_IMAGES})
              </Text>
              <View style={styles.photoGrid}>
                {images.map((img, i) => (
                  <View key={img.uri + i} style={styles.photoWrap}>
                    <Image source={{ uri: img.uri }} style={styles.photo} />
                    <TouchableOpacity
                      style={styles.photoRemove}
                      onPress={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                    >
                      <MaterialIcons name="close" size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                {images.length < MAX_POST_IMAGES && (
                  <TouchableOpacity style={[styles.photoWrap, styles.photoAdd]} onPress={pickImages}>
                    <MaterialIcons name="add" size={26} color="#ff6A00" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.disabledBtn]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitText}>Post</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  closeButton: {
    position: "absolute",
    top: "8%",
    right: "5%",
    backgroundColor: "#F1F1F1",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    zIndex: 10,
  },
  modalContainer: {
    width: "95%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    // The form is longer now (date, tags, photos) — cap it so it scrolls
    // instead of running off the screen.
    maxHeight: "88%",
  },
  heading: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  inputWrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: "500",
    color: "#333",
  },
  input: {
    color: "#333",
    fontWeight: "400",
    fontSize: 14,
    height: 40,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
  },
  submitBtn: {
    backgroundColor: "#ff6A00",
    borderRadius: 100,
    // height: 44,
    paddingVertical: 10,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
    marginTop: 16,
  },
  disabledBtn: {
    backgroundColor: "#ff6A0080",
  },
  submitText: {
    color: "#fff",
    fontWeight: "500",
    fontSize: 14,
  },
  suggestionsContainer: {
    position: "absolute",
    top: 70,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    zIndex: 100,
    maxHeight: 250,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  suggestionText: {
    fontSize: 14,
    color: "#333",
  },
  noSuggestionsText: {
    padding: 12,
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateDone: { alignSelf: "flex-end", paddingVertical: 6, paddingHorizontal: 12 },
  dateDoneText: { color: "#ff6A00", fontWeight: "600" },
  tagResults: {
    marginTop: 6,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
  },
  tagChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1F1F1",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagChipText: { fontSize: 12, color: "#333", fontWeight: "500" },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoWrap: { width: 70, height: 70, borderRadius: 8 },
  photo: { width: 70, height: 70, borderRadius: 8, backgroundColor: "#F2F2F2" },
  photoRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  photoAdd: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#ff6A00",
    alignItems: "center",
    justifyContent: "center",
  },
  errorInput: {
    borderColor: "#FF3B30",
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
    fontWeight: "500",
  },
});

export default AddPopUpModal;
