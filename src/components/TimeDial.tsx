import React, { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, LayoutChangeEvent } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const GREEN = "#15A765";
const TICK = "#C4D0C8";
const MUTED = "#6A7A71";

export const DIAL_ITEM_WIDTH = 64;
const MINOR_TICKS = 8;

export interface DialItem {
  key: string;
  label: string;
  /** Number shown under the value; 0 renders as a dash. */
  count: number;
}

interface Props {
  items: DialItem[];
  selectedKey: string;
  onSelect: (key: string) => void;
  /** Colour of the page behind the dial; the edge fades blend into it. */
  surface?: string;
}

/**
 * Horizontal ruler picker: drag to snap to a value, or tap one. The centre pill
 * marks the current value. Values that have events get green ticks.
 */
export default function TimeDial({ items, selectedKey, onSelect, surface = "#FFFFFF" }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  // Last key this component reported itself, so its own scrolling doesn't
  // trigger a programmatic re-scroll (which would fight the user's finger).
  const emitted = useRef<string>(selectedKey);
  // While a tap-driven animated scroll runs, ignore its intermediate scroll
  // events so the selection doesn't flicker through the values in between.
  const lockUntil = useRef(0);

  const indexOfKey = (key: string) => Math.max(0, items.findIndex((i) => i.key === key));

  const scrollToIndex = (index: number, animated: boolean) => {
    scrollRef.current?.scrollTo({ x: index * DIAL_ITEM_WIDTH, y: 0, animated });
  };

  // Put the selected value in the centre once we know the width, and whenever
  // the parent changes the selection from outside.
  useEffect(() => {
    if (!width) return;
    lockUntil.current = Date.now() + 350;
    scrollToIndex(indexOfKey(selectedKey), false);
    emitted.current = selectedKey;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, items.length]);

  useEffect(() => {
    if (!width || selectedKey === emitted.current) return;
    lockUntil.current = Date.now() + 450;
    scrollToIndex(indexOfKey(selectedKey), true);
    emitted.current = selectedKey;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  const pick = (index: number) => {
    const i = Math.max(0, Math.min(items.length - 1, index));
    const key = items[i]?.key;
    if (key !== undefined && key !== emitted.current) {
      emitted.current = key;
      onSelect(key);
    }
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (Date.now() < lockUntil.current) return;
    pick(Math.round(e.nativeEvent.contentOffset.x / DIAL_ITEM_WIDTH));
  };

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const sidePad = Math.max(0, (width - DIAL_ITEM_WIDTH) / 2);
  const activeIndex = indexOfKey(selectedKey);

  return (
    <View style={styles.dial} onLayout={onLayout}>
      <View style={styles.centre} pointerEvents="none" />
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={DIAL_ITEM_WIDTH}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={onScroll}
        contentContainerStyle={{ paddingHorizontal: sidePad }}
        accessibilityRole="adjustable"
        accessibilityLabel="Timeline picker"
      >
        {items.map((it, i) => {
          const on = i === activeIndex;
          const has = it.count > 0;
          return (
            <TouchableOpacity
              key={it.key}
              activeOpacity={0.7}
              style={styles.item}
              onPress={() => {
                lockUntil.current = Date.now() + 450;
                scrollToIndex(i, true);
                pick(i);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${it.label}, ${it.count} ${it.count === 1 ? "event" : "events"}`}
            >
              <Text style={[styles.value, on && styles.valueOn]}>{it.label}</Text>
              <View style={styles.rule}>
                <View style={styles.minors}>
                  {Array.from({ length: MINOR_TICKS }).map((_, k) => (
                    <View key={k} style={styles.minor} />
                  ))}
                </View>
                <View style={[styles.major, has && styles.majorHas, on && styles.majorOn]} />
              </View>
              <Text style={[styles.count, has && styles.countHas]}>{it.count || "–"}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <LinearGradient
        pointerEvents="none"
        colors={[surface, `${surface}00`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.fade, { left: 0 }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[`${surface}00`, surface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.fade, { right: 0 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dial: { height: 112, justifyContent: "center" },
  centre: {
    position: "absolute",
    alignSelf: "center",
    width: DIAL_ITEM_WIDTH - 2,
    height: 108,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F5132",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  item: { width: DIAL_ITEM_WIDTH, height: 112, alignItems: "center", justifyContent: "space-between", paddingVertical: 14 },
  value: { fontSize: 15, color: MUTED, fontFamily: "Montserrat_700Bold" },
  valueOn: { color: GREEN },
  rule: { width: "100%", height: 34, justifyContent: "center" },
  minors: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4 },
  minor: { width: 2, height: 12, backgroundColor: TICK, borderRadius: 1 },
  major: {
    position: "absolute",
    alignSelf: "center",
    top: 3,
    width: 3,
    height: 28,
    borderRadius: 2,
    backgroundColor: TICK,
  },
  majorHas: { backgroundColor: "rgba(21,167,101,0.45)" },
  majorOn: { backgroundColor: GREEN },
  count: { fontSize: 11, color: TICK, fontFamily: "Montserrat_600SemiBold" },
  countHas: { color: GREEN },
  fade: { position: "absolute", top: 0, bottom: 0, width: 56 },
});
