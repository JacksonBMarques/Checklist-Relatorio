import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

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

export function ChecklistProvider({ children }: { children: React.ReactNode }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [activeReport, setActiveReport] = useState<Report | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setReports(JSON.parse(raw));
        } catch {}
      }
    });
  }, []);

  const persist = useCallback((updated: Report[]) => {
    setReports(updated);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const createReport = useCallback((title: string): Report => {
    const report: Report = {
      id: generateId(),
      title,
      categories: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    persist((prev) => {
      const updated = [report, ...prev];
      persist(updated);
      return updated;
    });
    return report;
  }, [persist]);

  const updateReport = useCallback((report: Report) => {
    const updated = { ...report, updatedAt: new Date().toISOString() };
    setReports((prev) => {
      const next = prev.map((r) => (r.id === report.id ? updated : r));
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setActiveReport((prev) => (prev?.id === report.id ? updated : prev));
  }, []);

  const deleteReport = useCallback((id: string) => {
    setReports((prev) => {
      const next = prev.filter((r) => r.id !== id);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setActiveReport((prev) => (prev?.id === id ? null : prev));
  }, []);

  const addCategory = useCallback((reportId: string, name: string) => {
    setReports((prev) => {
      const next = prev.map((r) => {
        if (r.id !== reportId) return r;
        const cat: Category = { id: generateId(), name, items: [] };
        const updated = { ...r, categories: [...r.categories, cat], updatedAt: new Date().toISOString() };
        setActiveReport((a) => (a?.id === reportId ? updated : a));
        return updated;
      });
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const updateCategoryName = useCallback((reportId: string, categoryId: string, name: string) => {
    setReports((prev) => {
      const next = prev.map((r) => {
        if (r.id !== reportId) return r;
        const updated = {
          ...r,
          categories: r.categories.map((c) => (c.id === categoryId ? { ...c, name } : c)),
          updatedAt: new Date().toISOString(),
        };
        setActiveReport((a) => (a?.id === reportId ? updated : a));
        return updated;
      });
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const deleteCategory = useCallback((reportId: string, categoryId: string) => {
    setReports((prev) => {
      const next = prev.map((r) => {
        if (r.id !== reportId) return r;
        const updated = {
          ...r,
          categories: r.categories.filter((c) => c.id !== categoryId),
          updatedAt: new Date().toISOString(),
        };
        setActiveReport((a) => (a?.id === reportId ? updated : a));
        return updated;
      });
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const addItem = useCallback((reportId: string, categoryId: string, label: string) => {
    setReports((prev) => {
      const next = prev.map((r) => {
        if (r.id !== reportId) return r;
        const item: ChecklistItem = { id: generateId(), label, answer: null, observation: "" };
        const updated = {
          ...r,
          categories: r.categories.map((c) =>
            c.id === categoryId ? { ...c, items: [...c.items, item] } : c
          ),
          updatedAt: new Date().toISOString(),
        };
        setActiveReport((a) => (a?.id === reportId ? updated : a));
        return updated;
      });
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const updateItem = useCallback((reportId: string, categoryId: string, item: ChecklistItem) => {
    setReports((prev) => {
      const next = prev.map((r) => {
        if (r.id !== reportId) return r;
        const updated = {
          ...r,
          categories: r.categories.map((c) =>
            c.id === categoryId
              ? { ...c, items: c.items.map((i) => (i.id === item.id ? item : i)) }
              : c
          ),
          updatedAt: new Date().toISOString(),
        };
        setActiveReport((a) => (a?.id === reportId ? updated : a));
        return updated;
      });
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const deleteItem = useCallback((reportId: string, categoryId: string, itemId: string) => {
    setReports((prev) => {
      const next = prev.map((r) => {
        if (r.id !== reportId) return r;
        const updated = {
          ...r,
          categories: r.categories.map((c) =>
            c.id === categoryId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c
          ),
          updatedAt: new Date().toISOString(),
        };
        setActiveReport((a) => (a?.id === reportId ? updated : a));
        return updated;
      });
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

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
