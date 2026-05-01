import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
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

// Convert a binary string (each char = one byte, charCode 0-255) to base64.
// Works reliably in Hermes without btoa or Uint8Array issues.
function binaryStringToBase64(binaryStr: string): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  const len = binaryStr.length;
  for (let i = 0; i < len; i += 3) {
    const a = binaryStr.charCodeAt(i);
    const b = i + 1 < len ? binaryStr.charCodeAt(i + 1) : 0;
    const c = i + 2 < len ? binaryStr.charCodeAt(i + 2) : 0;
    result += chars[a >> 2];
    result += chars[((a & 3) << 4) | (b >> 4)];
    result += i + 1 < len ? chars[((b & 15) << 2) | (c >> 6)] : "=";
    result += i + 2 < len ? chars[c & 63] : "=";
  }
  return result;
}

export async function exportReportAsCSV(
  report: Report,
  allReports?: Report[]
): Promise<void> {
  const workbook = XLSX.utils.book_new();
  const isBulk = allReports && allReports.length > 1;

  if (isBulk) {
    for (const r of allReports!) {
      const sheetName =
        sanitizeSheetName(r.title) || `Rel_${r.id.slice(0, 6)}`;
      XLSX.utils.book_append_sheet(workbook, buildSheet(r), sheetName);
    }
  } else {
    XLSX.utils.book_append_sheet(workbook, buildSheet(report), "Relatório");
  }

  const slug = report.title
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_\-]/g, "");
  const filename = isBulk
    ? `relatorios_${Date.now()}.xlsx`
    : `relatorio_${slug || "sem_titulo"}_${Date.now()}.xlsx`;

  // type:"binary" returns a JS string where charCode of each char is the byte value.
  // This is the most Hermes-safe output type — no Uint8Array bridge issues.
  const binaryStr: string = XLSX.write(workbook, {
    type: "binary",
    bookType: "xlsx",
  });

  if (!binaryStr || binaryStr.length === 0) {
    throw new Error("Falha ao gerar o arquivo Excel (conteúdo vazio).");
  }

  const base64 = binaryStringToBase64(binaryStr);

  const fileUri = (FileSystem.cacheDirectory ?? "") + filename;
  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: "base64",
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("Compartilhamento não disponível neste dispositivo.");
  }

  await Sharing.shareAsync(fileUri, {
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    dialogTitle: isBulk ? "Exportar relatórios" : `Exportar: ${report.title}`,
    UTI: "com.microsoft.excel.xlsx",
  });
}
