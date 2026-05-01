import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface ScheduleTime {
  hour: number;
  minute: number;
}

interface SettingsContextType {
  pin: string | null;
  setPin: (pin: string) => Promise<void>;
  clearPin: () => Promise<void>;
  hasPin: boolean;
  validatePin: (input: string) => boolean;
  scheduleEnabled: boolean;
  scheduleTime: ScheduleTime;
  setSchedule: (enabled: boolean, time: ScheduleTime) => Promise<void>;
  lastAutoReportDate: string | null;
  setLastAutoReportDate: (date: string) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

const PIN_KEY = "@settings_pin";
const SCHEDULE_KEY = "@settings_schedule";
const LAST_AUTO_KEY = "@settings_last_auto";

const DEFAULT_TIME: ScheduleTime = { hour: 8, minute: 0 };

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [pin, setPinState] = useState<string | null>(null);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleTime, setScheduleTimeState] = useState<ScheduleTime>(DEFAULT_TIME);
  const [lastAutoReportDate, setLastAutoReportDateState] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.multiGet([PIN_KEY, SCHEDULE_KEY, LAST_AUTO_KEY]).then(
      ([[, rawPin], [, rawSched], [, rawLast]]) => {
        if (rawPin) setPinState(rawPin);
        if (rawLast) setLastAutoReportDateState(rawLast);
        if (rawSched) {
          try {
            const parsed = JSON.parse(rawSched);
            setScheduleEnabled(parsed.enabled ?? false);
            setScheduleTimeState(parsed.time ?? DEFAULT_TIME);
          } catch {}
        }
      }
    );
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

  const setSchedule = useCallback(
    async (enabled: boolean, time: ScheduleTime) => {
      setScheduleEnabled(enabled);
      setScheduleTimeState(time);
      await AsyncStorage.setItem(SCHEDULE_KEY, JSON.stringify({ enabled, time }));
    },
    []
  );

  const setLastAutoReportDate = useCallback(async (date: string) => {
    setLastAutoReportDateState(date);
    await AsyncStorage.setItem(LAST_AUTO_KEY, date);
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        pin,
        setPin,
        clearPin,
        hasPin: !!pin,
        validatePin,
        scheduleEnabled,
        scheduleTime,
        setSchedule,
        lastAutoReportDate,
        setLastAutoReportDate,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
