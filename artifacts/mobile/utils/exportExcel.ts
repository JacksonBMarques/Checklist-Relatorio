import { Alert, Platform, Share } from "react-native";
import * as FileSystem from "expo-file-system";
import * as XLSX from "xlsx";
import { Report } from "@/context/ChecklistContext";

export async function exportReportAsCSV(report: Report): Promise<void> {
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

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  worksheet["!cols"] = [
    { wch: 28 },
    { wch: 40 },
    { wch: 10 },
    { wch: 50 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório");

  const filename = `relatorio_${report.title.replace(/\s+/g, "_")}_${Date.now()}`;

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
    title: `Relatório: ${report.title}`,
    message: `Relatório: ${report.title}`,
  });
}
