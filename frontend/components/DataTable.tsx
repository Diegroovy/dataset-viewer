"use client";

import { useEffect, useState } from "react";
import { api, type RowsPage } from "@/lib/api";
import { formatInt, formatValue } from "@/lib/format";

const PAGE_SIZE = 50;

type Props = { name: string; sheet: string | null; reloadKey: number };

export function DataTable({ name, sheet, reloadKey }: Props) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<string | null>(null);
  const [desc, setDesc] = useState(false);
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: RowsPage; error?: string } | null>(null);

  const requestKey = JSON.stringify([name, sheet, page, query, sort, desc, reloadKey]);
  const loading = result?.key !== requestKey;
  const data = result?.data ?? null;
  const error = result?.error ?? null;

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    api
      .rows(name, { sheet, offset: page * PAGE_SIZE, limit: PAGE_SIZE, search: query, sort, desc })
      .then((d) => !cancelled && setResult({ key: requestKey, data: d }))
      .catch((e: Error) => !cancelled && setResult((prev) => ({ key: requestKey, data: prev?.data, error: e.message })));
    return () => {
      cancelled = true;
    };
  }, [name, sheet, page, query, sort, desc, requestKey]);

  const toggleSort = (col: string) => {
    if (sort !== col) {
      setSort(col);
      setDesc(false);
    } else if (!desc) {
      setDesc(true);
    } else {
      setSort(null);
      setDesc(false);
    }
    setPage(0);
  };

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total ? page * PAGE_SIZE + 1 : 0;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search all columns…"
          className="w-full max-w-sm rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <span className="tabular text-sm text-muted">
          {loading ? "Loading…" : `${formatInt(from)}–${formatInt(to)} of ${formatInt(total)} rows`}
        </span>
      </div>

      {error && <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">{error}</p>}

      <div className={`overflow-auto rounded-xl border border-line bg-surface ${loading ? "opacity-60" : ""}`} style={{ maxHeight: "65vh" }}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-surface-2 text-left text-xs text-muted">
            <tr>
              <th className="px-3 py-2.5 font-medium">#</th>
              {data?.columns.map((col) => (
                <th key={col} className="px-3 py-2.5 font-medium whitespace-nowrap">
                  <button onClick={() => toggleSort(col)} className="flex items-center gap-1 hover:text-text">
                    {col}
                    <span className="text-accent">{sort === col ? (desc ? "↓" : "↑") : ""}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.rows.map((row, i) => (
              <tr key={`${data.index[i]}`} className="border-t border-line hover:bg-surface-2">
                <td className="tabular px-3 py-1.5 text-xs text-muted">{String(data.index[i])}</td>
                {row.map((v, j) => (
                  <td
                    key={j}
                    className={`max-w-xs truncate px-3 py-1.5 whitespace-nowrap ${typeof v === "number" ? "tabular text-right" : ""}`}
                    title={v === null ? "missing" : String(v)}
                  >
                    {v === null ? <span className="text-xs text-muted italic">null</span> : formatValue(v)}
                  </td>
                ))}
              </tr>
            ))}
            {data && data.rows.length === 0 && (
              <tr>
                <td colSpan={data.columns.length + 1} className="px-3 py-10 text-center text-muted">
                  No matching rows
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2 text-sm">
        <button
          onClick={() => setPage(0)}
          disabled={page === 0}
          className="rounded-md border border-line bg-surface px-2.5 py-1 disabled:opacity-40"
        >
          «
        </button>
        <button
          onClick={() => setPage((p) => p - 1)}
          disabled={page === 0}
          className="rounded-md border border-line bg-surface px-2.5 py-1 disabled:opacity-40"
        >
          Prev
        </button>
        <span className="tabular px-2 text-muted">
          Page {formatInt(page + 1)} / {formatInt(pages)}
        </span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={page >= pages - 1}
          className="rounded-md border border-line bg-surface px-2.5 py-1 disabled:opacity-40"
        >
          Next
        </button>
        <button
          onClick={() => setPage(pages - 1)}
          disabled={page >= pages - 1}
          className="rounded-md border border-line bg-surface px-2.5 py-1 disabled:opacity-40"
        >
          »
        </button>
      </div>
    </div>
  );
}
