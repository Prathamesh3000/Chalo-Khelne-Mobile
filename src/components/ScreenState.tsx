import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import LoadingScreen from "./LoadingScreen";
import EmptyState from "./EmptyState";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

/**
 * ScreenState — the canonical loading / error / empty / content wrapper.
 *
 * The migration's standard screen skeleton. Wrap the data-dependent body of a
 * screen in this and it renders the right state, so screens stop hand-rolling
 * (and inconsistently handling) these four cases. Pairs directly with a
 * TanStack Query hook (Phase 3):
 *
 *   const { data = [], isLoading, isError, refetch } = useMyBookings(userId);
 *   return (
 *     <ScreenState
 *       loading={isLoading}
 *       error={isError}
 *       onRetry={refetch}
 *       empty={data.length === 0}
 *       emptyTitle="No bookings yet"
 *       emptySubtitle="Your bookings will show up here."
 *     >
 *       <FlatList data={data} ... />
 *     </ScreenState>
 *   );
 *
 * Precedence: loading → error → empty → children.
 */
interface ScreenStateProps {
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  empty?: boolean;
  loadingMessage?: string;
  errorTitle?: string;
  errorMessage?: string;
  emptyIcon?: IoniconName;
  emptyTitle?: string;
  emptySubtitle?: string;
  children: React.ReactNode;
}

export default function ScreenState({
  loading = false,
  error = false,
  onRetry,
  empty = false,
  loadingMessage,
  errorTitle = "Couldn't load",
  errorMessage = "Something went wrong. Please try again.",
  emptyIcon,
  emptyTitle = "Nothing here yet",
  emptySubtitle,
  children,
}: ScreenStateProps) {
  if (loading) {
    return <LoadingScreen message={loadingMessage} />;
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={56} color="#D1D5DB" />
        <Text style={styles.errorTitle}>{errorTitle}</Text>
        <Text style={styles.errorMessage}>{errorMessage}</Text>
        {onRetry && (
          <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.85}>
            <Ionicons name="refresh" size={16} color="#FFFFFF" />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (empty) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} subtitle={emptySubtitle} />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    backgroundColor: "#FFFFFF",
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6B7280",
    marginTop: 16,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#15A765",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 20,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
});
