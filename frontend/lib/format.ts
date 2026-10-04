export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}

export function formatInt(n: number): string {
  return n.toLocaleString("en-US");
}

export function formatNumber(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (typeof n === "string") return formatValue(n);
  if (Number.isInteger(n)) return n.toLocaleString("en-US");
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 0.001 || abs >= 1e12)) return n.toExponential(3);
  return n.toLocaleString("en-US", { maximumFractionDigits: abs < 10 ? 4 : 2 });
}

export function formatPct(n: number): string {
  if (n === 0) return "0%";
  if (n < 0.1) return "<0.1%";
  return `${n.toFixed(n < 10 ? 1 : 0)}%`;
}

/** Trims midnight time components from ISO dates for display. */
export function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return formatNumber(v);
  if (typeof v === "string") return v.replace(/^(\d{4}-\d{2}-\d{2})T00:00:00$/, "$1").replace("T", " ");
  return String(v);
}

export function timeAgo(epochSeconds: number): string {
  const s = Math.max(0, Date.now() / 1000 - epochSeconds);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`;
  return new Date(epochSeconds * 1000).toLocaleDateString();
}
