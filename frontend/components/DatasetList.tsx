"use client";

import type { Dataset } from "@/lib/api";
import { formatBytes, timeAgo } from "@/lib/format";

type Props = {
  datasets: Dataset[];
  selected: string | null;
  fresh: Set<string>;
  connected: boolean;
  onSelect: (name: string) => void;
};

export function DatasetList({ datasets, selected, fresh, connected, onSelect }: Props) {
  return (
    <aside className="flex flex-col border-b border-line bg-surface md:h-screen md:w-72 md:shrink-0 md:border-b-0 md:border-r">
      <div className="flex items-center justify-between px-4 py-4">
        <div>
          <h1 className="text-base font-semibold">Dataset Viewer</h1>
          <p className="text-xs text-muted">
            {datasets.length} file{datasets.length === 1 ? "" : "s"} in <code>data/</code>
          </p>
        </div>
        <span
          className="flex items-center gap-1.5 text-xs text-muted"
          title={connected ? "Watching data/ for changes" : "Not connected to the backend"}
        >
          <span className={`h-2 w-2 rounded-full ${connected ? "bg-ok" : "bg-warn"}`} />
          {connected ? "Live" : "Offline"}
        </span>
      </div>

      <nav className="flex gap-2 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:gap-1 md:overflow-y-auto md:overflow-x-visible">
        {datasets.length === 0 && (
          <p className="px-1 text-sm text-muted">No files yet.</p>
        )}
        {datasets.map((d) => {
          const active = d.name === selected;
          return (
            <button
              key={d.name}
              onClick={() => onSelect(d.name)}
              className={`flex min-w-52 items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors md:min-w-0 ${
                active ? "bg-accent-soft" : "hover:bg-surface-2"
              }`}
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-md text-[10px] font-bold uppercase ${
                  d.ext === "csv" ? "bg-ok-soft text-ok" : "bg-accent-soft text-accent"
                }`}
              >
                {d.ext}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className={`truncate text-sm ${active ? "font-semibold" : "font-medium"}`}>{d.name}</span>
                  {fresh.has(d.name) && (
                    <span className="rounded bg-accent px-1.5 py-px text-[10px] font-semibold text-white">NEW</span>
                  )}
                </span>
                <span className="block text-xs text-muted">
                  {formatBytes(d.size)} · {timeAgo(d.modified)}
                </span>
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
