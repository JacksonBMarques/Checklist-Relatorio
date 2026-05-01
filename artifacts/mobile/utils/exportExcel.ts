import { Platform, Share, Alert } from "react-native";
import * as FileSystem from "expo-file-system";
import { Report } from "@/context/ChecklistContext";

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function exportReportAsCSV(report: Report): Promise<void> {
  const rows: string[] = [];

  rows.push(escapeCSV("Relatório: " + report.title));
  rows.push(escapeCSV("Data: " + new Date(report.createdAt).toLocaleDateString("pt-BR")));
  rows.push("");
  rows.push(
    [
      escapeCSV("Categoria"),
      escapeCSV("Item"),
      escapeCSV("Resposta"),
      escapeCSV("Observações"),
    ].join(",")
  );

  for (const cat of report.categories) {
    for (const item of cat.items) {
      rows.push(
        [
          escapeCSV(cat.name),
          escapeCSV(item.label),
          escapeCSV(item.answer === "sim" ? "Sim" : item.answer === "nao" ? "Não" : "—"),
          escapeCSV(item.observation || ""),
        ].join(",")
      );
    }
    if (cat.items.length === 0) {
      rows.push([escapeCSV(cat.name), escapeCSV("(sem itens)"), "", ""].join(","));
    }
  }

  const csvContent = "\uFEFF" + rows.join("\n");

  if (Platform.OS === "web") {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_${report.title.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const fileUri =
    (FileSystem.documentDirectory ?? "") +
    `relatorio_${report.title.replace(/\s+/g, "_")}_${Date.now()}.csv`;

  await FileSystem.writeAsStringAsync(fileUri, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  await Share.share({
    url: fileUri,
    title: `Relatório: ${report.title}`,
    message: `Relatório: ${report.title}`,
  });
}
