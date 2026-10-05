"use client";

import { useEffect, useRef } from "react";

// In dev (`npm run dev`) the API runs separately on :8000. In the built app the
// backend serves this page itself, so requests go to the same address ("").
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "");

export type Dataset = {
  name: string;
  ext: "csv" | "xlsx";
  size: number;
  modified: number;
};

export type Kind = "numeric" | "categorical" | "text" | "datetime" | "boolean";

export type Bin = { label: string; start: number; end: number; count: number };
export type TopValue = { value: string; count: number; other?: boolean };

export type ColumnProfile = {
  name: string;
  dtype: string;
  kind: Kind;
  count: number;
  missing: number;
  missing_pct: number;
  unique: number;
  unique_pct: number;
  samples: unknown[];
  stats?: Record<string, number | string | null>;
  histogram?: Bin[];
  top_values?: TopValue[];
  timeline?: { label: string; count: number }[];
};

export type Profile = {
  name: string;
  sheet: string | null;
  rows: number;
  columns: number;
  cells: number;
  missing_cells: number;
  missing_pct: number;
  duplicate_rows: number;
  memory_bytes: number;
  kinds: Partial<Record<Kind, number>>;
  column_profiles: ColumnProfile[];
};

export type RowsPage = {
  total: number;
  offset: number;
  columns: string[];
  index: (number | string)[];
  rows: unknown[][];
};

async function get<T>(path: string, params: Record<string, string | number | boolean | null | undefined> = {}): Promise<T> {
  const url = new URL(path, API_URL || window.location.origin);
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `Request failed (${res.status})`);
  }
  return res.json();
}

const ds = (name: string) => `/api/datasets/${encodeURIComponent(name)}`;

export const api = {
  datasets: () => get<Dataset[]>("/api/datasets"),
  sheets: (name: string) => get<string[]>(`${ds(name)}/sheets`),
  profile: (name: string, sheet: string | null) => get<Profile>(`${ds(name)}/profile`, { sheet }),
  rows: (
    name: string,
    opts: { sheet: string | null; offset: number; limit: number; search: string; sort: string | null; desc: boolean },
  ) => get<RowsPage>(`${ds(name)}/rows`, opts),
};

export type ChangeEvent = { type: "changed"; files: string[]; changes: string[] };

/** Subscribes to the backend's file-watcher stream. Reconnects automatically. */
export function useDataEvents(onChange: (e: ChangeEvent) => void, onStatus?: (connected: boolean) => void) {
  const handler = useRef(onChange);
  const status = useRef(onStatus);
  useEffect(() => {
    handler.current = onChange;
    status.current = onStatus;
  });

  useEffect(() => {
    const source = new EventSource(`${API_URL}/api/events`);
    source.onopen = () => status.current?.(true);
    source.onerror = () => status.current?.(false);
    source.onmessage = (msg) => {
      try {
        handler.current(JSON.parse(msg.data));
      } catch {
        /* ignore malformed events */
      }
    };
    return () => source.close();
  }, []);
}
