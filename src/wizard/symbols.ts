export function formatDefaultSymbolsText(value: unknown): string {
  if (!Array.isArray(value)) return "NASDAQ:AAPL | Apple\nNASDAQ:MSFT | Microsoft\nNASDAQ:NVDA | Nvidia";

  return value.map((item) => {
    if (Array.isArray(item)) return `${String(item[1] ?? item[0] ?? "").split("|")[0]} | ${String(item[0] ?? "")}`;
    if (item && typeof item === "object" && "proName" in item) {
      const record = item as { proName?: unknown; title?: unknown };
      return `${String(record.proName ?? "")} | ${String(record.title ?? "")}`;
    }
    return String(item ?? "");
  }).filter(Boolean).join("\n");
}

export function parseSymbolsText(value: string, widgetId: string): unknown[] {
  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const fallback = ["NASDAQ:AAPL | Apple", "NASDAQ:MSFT | Microsoft", "NASDAQ:NVDA | Nvidia"];
  const source = lines.length ? lines : fallback;

  if (widgetId === "symbol-overview") {
    return source.map((line) => {
      const [symbolPart, titlePart] = splitSymbolLine(line);
      const title = titlePart || symbolPart;
      return [title, `${symbolPart}|1D`];
    });
  }

  return source.map((line) => {
    const [symbolPart, titlePart] = splitSymbolLine(line);
    return { proName: symbolPart, title: titlePart || symbolPart };
  });
}

function splitSymbolLine(line: string): [string, string] {
  const [symbolRaw, titleRaw] = line.split("|");
  return [(symbolRaw ?? "").trim(), (titleRaw ?? "").trim()];
}
