import React from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";

/**
 * Full-screen loading indicator.
 */
interface LoadingScreenProps {
  message?: string;
  color?: string;
}

export default function LoadingScreen({ message, color = "#4F46E5" }: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={color} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFF" },
  message: { fontSize: 14, color: "#6B7280", marginTop: 12 },
});
