"use client";

import type { Profile } from "@/lib/api";
import { formatBytes, formatInt, formatPct, formatValue } from "@/lib/format";
import { KindBadge } from "./KindBadge";

function Stat({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className={`tabular mt-1 text-2xl font-semibold ${warn ? "text-warn" : ""}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

export function Overview({ profile, onOpenColumn }: { profile: Profile; onOpenColumn: (name: string) => void }) {
  const kinds = Object.entries(profile.kinds)
    .map(([k, n]) => `${n} ${k}`)
    .join(" · ");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Rows" value={formatInt(profile.rows)} />
        <Stat label="Columns" value={formatInt(profile.columns)} sub={kinds} />
        <Stat
          label="Missing cells"
          value={formatPct(profile.missing_pct)}
          sub={`${formatInt(profile.missing_cells)} of ${formatInt(profile.cells)}`}
          warn={profile.missing_cells > 0}
        />
        <Stat
          label="Duplicate rows"
          value={formatInt(profile.duplicate_rows)}
          sub={profile.rows ? formatPct((profile.duplicate_rows / profile.rows) * 100) : undefined}
          warn={profile.duplicate_rows > 0}
        />
        <Stat label="Memory" value={formatBytes(profile.memory_bytes)} />
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">#</th>
                <th className="px-4 py-2.5 font-medium">Column</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 text-right font-medium">Non-null</th>
                <th className="px-4 py-2.5 font-medium">Missing</th>
                <th className="px-4 py-2.5 text-right font-medium">Unique</th>
                <th className="px-4 py-2.5 font-medium">Sample values</th>
              </tr>
            </thead>
            <tbody>
              {profile.column_profiles.map((c, i) => (
                <tr key={c.name} className="border-t border-line hover:bg-surface-2">
                  <td className="tabular px-4 py-2 text-muted">{i + 1}</td>
                  <td className="px-4 py-2">
                    <button onClick={() => onOpenColumn(c.name)} className="font-medium hover:text-accent hover:underline">
                      {c.name}
                    </button>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <KindBadge kind={c.kind} /> <span className="ml-1 font-mono text-xs text-muted">{c.dtype}</span>
                  </td>
                  <td className="tabular px-4 py-2 text-right">{formatInt(c.count)}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full bg-warn" style={{ width: `${c.missing_pct}%` }} />
                      </div>
                      <span className={`tabular text-xs ${c.missing ? "text-warn" : "text-muted"}`}>
                        {formatPct(c.missing_pct)}
                      </span>
                    </div>
                  </td>
                  <td className="tabular px-4 py-2 text-right">{formatInt(c.unique)}</td>
                  <td className="max-w-xs truncate px-4 py-2 text-xs text-muted">
                    {c.samples.map(formatValue).join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
