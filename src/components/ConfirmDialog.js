import React from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity } from "react-native";

/**
 * ConfirmDialog — app-consistent confirmation popup (light card, brand-green
 * primary action) to replace native `Alert.alert` prompts. Fully controlled.
 *
 * Props: visible, title, message, confirmLabel, cancelLabel, onConfirm,
 * onCancel, destructive (red primary). Omit onCancel for a single-action dialog.
 */
export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  destructive = false,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel || onConfirm}
      supportedOrientations={["portrait", "landscape", "landscape-left", "landscape-right"]}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {!!title && <Text style={styles.title}>{title}</Text>}
          {!!message && <Text style={styles.message}>{message}</Text>}
          <View style={styles.actions}>
            {onCancel && (
              <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
                <Text style={styles.cancelText}>{cancelLabel}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.confirmBtn, destructive && styles.destructiveBtn]}
              onPress={onConfirm}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.55)", alignItems: "center", justifyContent: "center", padding: 28 },
  card: { width: "100%", maxWidth: 420, backgroundColor: "#fff", borderRadius: 20, padding: 22 },
  title: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  message: { fontSize: 14, color: "#475569", marginTop: 8, lineHeight: 20 },
  actions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 10, marginTop: 22 },
  cancelBtn: { paddingVertical: 11, paddingHorizontal: 18, borderRadius: 12, backgroundColor: "#F1F5F9" },
  cancelText: { fontSize: 14, fontWeight: "800", color: "#475569" },
  confirmBtn: { paddingVertical: 11, paddingHorizontal: 20, borderRadius: 12, backgroundColor: "#15A765" },
  destructiveBtn: { backgroundColor: "#DC2626" },
  confirmText: { fontSize: 14, fontWeight: "800", color: "#fff" },
});
