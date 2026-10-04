"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ColumnCard } from "@/components/ColumnCard";
import { DataTable } from "@/components/DataTable";
import { DatasetList } from "@/components/DatasetList";
import { Overview } from "@/components/Overview";
import { api, useDataEvents, type ChangeEvent, type Dataset, type Profile } from "@/lib/api";
import { formatBytes, formatInt } from "@/lib/format";

type Tab = "overview" | "columns" | "data";
const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "columns", label: "Columns" },
  { id: "data", label: "Data" },
];

export default function Home() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [listLoaded, setListLoaded] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [connected, setConnected] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [sheetInfo, setSheetInfo] = useState<{ name: string; sheets: string[] } | null>(null);
  const [sheetChoice, setSheetChoice] = useState<{ name: string; sheet: string } | null>(null);
  const [profileResult, setProfileResult] = useState<{ key: string; profile?: Profile; error?: string } | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [reloadKey, setReloadKey] = useState(0);
  const [focusColumn, setFocusColumn] = useState<string | null>(null);

  const known = useRef<Set<string> | null>(null);

  const refreshList = useCallback(async () => {
    try {
      const list = await api.datasets();
      if (known.current) {
        const added = list.filter((d) => !known.current!.has(d.name)).map((d) => d.name);
        if (added.length) {
          setFresh((prev) => new Set([...prev, ...added]));
          setToast(added.length === 1 ? `New dataset: ${added[0]}` : `${added.length} new datasets`);
        }
      }
      known.current = new Set(list.map((d) => d.name));
      setDatasets(list);
      setListError(null);
      setSelected((cur) => (cur && list.some((d) => d.name === cur) ? cur : (list[0]?.name ?? null)));
    } catch (e) {
      setListError((e as Error).message);
    } finally {
      setListLoaded(true);
    }
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  const selectedRef = useRef(selected);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useDataEvents(
    useCallback(
      (e: ChangeEvent) => {
        refreshList();
        if (selectedRef.current && e.files.includes(selectedRef.current)) setReloadKey((k) => k + 1);
      },
      [refreshList],
    ),
    useCallback(
      (ok: boolean) => {
        setConnected(ok);
        // Pick up anything that changed while disconnected.
        if (ok) refreshList();
      },
      [refreshList],
    ),
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  // Excel files: load sheet names; the chosen sheet falls back to the first one.
  const isExcel = !!selected?.toLowerCase().endsWith(".xlsx");
  const sheets = isExcel && sheetInfo?.name === selected ? sheetInfo.sheets : [];
  const sheet = !isExcel
    ? null
    : sheetChoice?.name === selected && sheets.includes(sheetChoice.sheet)
      ? sheetChoice.sheet
      : (sheets[0] ?? null);

  useEffect(() => {
    if (!selected || !isExcel) return;
    let cancelled = false;
    api
      .sheets(selected)
      .then((s) => !cancelled && setSheetInfo({ name: selected, sheets: s }))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selected, isExcel, reloadKey]);

  // Load the profile once we know what to load (Excel waits for its sheet names).
  const profileKey = selected && (!isExcel || sheet) ? JSON.stringify([selected, sheet, reloadKey]) : null;
  const loading = profileKey !== null && profileResult?.key !== profileKey;
  const profileError = profileResult?.key === profileKey ? (profileResult?.error ?? null) : null;
  // Keep showing the previous profile of the same file/sheet while it refreshes.
  const profile =
    profileResult?.profile && profileResult.profile.name === selected && profileResult.profile.sheet === sheet
      ? profileResult.profile
      : null;

  useEffect(() => {
    if (!profileKey || !selected) return;
    let cancelled = false;
    api
      .profile(selected, sheet)
      .then((p) => !cancelled && setProfileResult({ key: profileKey, profile: p }))
      .catch((e: Error) => !cancelled && setProfileResult({ key: profileKey, error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [profileKey, selected, sheet]);

  // Scroll to a column card after jumping from the overview.
  useEffect(() => {
    if (tab !== "columns" || !focusColumn) return;
    document.getElementById(`col-${focusColumn}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    const t = setTimeout(() => setFocusColumn(null), 2000);
    return () => clearTimeout(t);
  }, [tab, focusColumn]);

  const select = (name: string) => {
    if (name === selected) return;
    setSelected(name);
    setFresh((prev) => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  };

  const current = datasets.find((d) => d.name === selected);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <DatasetList datasets={datasets} selected={selected} fresh={fresh} connected={connected} onSelect={select} />

      <main className="min-w-0 flex-1 md:h-screen md:overflow-y-auto">
        {listError && !datasets.length ? (
          <EmptyState
            title="Can't reach the backend"
            body={`${listError}. Start it with: uvicorn app.main:app --port 8000 (inside backend/).`}
          />
        ) : listLoaded && !datasets.length ? (
          <EmptyState
            title="No datasets yet"
            body="Drop a .csv or .xlsx file into the data/ folder. It will show up here automatically."
          />
        ) : current ? (
          <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
            <header className="flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold">{current.name}</h2>
                <p className="mt-0.5 text-sm text-muted">
                  {current.ext.toUpperCase()} · {formatBytes(current.size)}
                  {profile && ` · ${formatInt(profile.rows)} rows × ${formatInt(profile.columns)} columns`}
                </p>
              </div>
              {sheets.length > 1 && (
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-muted">Sheet</span>
                  <select
                    value={sheet ?? ""}
                    onChange={(e) => setSheetChoice({ name: current.name, sheet: e.target.value })}
                    className="rounded-lg border border-line bg-surface px-2 py-1.5"
                  >
                    {sheets.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              )}
            </header>

            <div className="mt-5 flex gap-1 border-b border-line">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                    tab === t.id ? "border-accent text-text" : "border-transparent text-muted hover:text-text"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="mt-6">
              {profileError ? (
                <p className="rounded-lg bg-warn-soft px-4 py-3 text-sm text-warn">{profileError}</p>
              ) : !profile ? (
                <p className="py-16 text-center text-sm text-muted">{loading ? "Analyzing dataset…" : ""}</p>
              ) : tab === "overview" ? (
                <Overview
                  profile={profile}
                  onOpenColumn={(name) => {
                    setFocusColumn(name);
                    setTab("columns");
                  }}
                />
              ) : tab === "columns" ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {profile.column_profiles.map((c) => (
                    <ColumnCard key={c.name} column={c} highlighted={c.name === focusColumn} />
                  ))}
                </div>
              ) : (
                <DataTable key={`${current.name}::${sheet}`} name={current.name} sheet={sheet} reloadKey={reloadKey} />
              )}
            </div>
          </div>
        ) : null}
      </main>

      {toast && (
        <div className="fixed right-4 bottom-4 z-50 flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm shadow-lg">
          <span className="h-2 w-2 rounded-full bg-accent" />
          {toast}
          <button onClick={() => setToast(null)} className="text-muted hover:text-text" aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid h-full min-h-[60vh] place-items-center p-8">
      <div className="max-w-md rounded-2xl border border-dashed border-line bg-surface p-8 text-center">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted">{body}</p>
      </div>
    </div>
  );
}
