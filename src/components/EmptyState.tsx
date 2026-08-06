import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

/**
 * Reusable Empty State component.
 */
interface EmptyStateProps {
  icon?: IoniconName;
  title?: string;
  subtitle?: string;
  iconSize?: number;
  iconColor?: string;
}

export default function EmptyState({
  icon = "folder-open-outline",
  title = "Nothing here yet",
  subtitle,
  iconSize = 56,
  iconColor = "#D1D5DB",
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={iconSize} color={iconColor} />
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  title: { fontSize: 16, fontWeight: "700", color: "#6B7280", marginTop: 16, textAlign: "center" },
  subtitle: { fontSize: 13, color: "#9CA3AF", textAlign: "center", marginTop: 6, lineHeight: 18 },
});
