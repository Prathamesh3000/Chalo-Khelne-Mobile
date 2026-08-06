import React from "react";
import { View, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import API from "../api/api";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

/**
 * Reusable Avatar component with fallback.
 */
interface AvatarProps {
  uri?: string | null;
  size?: number;
  fallbackIcon?: IoniconName;
}

export default function Avatar({ uri, size = 44, fallbackIcon = "person" }: AvatarProps) {
  const resolvedUri = uri
    ? uri.startsWith("http")
      ? uri
      : `${API.SERVER_URL}/uploads/${uri.replace(/^uploads[\\/]/, "")}`
    : null;

  if (resolvedUri) {
    return (
      <Image
        source={{ uri: resolvedUri }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  return (
    <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
      <Ionicons name={fallbackIcon} size={size * 0.5} color="#9CA3AF" />
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: "#F3F4F6" },
  placeholder: { backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center" },
});
