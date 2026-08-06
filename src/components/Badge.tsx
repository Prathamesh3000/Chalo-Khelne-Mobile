import React from "react";
import { View, Text, StyleSheet } from "react-native";

export type BadgeVariant = "success" | "warning" | "error" | "info" | "purple" | "gray";

const VARIANTS: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: "#D1FAE5", text: "#059669" },
  warning: { bg: "#FEF3C7", text: "#D97706" },
  error: { bg: "#FEE2E2", text: "#DC2626" },
  info: { bg: "#DBEAFE", text: "#2563EB" },
  purple: { bg: "#EDE9FE", text: "#7C3AED" },
  gray: { bg: "#F3F4F6", text: "#6B7280" },
};

/**
 * Reusable Badge/Chip component.
 */
interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: "sm" | "md";
}

export default function Badge({ label, variant = "gray", size = "sm" }: BadgeProps) {
  const v = VARIANTS[variant] || VARIANTS.gray;
  const isSmall = size === "sm";

  return (
    <View style={[styles.badge, { backgroundColor: v.bg }, isSmall ? styles.sm : styles.md]}>
      <Text style={[styles.text, { color: v.text }, isSmall && { fontSize: 10 }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 8, alignSelf: "flex-start" },
  sm: { paddingHorizontal: 6, paddingVertical: 2 },
  md: { paddingHorizontal: 10, paddingVertical: 4 },
  text: { fontSize: 12, fontWeight: "700" },
});
