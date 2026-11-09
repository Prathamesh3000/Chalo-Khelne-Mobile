import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

/**
 * Reusable Screen Header with back button and safe area padding.
 * Solves the "header behind system bar" issue across all screens.
 */
interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: { icon: IoniconName; onPress: () => void };
  bgColor?: string;
  titleColor?: string;
}

export default function ScreenHeader({
  title,
  subtitle,
  showBack = true,
  onBack,
  rightAction,
  bgColor = "#FFF",
  titleColor = "#1F2937",
}: ScreenHeaderProps) {
  const navigation = useNavigation();
  // `insets.top` is the real status-bar / notch / Dynamic Island height on both
  // platforms. The previous flat `8` on iOS put this header under the notch,
  // and `StatusBar.currentHeight` is unreliable on Android under edge-to-edge
  // (forced from targetSdk 35).
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: bgColor, paddingTop: insets.top + 8 }]}>
      <View style={styles.inner}>
        {showBack && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onBack || (() => navigation.goBack())}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={titleColor} />
          </TouchableOpacity>
        )}

        <View style={styles.titleBox}>
          <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>

        {rightAction ? (
          <TouchableOpacity
            style={styles.rightBtn}
            onPress={rightAction.onPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name={rightAction.icon} size={22} color={titleColor} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // paddingTop is applied inline from useSafeAreaInsets().top
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  backBtn: { padding: 4 },
  titleBox: { flex: 1 },
  title: { fontSize: 18, fontWeight: "700" },
  subtitle: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  rightBtn: { padding: 4 },
});
