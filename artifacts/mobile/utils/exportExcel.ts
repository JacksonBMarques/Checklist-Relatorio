import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import * as XLSX from "xlsx";

import { Report } from "@/context/ChecklistContext";

function buildSheet(report: Report): XLSX.WorkSheet {
  const rows: (string | null)[][] = [];

  rows.push(["Relatório:", report.title]);
  rows.push(["Data:", new Date(report.createdAt).toLocaleDateString("pt-BR")]);
  rows.push([]);
  rows.push(["Categoria", "Item", "Resposta", "Observações"]);

  for (const cat of report.categories) {
    if (cat.items.length === 0) {
      rows.push([cat.name, "(sem itens)", null, null]);
    } else {
      for (const item of cat.items) {
        rows.push([
          cat.name,
          item.label,
          item.answer === "sim" ? "Sim" : item.answer === "nao" ? "Não" : "—",
          item.observation || "",
        ]);
      }
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 28 }, { wch: 40 }, { wch: 10 }, { wch: 50 }];
  return ws;
}

function sanitizeSheetName(name: string): string {
  return name.replace(/[\/\\?\*\[\]:]/g, "_").substring(0, 31);
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function exportReportAsCSV(
  report: Report,
  allReports?: Report[]
): Promise<void> {
  const workbook = XLSX.utils.book_new();
  const isBulk = allReports && allReports.length > 1;

  if (isBulk) {
    for (const r of allReports!) {
      const sheetName = sanitizeSheetName(r.title) || `Rel_${r.id.slice(0, 6)}`;
      XLSX.utils.book_append_sheet(workbook, buildSheet(r), sheetName);
    }
  } else {
    XLSX.utils.book_append_sheet(workbook, buildSheet(report), "Relatório");
  }

  const slug = report.title.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_\-]/g, "");
  const filename = isBulk
    ? `relatorios_${Date.now()}.xlsx`
    : `relatorio_${slug || "sem_titulo"}_${Date.now()}.xlsx`;

  if (Platform.OS === "web") {
    XLSX.writeFile(workbook, filename);
    return;
  }

  // Use "array" type (Uint8Array) — compatible with Hermes/React Native
  const uint8Array: Uint8Array = XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx",
  });

  const base64 = uint8ArrayToBase64(uint8Array);

  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? "";
  const fileUri = `${dir}${filename}`;

  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: "base64",
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("Compartilhamento não disponível neste dispositivo.");
  }

  await Sharing.shareAsync(fileUri, {
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    dialogTitle: isBulk ? "Exportar relatórios" : `Exportar: ${report.title}`,
    UTI: "com.microsoft.excel.xlsx",
  });
}
