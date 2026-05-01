import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { ChevronRight, Clipboard, FileText, Plus, Trash2 } from "lucide-react-native";
import React, { useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useChecklist, Report } from "@/context/ChecklistContext";
import { useSettings } from "@/context/SettingsContext";
import PinModal from "@/components/PinModal";
import { useColors } from "@/hooks/useColors";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getProgress(report: Report): { answered: number; total: number } {
  let answered = 0;
  let total = 0;
  for (const cat of report.categories) {
    for (const item of cat.items) {
      total++;
      if (item.answer !== null) answered++;
    }
  }
  return { answered, total };
}

export default function ReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { reports, createReport, deleteReport, setActiveReport } = useChecklist();
  const { hasPin } = useSettings();

  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [pinModal, setPinModal] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<(() => void) | null>(null);

  const styles = makeStyles(colors, insets);

  function handleCreate() {
    if (!newTitle.trim()) return;
    const report = createReport(newTitle.trim());
    setNewTitle("");
    setModalVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setActiveReport(report);
    router.push("/report");
  }

  function handleOpen(report: Report) {
    setActiveReport(report);
    router.push("/report");
  }

  function handleDeletePress(report: Report) {
    setConfirmModal({
      title: "Excluir Relatório",
      message: `Tem certeza que deseja excluir "${report.title}"? Esta ação não pode ser desfeita.`,
      onConfirm: () => {
        const doDelete = () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          deleteReport(report.id);
        };
        if (hasPin) {
          setPendingDelete(() => doDelete);
          setPinModal(true);
        } else {
          doDelete();
        }
      },
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.headerLogo}
          />
          <Text style={styles.headerTitle}>DiskReg Check</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Plus size={22} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          reports.length === 0 ? styles.emptyContainer : styles.listContent
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Clipboard size={52} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>Nenhum relatório</Text>
            <Text style={styles.emptyText}>
              Toque no botão + para criar seu primeiro relatório
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const { answered, total } = getProgress(item);
          const pct = total > 0 ? answered / total : 0;
          return (
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.cardTouchable}
                onPress={() => handleOpen(item)}
                activeOpacity={0.85}
              >
                <View style={styles.cardLeft}>
                  <View style={styles.cardIcon}>
                    <FileText size={20} color={colors.primary} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.cardDate}>{formatDate(item.updatedAt)}</Text>
                    <View style={styles.progressRow}>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${pct * 100}%` as any },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressText}>
                        {answered}/{total}
                      </Text>
                    </View>
                  </View>
                </View>
                <ChevronRight size={18} color={colors.mutedForeground} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeletePress(item)}
                activeOpacity={0.7}
              >
                <Trash2 size={17} color={colors.destructive} />
              </TouchableOpacity>
            </View>
          );
        }}
      />

      {/* Modal: Novo Relatório */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            <Text style={styles.modalTitle}>Novo Relatório</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nome do relatório"
              placeholderTextColor={colors.mutedForeground}
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setModalVisible(false);
                  setNewTitle("");
                }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirm,
                  !newTitle.trim() && styles.modalConfirmDisabled,
                ]}
                onPress={handleCreate}
                disabled={!newTitle.trim()}
              >
                <Text style={styles.modalConfirmText}>Criar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal: Confirmar exclusão */}
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
                <Text style={styles.modalConfirmText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* PIN Modal */}
      <PinModal
        visible={pinModal}
        mode="verify"
        title="Confirmar exclusão"
        onSuccess={() => {
          setPinModal(false);
          if (pendingDelete) {
            pendingDelete();
            setPendingDelete(null);
          }
        }}
        onCancel={() => {
          setPinModal(false);
          setPendingDelete(null);
        }}
      />
    </View>
  );
}

function makeStyles(
  colors: ReturnType<typeof useColors>,
  insets: ReturnType<typeof useSafeAreaInsets>
) {
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: topPad + 16,
      paddingBottom: 16,
      paddingHorizontal: 20,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerBrand: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flex: 1,
    },
    headerLogo: {
      width: 42,
      height: 42,
      borderRadius: 21,
      borderWidth: 2,
      borderColor: colors.border,
    },
    headerTitle: {
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
    },
    addBtn: {
      backgroundColor: colors.primary,
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    listContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 16,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
    },
    empty: {
      alignItems: "center",
      paddingHorizontal: 40,
      gap: 12,
    },
    emptyTitle: {
      fontSize: 18,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      marginTop: 8,
    },
    emptyText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
      lineHeight: 20,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
      overflow: "hidden",
    },
    cardTouchable: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
    },
    cardLeft: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    cardIcon: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    cardInfo: {
      flex: 1,
      gap: 4,
    },
    cardTitle: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    cardDate: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    progressRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 4,
    },
    progressBar: {
      flex: 1,
      height: 4,
      backgroundColor: colors.muted,
      borderRadius: 2,
      overflow: "hidden",
    },
    progressFill: {
      height: 4,
      backgroundColor: colors.primary,
      borderRadius: 2,
    },
    progressText: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
      minWidth: 28,
      textAlign: "right",
    },
    deleteBtn: {
      width: 48,
      height: "100%" as any,
      alignItems: "center",
      justifyContent: "center",
      borderLeftWidth: 1,
      borderLeftColor: colors.border,
      backgroundColor: colors.background,
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
    modalTitle: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
    },
    modalMessage: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      lineHeight: 20,
    },
    modalInput: {
      borderWidth: 1,
      borderColor: colors.input,
      borderRadius: 10,
      padding: 12,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      backgroundColor: colors.background,
    },
    modalActions: {
      flexDirection: "row",
      gap: 12,
    },
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
      backgroundColor: colors.primary,
      alignItems: "center",
      overflow: "hidden",
    },
    modalConfirmDisabled: {
      opacity: 0.5,
    },
    modalConfirmText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.primaryForeground,
    },
  });
}
