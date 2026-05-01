import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export interface ChecklistItem {
  id: string;
  label: string;
  answer: "sim" | "nao" | null;
  observation: string;
}

export interface Category {
  id: string;
  name: string;
  items: ChecklistItem[];
}

export interface Report {
  id: string;
  title: string;
  categories: Category[];
  createdAt: string;
  updatedAt: string;
}

interface ChecklistContextType {
  reports: Report[];
  activeReport: Report | null;
  setActiveReport: (report: Report | null) => void;
  createReport: (title: string) => Report;
  updateReport: (report: Report) => void;
  deleteReport: (id: string) => void;
  addCategory: (reportId: string, name: string) => void;
  updateCategoryName: (reportId: string, categoryId: string, name: string) => void;
  deleteCategory: (reportId: string, categoryId: string) => void;
  addItem: (reportId: string, categoryId: string, label: string) => void;
  updateItem: (reportId: string, categoryId: string, item: ChecklistItem) => void;
  deleteItem: (reportId: string, categoryId: string, itemId: string) => void;
}

const ChecklistContext = createContext<ChecklistContextType | null>(null);

const STORAGE_KEY = "@checklist_reports";

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function save(reports: Report[]) {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

export function ChecklistProvider({ children }: { children: React.ReactNode }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);

  const reportsRef = useRef<Report[]>([]);
  reportsRef.current = reports;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setReports(JSON.parse(raw));
        } catch {}
      }
    });
  }, []);

  const activeReport = reports.find((r) => r.id === activeReportId) ?? null;

  const setActiveReport = useCallback((report: Report | null) => {
    setActiveReportId(report?.id ?? null);
  }, []);

  const mutate = useCallback((updater: (prev: Report[]) => Report[]) => {
    setReports((prev) => {
      const next = updater(prev);
      save(next);
      return next;
    });
  }, []);

  const createReport = useCallback((title: string): Report => {
    const report: Report = {
      id: generateId(),
      title,
      categories: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mutate((prev) => [report, ...prev]);
    return report;
  }, [mutate]);

  const updateReport = useCallback((report: Report) => {
    const updated = { ...report, updatedAt: new Date().toISOString() };
    mutate((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }, [mutate]);

  const deleteReport = useCallback((id: string) => {
    mutate((prev) => prev.filter((r) => r.id !== id));
    setActiveReportId((prev) => (prev === id ? null : prev));
  }, [mutate]);

  const addCategory = useCallback((reportId: string, name: string) => {
    const cat: Category = { id: generateId(), name, items: [] };
    mutate((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? { ...r, categories: [...r.categories, cat], updatedAt: new Date().toISOString() }
          : r
      )
    );
  }, [mutate]);

  const updateCategoryName = useCallback((reportId: string, categoryId: string, name: string) => {
    mutate((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              categories: r.categories.map((c) => (c.id === categoryId ? { ...c, name } : c)),
              updatedAt: new Date().toISOString(),
            }
          : r
      )
    );
  }, [mutate]);

  const deleteCategory = useCallback((reportId: string, categoryId: string) => {
    mutate((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              categories: r.categories.filter((c) => c.id !== categoryId),
              updatedAt: new Date().toISOString(),
            }
          : r
      )
    );
  }, [mutate]);

  const addItem = useCallback((reportId: string, categoryId: string, label: string) => {
    const item: ChecklistItem = { id: generateId(), label, answer: null, observation: "" };
    mutate((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              categories: r.categories.map((c) =>
                c.id === categoryId ? { ...c, items: [...c.items, item] } : c
              ),
              updatedAt: new Date().toISOString(),
            }
          : r
      )
    );
  }, [mutate]);

  const updateItem = useCallback((reportId: string, categoryId: string, item: ChecklistItem) => {
    mutate((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              categories: r.categories.map((c) =>
                c.id === categoryId
                  ? { ...c, items: c.items.map((i) => (i.id === item.id ? item : i)) }
                  : c
              ),
              updatedAt: new Date().toISOString(),
            }
          : r
      )
    );
  }, [mutate]);

  const deleteItem = useCallback((reportId: string, categoryId: string, itemId: string) => {
    mutate((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              categories: r.categories.map((c) =>
                c.id === categoryId
                  ? { ...c, items: c.items.filter((i) => i.id !== itemId) }
                  : c
              ),
              updatedAt: new Date().toISOString(),
            }
          : r
      )
    );
  }, [mutate]);

  return (
    <ChecklistContext.Provider
      value={{
        reports,
        activeReport,
        setActiveReport,
        createReport,
        updateReport,
        deleteReport,
        addCategory,
        updateCategoryName,
        deleteCategory,
        addItem,
        updateItem,
        deleteItem,
      }}
    >
      {children}
    </ChecklistContext.Provider>
  );
}

export function useChecklist() {
  const ctx = useContext(ChecklistContext);
  if (!ctx) throw new Error("useChecklist must be used within ChecklistProvider");
  return ctx;
}
