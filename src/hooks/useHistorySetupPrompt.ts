import { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchTimeline } from "../api/playerHistory";

const KEY = (userId: string) => `history_setup_seen:${userId}`;

/**
 * One-time nudge to build the playing-history timeline.
 *
 * Opens the "HistorySetup" screen the first time a player reaches Home with an
 * empty timeline. It is marked as seen as soon as the decision is made — shown,
 * or skipped because they already have history — so it never nags twice. If the
 * network call fails the flag is left unset and the check runs again next time.
 *
 * fetchTimeline also triggers the server's one-off conversion of legacy
 * free-text achievements, so players who had achievements are not prompted.
 */
export default function useHistorySetupPrompt(
  navigation: { navigate: (name: string, params?: object) => void },
  userId?: string | null
) {
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        if (await AsyncStorage.getItem(KEY(userId))) return;
        const entries = await fetchTimeline(userId);
        if (cancelled) return;
        await AsyncStorage.setItem(KEY(userId), "1");
        if (entries.length === 0) navigation.navigate("HistorySetup");
      } catch {
        /* offline / server hiccup — try again next launch */
      }
    })();
    return () => {
      cancelled = true;
    };
    // navigation is stable for the life of the screen; re-run only per user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
}
