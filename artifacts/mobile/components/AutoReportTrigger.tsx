import { AppState, AppStateStatus } from "react-native";
import React, { useEffect, useRef } from "react";
import { useChecklist } from "@/context/ChecklistContext";
import { useSettings } from "@/context/SettingsContext";

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

function shouldAutoGenerate(
  scheduleEnabled: boolean,
  scheduleHour: number,
  scheduleMinute: number,
  lastAutoReportDate: string | null
): boolean {
  if (!scheduleEnabled) return false;
  const today = getTodayStr();
  if (lastAutoReportDate === today) return false;
  const now = new Date();
  const scheduledMs =
    new Date(now.getFullYear(), now.getMonth(), now.getDate(), scheduleHour, scheduleMinute).getTime();
  return now.getTime() >= scheduledMs;
}

export default function AutoReportTrigger() {
  const { scheduleEnabled, scheduleTime, lastAutoReportDate, setLastAutoReportDate } = useSettings();
  const { createReport } = useChecklist();
  const checkedRef = useRef(false);

  function checkAndGenerate() {
    if (
      shouldAutoGenerate(
        scheduleEnabled,
        scheduleTime.hour,
        scheduleTime.minute,
        lastAutoReportDate
      )
    ) {
      const today = getTodayStr();
      const title = `Relatório ${new Date().toLocaleDateString("pt-BR")}`;
      createReport(title);
      setLastAutoReportDate(today);
    }
  }

  useEffect(() => {
    if (!checkedRef.current) {
      checkedRef.current = true;
      checkAndGenerate();
    }
  }, [scheduleEnabled, scheduleTime, lastAutoReportDate]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        checkedRef.current = false;
        checkAndGenerate();
      }
    });
    return () => sub.remove();
  }, [scheduleEnabled, scheduleTime, lastAutoReportDate]);

  return null;
}
