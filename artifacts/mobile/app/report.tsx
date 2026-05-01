import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  FolderPlus,
  Layers,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Category, ChecklistItem, useChecklist } from "@/context/ChecklistContext";
import { useSettings } from "@/context/SettingsContext";
import PinModal from "@/components/PinModal";
import { useColors } from "@/hooks/useColors";
import { exportReportAsCSV } from "@/utils/exportExcel";

export default function ReportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { hasPin, validatePin } = useSettings();
  const {
    activeReport,
    updateReport,
    addCategory,
    updateCategoryName,
    deleteCategory,
    addItem,
    updateItem,
    deleteItem,
  } = useChecklist();

  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());

  function toggleCategory(catId: string) {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }

  const [addCatModal, setAddCatModal] = useState(false);
  const [catName, setCatName] = useState("");

  const [addItemModal, setAddItemModal] = useState<string | null>(null);
  const [itemLabel, setItemLabel] = useState("");

  const [editCatModal, setEditCatModal] = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState("");

  const [exporting, setExporting] = useState(false);

  const [pinModal, setPinModal] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<(() => void) | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message?: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

  const styles = makeStyles(colors, insets);

  if (!activeReport) {
    router.replace("/");
    return null;
  }

  function handleAddCategory() {
    if (!catName.trim()) return;
    addCategory(activeReport!.id, catName.trim());
    setCatName("");
    setAddCatModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleAddItem() {
    if (!itemLabel.trim() || !addItemModal) return;
    addItem(activeReport!.id, addItemModal, itemLabel.trim());
    setItemLabel("");
    setAddItemModal(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleAnswer(cat: Category, item: ChecklistItem, answer: "sim" | "nao") {
    const newAnswer = item.answer === answer ? null : answer;
    updateItem(activeReport!.id, cat.id, { ...item, answer: newAnswer });
    Haptics.selectionAsync();
  }

  function handleObservation(cat: Category, item: ChecklistItem, text: string) {
    updateItem(activeReport!.id, cat.id, { ...item, observation: text });
  }

  function requestPinThen(action: () => void) {
    if (!hasPin) {
      action();
    } else {
      setPendingDelete(() => action);
      setPinModal(true);
    }
  }

  function handleDeleteItem(catId: string, itemId: string) {
    setConfirmModal({
      title: "Excluir item?",
      message: "Esta ação não pode ser desfeita.",
      onConfirm: () => requestPinThen(() => deleteItem(activeReport!.id, catId, itemId)),
    });
  }

  function handleDeleteCategory(cat: Category) {
    setConfirmModal({
      title: "Excluir categoria?",
      message: `"${cat.name}" e todos os seus itens serão removidos.`,
      onConfirm: () => requestPinThen(() => deleteCategory(activeReport!.id, cat.id)),
    });
  }

  function handleEditCategory() {
    if (!editCatName.trim() || !editCatModal) return;
    updateCategoryName(activeReport!.id, editCatModal.id, editCatName.trim());
    setEditCatModal(null);
    setEditCatName("");
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportReportAsCSV(activeReport!);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setConfirmModal({
        title: "Erro ao exportar",
        message: msg || "Não foi possível gerar o relatório.",
        confirmLabel: "OK",
        onConfirm: () => setConfirmModal(null),
      });
    } finally {
      setExporting(false);
    }
  }

  function handleClear() {
    setConfirmModal({
      title: "Limpar respostas?",
      message: "Todas as respostas (Sim/Não) e observações serão apagadas. As categorias e itens serão mantidos.",
      confirmLabel: "Limpar",
      onConfirm: () => {
        const cleared = {
          ...activeReport!,
          categories: activeReport!.categories.map((cat) => ({
            ...cat,
            items: cat.items.map((item) => ({ ...item, answer: null, observation: "" })),
          })),
        };
        updateReport(cleared);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    });
  }

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {activeReport.title}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={handleClear}
            activeOpacity={0.8}
          >
            <RotateCcw size={15} color={colors.mutedForeground} />
            <Text style={styles.clearBtnText}>Limpar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
            onPress={handleExport}
            disabled={exporting}
            activeOpacity={0.8}
          >
            <Download size={15} color={colors.primaryForeground} />
            <Text style={styles.exportBtnText}>Exportar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 100 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {activeReport.categories.length === 0 ? (
          <View style={styles.empty}>
            <Layers size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>Nenhuma categoria</Text>
            <Text style={styles.emptyText}>
              Toque em "Nova Categoria" para começar a montar seu checklist
            </Text>
          </View>
        ) : (
          activeReport.categories.map((cat) => {
            const isCollapsed = collapsedCats.has(cat.id);
            return (
            <View key={cat.id} style={styles.categoryCard}>
              <TouchableOpacity
                style={styles.categoryHeader}
                onPress={() => toggleCategory(cat.id)}
                activeOpacity={0.7}
              >
                <View style={styles.categoryTitleRow}>
                  <View style={styles.categoryDot} />
                  <Text style={styles.categoryName}>{cat.name}</Text>
                  {cat.items.length > 0 && (
                    <Text style={styles.categoryCount}>
                      {cat.items.filter((i) => i.answer !== null).length}/{cat.items.length}
                    </Text>
                  )}
                </View>
                <View style={styles.categoryActions}>
                  <TouchableOpacity
                    onPress={() => { setEditCatModal(cat); setEditCatName(cat.name); }}
                    style={styles.iconBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
                  >
                    <Pencil size={15} color={colors.mutedForeground} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteCategory(cat)}
                    style={styles.iconBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  >
                    <Trash2 size={15} color={colors.destructive} />
                  </TouchableOpacity>
                  <View style={styles.iconBtn}>
                    {isCollapsed
                      ? <ChevronDown size={16} color={colors.mutedForeground} />
                      : <ChevronUp size={16} color={colors.mutedForeground} />
                    }
                  </View>
                </View>
              </TouchableOpacity>

              {!isCollapsed && cat.items.map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  <View style={styles.itemTop}>
                    <Text style={styles.itemLabel} numberOfLines={2}>
                      {item.label}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteItem(cat.id, item.id)}
                      style={styles.iconBtnSm}
                    >
                      <X size={14} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.answerRow}>
                    <TouchableOpacity
                      style={[
                        styles.answerBtn,
                        item.answer === "sim" && styles.answerBtnSim,
                      ]}
                      onPress={() => handleAnswer(cat, item, "sim")}
                      activeOpacity={0.8}
                    >
                      <Check
                        size={16}
                        color={item.answer === "sim" ? "#fff" : colors.mutedForeground}
                      />
                      <Text
                        style={[
                          styles.answerBtnText,
                          item.answer === "sim" && styles.answerBtnTextActive,
                        ]}
                      >
                        Sim
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.answerBtn,
                        item.answer === "nao" && styles.answerBtnNao,
                      ]}
                      onPress={() => handleAnswer(cat, item, "nao")}
                      activeOpacity={0.8}
                    >
                      <X
                        size={16}
                        color={item.answer === "nao" ? "#fff" : colors.mutedForeground}
                      />
                      <Text
                        style={[
                          styles.answerBtnText,
                          item.answer === "nao" && styles.answerBtnTextActive,
                        ]}
                      >
                        Não
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    style={styles.obsInput}
                    placeholder="Observações..."
                    placeholderTextColor={colors.mutedForeground}
                    value={item.observation}
                    onChangeText={(t) => handleObservation(cat, item, t)}
                    multiline
                    numberOfLines={2}
                  />
                </View>
              ))}

              {!isCollapsed && (
                <TouchableOpacity
                  style={styles.addItemBtn}
                  onPress={() => { setAddItemModal(cat.id); setItemLabel(""); }}
                  activeOpacity={0.8}
                >
                  <Plus size={15} color={colors.primary} />
                  <Text style={styles.addItemBtnText}>Adicionar item</Text>
                </TouchableOpacity>
              )}
            </View>
            );
          })
        )}

        <TouchableOpacity
          style={styles.addCatBtn}
          onPress={() => { setAddCatModal(true); setCatName(""); }}
          activeOpacity={0.8}
        >
          <FolderPlus size={18} color={colors.primaryForeground} />
          <Text style={styles.addCatBtnText}>Nova Categoria</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={addCatModal} transparent animationType="fade" onRequestClose={() => setAddCatModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setAddCatModal(false)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            <Text style={styles.modalTitle}>Nova Categoria</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nome da categoria"
              placeholderTextColor={colors.mutedForeground}
              value={catName}
              onChangeText={setCatName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAddCategory}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setAddCatModal(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, !catName.trim() && { opacity: 0.5 }]}
                onPress={handleAddCategory}
                disabled={!catName.trim()}
              >
                <Text style={styles.modalConfirmText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!addItemModal} transparent animationType="fade" onRequestClose={() => setAddItemModal(null)}>
        <Pressable style={styles.overlay} onPress={() => setAddItemModal(null)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            <Text style={styles.modalTitle}>Novo Item</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Descrição do item"
              placeholderTextColor={colors.mutedForeground}
              value={itemLabel}
              onChangeText={setItemLabel}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAddItem}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setAddItemModal(null)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, !itemLabel.trim() && { opacity: 0.5 }]}
                onPress={handleAddItem}
                disabled={!itemLabel.trim()}
              >
                <Text style={styles.modalConfirmText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!editCatModal} transparent animationType="fade" onRequestClose={() => setEditCatModal(null)}>
        <Pressable style={styles.overlay} onPress={() => setEditCatModal(null)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            <Text style={styles.modalTitle}>Editar Categoria</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nome da categoria"
              placeholderTextColor={colors.mutedForeground}
              value={editCatName}
              onChangeText={setEditCatName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleEditCategory}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setEditCatModal(null)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, !editCatName.trim() && { opacity: 0.5 }]}
                onPress={handleEditCategory}
                disabled={!editCatName.trim()}
              >
                <Text style={styles.modalConfirmText}>Salvar</Text>
              </TouchableOpacity>
            </View>
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
            {!!confirmModal?.message && (
              <Text style={styles.confirmMessage}>{confirmModal.message}</Text>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setConfirmModal(null)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirm,
                  {
                    backgroundColor:
                      confirmModal?.confirmLabel === "Limpar" ||
                      confirmModal?.confirmLabel === "OK"
                        ? colors.primary
                        : colors.destructive,
                  },
                ]}
                onPress={() => {
                  const action = confirmModal?.onConfirm;
                  setConfirmModal(null);
                  action?.();
                }}
              >
                <Text style={styles.modalConfirmText}>
                  {confirmModal?.confirmLabel ?? "Excluir"}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },
    backBtn: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      flex: 1,
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    clearBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.card,
      overflow: "hidden",
    },
    clearBtnText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
    },
    exportBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      overflow: "hidden",
    },
    exportBtnDisabled: { opacity: 0.6 },
    exportBtnText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.primaryForeground,
    },
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 20,
      gap: 16,
    },
    empty: {
      alignItems: "center",
      marginTop: 80,
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
    categoryCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    categoryHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.secondary,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    categoryTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flex: 1,
    },
    categoryDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    categoryName: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      flex: 1,
    },
    categoryCount: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
      marginLeft: 4,
    },
    categoryActions: {
      flexDirection: "row",
      gap: 4,
    },
    iconBtn: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    iconBtnSm: {
      width: 28,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
    },
    itemCard: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 10,
    },
    itemTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 8,
    },
    itemLabel: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
      lineHeight: 20,
    },
    answerRow: {
      flexDirection: "row",
      gap: 10,
    },
    answerBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 18,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.muted,
      overflow: "hidden",
    },
    answerBtnSim: {
      backgroundColor: "#16A34A",
      borderColor: "#16A34A",
    },
    answerBtnNao: {
      backgroundColor: "#DC2626",
      borderColor: "#DC2626",
    },
    answerBtnText: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
    },
    answerBtnTextActive: {
      color: "#fff",
    },
    obsInput: {
      borderWidth: 1,
      borderColor: colors.input,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      backgroundColor: colors.background,
      minHeight: 44,
      textAlignVertical: "top",
    },
    addItemBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    addItemBtnText: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.primary,
    },
    addCatBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      marginTop: 4,
      overflow: "hidden",
    },
    addCatBtnText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.primaryForeground,
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
    confirmMessage: {
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
      backgroundColor: colors.primary,
      alignItems: "center",
      overflow: "hidden",
    },
    modalConfirmText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.primaryForeground,
    },
  });
}
