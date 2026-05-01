import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

interface SettingsContextType {
  pin: string | null;
  setPin: (pin: string) => Promise<void>;
  clearPin: () => Promise<void>;
  hasPin: boolean;
  validatePin: (input: string) => boolean;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

const PIN_KEY = "@settings_pin";

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [pin, setPinState] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(PIN_KEY).then((raw) => {
      if (raw) setPinState(raw);
    });
  }, []);

  const setPin = useCallback(async (newPin: string) => {
    await AsyncStorage.setItem(PIN_KEY, newPin);
    setPinState(newPin);
  }, []);

  const clearPin = useCallback(async () => {
    await AsyncStorage.removeItem(PIN_KEY);
    setPinState(null);
  }, []);

  const validatePin = useCallback(
    (input: string) => {
      if (!pin) return true;
      return input === pin;
    },
    [pin]
  );

  return (
    <SettingsContext.Provider value={{ pin, setPin, clearPin, hasPin: !!pin, validatePin }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
