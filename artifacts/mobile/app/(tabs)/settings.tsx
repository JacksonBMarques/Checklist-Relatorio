import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PinModal from "@/components/PinModal";
import { useSettings } from "@/context/SettingsContext";
import { useColors } from "@/hooks/useColors";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { hasPin, clearPin } = useSettings();

  const [pinModal, setPinModal] = useState<"verify-entry" | "set" | "change" | null>(null);
  const [settingsUnlocked, setSettingsUnlocked] = useState(false);
  const [infoModal, setInfoModal] = useState<{ title: string; message: string } | null>(null);

  useFocusEffect(
    useCallback(() => {
      setSettingsUnlocked(false);
      if (hasPin) {
        setPinModal("verify-entry");
      }
    }, [hasPin])
  );
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const styles = makeStyles(colors, insets);

  if (!settingsUnlocked && hasPin) {
    return (
      <View style={[styles.container, styles.lockedContainer]}>
        <View style={styles.lockedContent}>
          <View style={styles.lockedIcon}>
            <Feather name="lock" size={40} color={colors.primary} />
          </View>
          <Text style={styles.lockedTitle}>Configurações</Text>
          <Text style={styles.lockedText}>Esta área está protegida por PIN.</Text>
          <TouchableOpacity
            style={styles.unlockBtn}
            onPress={() => setPinModal("verify-entry")}
            activeOpacity={0.85}
          >
            <Feather name="unlock" size={18} color={colors.primaryForeground} />
            <Text style={styles.unlockBtnText}>Desbloquear</Text>
          </TouchableOpacity>
        </View>

        <PinModal
          visible={pinModal === "verify-entry"}
          mode="verify"
          title="PIN de Configurações"
          onSuccess={() => {
            setPinModal(null);
            setSettingsUnlocked(true);
          }}
          onCancel={() => setPinModal(null)}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        <Text style={styles.headerTitle}>Configurações</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Segurança</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={hasPin ? styles.row : [styles.row, styles.rowLast]}
            onPress={() => setPinModal(hasPin ? "change" : "set")}
            activeOpacity={0.8}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.rowIcon, { backgroundColor: "#EEF4FF" }]}>
                <Feather name="shield" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.rowLabel}>{hasPin ? "Alterar PIN" : "Definir PIN"}</Text>
                <Text style={styles.rowSub}>
                  {hasPin ? "PIN ativo — toque para alterar" : "Proteja com um PIN de 4 dígitos"}
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>

          {hasPin && (
            <TouchableOpacity
              style={[styles.row, styles.rowLast]}
              onPress={() =>
                setConfirmModal({
                  title: "Remover PIN",
                  message: "Tem certeza? As configurações ficarão sem proteção.",
                  onConfirm: async () => {
                    await clearPin();
                    setSettingsUnlocked(false);
                  },
                })
              }
              activeOpacity={0.8}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.rowIcon, { backgroundColor: "#FEF2F2" }]}>
                  <Feather name="lock" size={18} color={colors.destructive} />
                </View>
                <Text style={[styles.rowLabel, { color: colors.destructive }]}>Remover PIN</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <PinModal
        visible={pinModal === "set"}
        mode="set"
        onSuccess={() => {
          setPinModal(null);
          setInfoModal({ title: "PIN definido", message: "Configurações protegidas com sucesso." });
        }}
        onCancel={() => setPinModal(null)}
      />
      <PinModal
        visible={pinModal === "change"}
        mode="change"
        onSuccess={() => {
          setPinModal(null);
          setInfoModal({ title: "PIN alterado", message: "Novo PIN salvo com sucesso." });
        }}
        onCancel={() => setPinModal(null)}
      />

      <Modal
        visible={!!infoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoModal(null)}
      >
        <Pressable style={styles.overlay} onPress={() => setInfoModal(null)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            <Text style={styles.modalTitle}>{infoModal?.title}</Text>
            <Text style={styles.modalMessage}>{infoModal?.message}</Text>
            <TouchableOpacity style={styles.modalOk} onPress={() => setInfoModal(null)}>
              <Text style={styles.modalOkText}>OK</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={!!confirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModal(null)}
      >
        <Pressable style={styles.overlay} onPress={() => setConfirmModal(null)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            <Text style={styles.modalTitle}>{confirmModal?.title}</Text>
            <Text style={styles.modalMessage}>{confirmModal?.message}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setConfirmModal(null)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: colors.destructive }]}
                onPress={() => {
                  const action = confirmModal?.onConfirm;
                  setConfirmModal(null);
                  action?.();
                }}
              >
                <Text style={styles.modalConfirmText}>Remover</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function makeStyles(
  colors: ReturnType<typeof useColors>,
  insets: ReturnType<typeof useSafeAreaInsets>
) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    lockedContainer: { justifyContent: "center" },
    lockedContent: { alignItems: "center", paddingHorizontal: 40, gap: 16 },
    lockedIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    lockedTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground },
    lockedText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
    },
    unlockBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.primary,
      paddingHorizontal: 28,
      paddingVertical: 14,
      borderRadius: 12,
      marginTop: 8,
      overflow: "hidden",
    },
    unlockBtnText: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: colors.primaryForeground,
    },
    header: {
      paddingHorizontal: 20,
      paddingBottom: 16,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: 8,
    },
    headerTitle: {
      fontSize: 26,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      marginTop: 16,
    },
    content: { paddingHorizontal: 16, gap: 0 },
    section: { marginTop: 24, gap: 0 },
    sectionTitle: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 8,
      marginLeft: 4,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowLast: { borderBottomWidth: 0 },
    rowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
    rowIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    rowLabel: { fontSize: 15, fontFamily: "Inter_500Medium", color: colors.foreground },
    rowSub: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: 2,
      maxWidth: 220,
    },
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    modal: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 24,
      width: "100%",
      maxWidth: 380,
      gap: 16,
    },
    modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground },
    modalMessage: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      lineHeight: 20,
    },
    modalOk: {
      padding: 12,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: "center",
      overflow: "hidden",
    },
    modalOkText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.primaryForeground },
    modalActions: { flexDirection: "row", gap: 12 },
    modalCancel: {
      flex: 1,
      padding: 12,
      borderRadius: 10,
      backgroundColor: colors.muted,
      alignItems: "center",
      overflow: "hidden",
    },
    modalCancelText: {
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
    },
    modalConfirm: {
      flex: 1,
      padding: 12,
      borderRadius: 10,
      alignItems: "center",
      overflow: "hidden",
    },
    modalConfirmText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
  });
}
