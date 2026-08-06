import { useSafeAreaInsets } from "react-native-safe-area-context";

// Height the floating pill tab bar occupies above the bottom safe-area inset
// (pill ~62 + wrapper paddingTop 8 + bottom offset ~5, rounded up for comfort).
export const TAB_BAR_HEIGHT = 96;

/**
 * Bottom padding a scroll container needs so its last rows aren't hidden behind
 * the floating tab bar. Use on any tab-visible scroll screen:
 *
 *   const clearance = useTabBarClearance();
 *   <ScrollView contentContainerStyle={{ paddingBottom: clearance }} />
 *   // or FlatList contentContainerStyle / ListFooter
 *
 * On gesture-nav devices `insets.bottom` is 0, so it returns just TAB_BAR_HEIGHT.
 * Pass `extra` for screens that also have their own fixed bottom CTA.
 */
export default function useTabBarClearance(extra = 0): number {
  const { bottom } = useSafeAreaInsets();
  return bottom + TAB_BAR_HEIGHT + extra;
}
