import { Alert, Platform, Share } from "react-native";
import * as FileSystem from "expo-file-system";
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

  const filename = isBulk
    ? `relatorios_7dias_${Date.now()}`
    : `relatorio_${report.title.replace(/\s+/g, "_")}_${Date.now()}`;

  if (Platform.OS === "web") {
    XLSX.writeFile(workbook, `${filename}.xlsx`);
    return;
  }

  const base64 = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });
  const fileUri = `${FileSystem.documentDirectory ?? ""}${filename}.xlsx`;

  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  await Share.share({
    url: fileUri,
    title: isBulk ? "Relatórios — últimos 7 dias" : `Relatório: ${report.title}`,
    message: isBulk ? "Relatórios — últimos 7 dias" : `Relatório: ${report.title}`,
  });
}
