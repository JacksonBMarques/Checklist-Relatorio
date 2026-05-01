import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { useSettings } from "@/context/SettingsContext";

interface PinModalProps {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  mode?: "verify" | "set" | "change";
  title?: string;
}

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

export default function PinModal({
  visible,
  onSuccess,
  onCancel,
  mode = "verify",
  title,
}: PinModalProps) {
  const colors = useColors();
  const { validatePin, setPin, hasPin } = useSettings();

  const [phase, setPhase] = useState<"enter" | "confirm">("enter");
  const [input, setInput] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  const PIN_LENGTH = 4;

  useEffect(() => {
    if (visible) {
      setInput("");
      setFirstPin("");
      setError("");
      setPhase("enter");
    }
  }, [visible]);

  useEffect(() => {
    if (input.length < PIN_LENGTH) return;

    if (mode === "verify") {
      if (validatePin(input)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSuccess();
        setInput("");
      } else {
        triggerError("PIN incorreto");
      }
      return;
    }

    if (mode === "set" || mode === "change") {
      if (phase === "enter") {
        setFirstPin(input);
        setInput("");
        setPhase("confirm");
        setError("");
      } else {
        if (input === firstPin) {
          setPin(input).then(() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onSuccess();
          });
        } else {
          triggerError("PINs não coincidem");
          setPhase("enter");
          setFirstPin("");
        }
      }
    }
  }, [input]);

  function triggerError(msg: string) {
    setError(msg);
    setInput("");
    setShake(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setTimeout(() => setShake(false), 500);
  }

  function pressDigit(d: string) {
    if (d === "del") {
      setInput((p) => p.slice(0, -1));
      setError("");
    } else if (input.length < PIN_LENGTH) {
      setInput((p) => p + d);
      setError("");
    }
  }

  const heading =
    title ??
    (mode === "set"
      ? phase === "enter"
        ? "Criar PIN"
        : "Confirme o PIN"
      : mode === "change"
      ? phase === "enter"
        ? "Novo PIN"
        : "Confirme o novo PIN"
      : "Digite o PIN");

  const styles = makeStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={[styles.modal, shake && styles.shake]} onPress={() => {}}>
          <TouchableOpacity style={styles.closeBtn} onPress={onCancel}>
            <Feather name="x" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>

          <View style={styles.lockIcon}>
            <Feather name="lock" size={28} color={colors.primary} />
          </View>

          <Text style={styles.heading}>{heading}</Text>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.dots}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < input.length && styles.dotFilled,
                ]}
              />
            ))}
          </View>

          <View style={styles.keypad}>
            {DIGITS.map((d, i) => {
              if (d === "") return <View key={i} style={styles.keyEmpty} />;
              const isDel = d === "del";
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.key, isDel && styles.keyDel]}
                  onPress={() => pressDigit(d)}
                  activeOpacity={0.7}
                >
                  {isDel ? (
                    <Feather name="delete" size={20} color={colors.foreground} />
                  ) : (
                    <Text style={styles.keyText}>{d}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    modal: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 28,
      width: "100%",
      maxWidth: 340,
      alignItems: "center",
      gap: 16,
    },
    shake: {
      transform: [{ translateX: 0 }],
    },
    closeBtn: {
      position: "absolute",
      top: 16,
      right: 16,
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    lockIcon: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
    },
    heading: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      textAlign: "center",
    },
    error: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.destructive,
      textAlign: "center",
    },
    dots: {
      flexDirection: "row",
      gap: 16,
      marginVertical: 4,
    },
    dot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: "transparent",
    },
    dotFilled: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    keypad: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      width: 264,
      gap: 12,
    },
    key: {
      width: 72,
      height: 56,
      borderRadius: 12,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
    },
    keyDel: {
      backgroundColor: colors.secondary,
    },
    keyEmpty: {
      width: 72,
      height: 56,
    },
    keyText: {
      fontSize: 22,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
    },
  });
}
