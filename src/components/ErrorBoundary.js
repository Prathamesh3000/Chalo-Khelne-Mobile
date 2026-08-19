import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Sentry } from "../services/sentry";
import { colors } from "../theme";

/**
 * Error boundary for the mobile app.
 *
 * §5.2: there was NO error boundary anywhere in ~87,500 lines — zero
 * `componentDidCatch`. React Native's default for an uncaught render error in a
 * production build is a blank white screen with no recovery path except
 * force-quitting the app.
 *
 * That matters here more than usual because the app renders tournament
 * documents whose shape has migrated several times (sportSelections replacing
 * selectedCategories, matchResult replacing result.finalScore). One legacy
 * record with a missing field is a hard crash for that user, on every open,
 * with nothing on screen to explain it.
 *
 * Deliberately a CLASS component: `componentDidCatch` /
 * `getDerivedStateFromError` have no hook equivalent — this is the one place
 * React still requires a class.
 *
 * Usage:
 *   <ErrorBoundary>            // whole app, in App.js
 *   <ErrorBoundary label="Tournament" onReset={refetch}>   // per screen
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null, showDetail: false };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });

    // Always log — Sentry is a no-op until a DSN is configured, and a crash
    // that reaches here must never be silent in dev either.
    console.error("[ErrorBoundary]", this.props.label || "app", error, info?.componentStack);

    try {
      Sentry.captureException(error, {
        extra: {
          boundary: this.props.label || "root",
          componentStack: info?.componentStack,
        },
      });
    } catch (_) {
      /* reporting must never itself crash the fallback */
    }
  }

  reset = () => {
    this.setState({ error: null, info: null, showDetail: false });
    // Let the parent refetch / renavigate if it knows how.
    if (typeof this.props.onReset === "function") {
      try {
        this.props.onReset();
      } catch (_) {
        /* a failing reset should still clear the fallback */
      }
    }
  };

  render() {
    const { error, info, showDetail } = this.state;
    if (!error) return this.props.children;

    if (typeof this.props.fallback === "function") {
      return this.props.fallback({ error, reset: this.reset });
    }

    const isDev = typeof __DEV__ !== "undefined" && __DEV__;

    return (
      <View style={styles.container}>
        <Ionicons name="alert-circle-outline" size={44} color={colors.error} />
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          {this.props.label
            ? `We couldn't load ${this.props.label}.`
            : "This screen ran into a problem."}{" "}
          Your data is safe — try again, and if it keeps happening let the
          organiser know.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={this.reset}
          accessibilityRole="button"
          accessibilityLabel="Try again"
        >
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>

        {/* The message is shown in dev only: it is the fastest way to identify
            a bad record, and exactly what we do NOT want to put in front of a
            player mid-tournament. */}
        {isDev && (
          <>
            <TouchableOpacity
              onPress={() => this.setState({ showDetail: !showDetail })}
              accessibilityRole="button"
            >
              <Text style={styles.detailToggle}>
                {showDetail ? "Hide details" : "Show details (dev only)"}
              </Text>
            </TouchableOpacity>
            {showDetail && (
              <ScrollView style={styles.detailBox}>
                <Text style={styles.detailText}>{String(error?.message || error)}</Text>
                {!!info?.componentStack && (
                  <Text style={styles.detailStack}>{info.componentStack}</Text>
                )}
              </ScrollView>
            )}
          </>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    marginTop: 14,
    textAlign: "center",
  },
  body: {
    fontSize: 14,
    color: colors.textSub,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  button: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 999,
  },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  detailToggle: {
    marginTop: 18,
    fontSize: 12,
    color: colors.textSub,
    textDecorationLine: "underline",
  },
  detailBox: {
    maxHeight: 220,
    marginTop: 10,
    alignSelf: "stretch",
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 10,
  },
  detailText: { fontSize: 12, color: colors.error, fontWeight: "600" },
  detailStack: { fontSize: 10, color: colors.textMuted, marginTop: 8 },
});

export default ErrorBoundary;
