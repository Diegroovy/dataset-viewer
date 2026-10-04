"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ColumnProfile } from "@/lib/api";
import { formatInt, formatNumber, formatPct, formatValue } from "@/lib/format";
import { KindBadge } from "./KindBadge";

const STAT_LABELS: Record<string, string> = {
  mean: "Mean",
  std: "Std dev",
  min: "Min",
  p25: "25%",
  median: "Median",
  p75: "75%",
  max: "Max",
  sum: "Sum",
  zeros: "Zeros",
  negatives: "Negatives",
  range_days: "Range (days)",
  min_length: "Min length",
  mean_length: "Avg length",
  max_length: "Max length",
};

const tooltipStyle = {
  contentStyle: {
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: 8,
    fontSize: 12,
    color: "var(--text)",
  },
  labelStyle: { color: "var(--muted)" },
  cursor: { fill: "var(--surface-2)" },
};

const axisTick = { fill: "var(--muted)", fontSize: 11 };

function Histogram({ data }: { data: { label: string; count: number; range?: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barCategoryGap={1}>
        <CartesianGrid vertical={false} stroke="var(--line)" />
        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: "var(--line)" }} minTickGap={16} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          {...tooltipStyle}
          labelFormatter={(label, payload) => payload?.[0]?.payload?.range ?? label}
          formatter={(v) => [formatInt(Number(v)), "Count"]}
        />
        <Bar dataKey="count" fill="var(--accent)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function TopValues({ data, total }: { data: { value: string; count: number; other?: boolean }[]; total: number }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(80, data.length * 24 + 8)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }} barCategoryGap={3}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="value"
          width={120}
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: string) => (v.length > 18 ? `${v.slice(0, 17)}…` : v)}
        />
        <Tooltip
          {...tooltipStyle}
          formatter={(v) => [`${formatInt(Number(v))} (${formatPct((Number(v) / total) * 100)})`, "Count"]}
        />
        <Bar
          dataKey="count"
          radius={[0, 3, 3, 0]}
          isAnimationActive={false}
          label={{ position: "right", fill: "var(--muted)", fontSize: 11 }}
        >
          {data.map((d) => (
            <Cell key={d.value} fill={d.other ? "var(--muted)" : "var(--accent)"} fillOpacity={d.other ? 0.5 : 1} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ColumnCard({ column, highlighted }: { column: ColumnProfile; highlighted?: boolean }) {
  const c = column;
  const stats = Object.entries(c.stats ?? {});

  return (
    <section
      id={`col-${c.name}`}
      className={`scroll-mt-4 rounded-xl border bg-surface p-4 transition-shadow ${
        highlighted ? "border-accent ring-2 ring-accent-soft" : "border-line"
      }`}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="min-w-0 truncate font-semibold" title={c.name}>
          {c.name}
        </h3>
        <span className="flex items-center gap-2">
          <KindBadge kind={c.kind} />
          <span className="font-mono text-xs text-muted">{c.dtype}</span>
        </span>
      </header>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg bg-surface-2 px-2.5 py-2">
          <dt className="text-muted">Non-null</dt>
          <dd className="tabular font-semibold">{formatInt(c.count)}</dd>
        </div>
        <div className="rounded-lg bg-surface-2 px-2.5 py-2">
          <dt className="text-muted">Missing</dt>
          <dd className={`tabular font-semibold ${c.missing ? "text-warn" : ""}`}>
            {formatInt(c.missing)} <span className="font-normal text-muted">({formatPct(c.missing_pct)})</span>
          </dd>
        </div>
        <div className="rounded-lg bg-surface-2 px-2.5 py-2">
          <dt className="text-muted">Unique</dt>
          <dd className="tabular font-semibold">
            {formatInt(c.unique)} <span className="font-normal text-muted">({formatPct(c.unique_pct)})</span>
          </dd>
        </div>
      </dl>

      {stats.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
          {stats.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2 border-b border-line py-1">
              <dt className="text-muted">{STAT_LABELS[k] ?? k}</dt>
              <dd className="tabular truncate font-medium" title={String(v)}>
                {typeof v === "string" ? formatValue(v) : formatNumber(v)}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-4">
        {c.histogram && c.histogram.length > 0 && (
          <Histogram
            data={c.histogram.map((b) => ({
              label: b.label,
              count: b.count,
              range: b.start === b.end ? formatNumber(b.start) : `${formatNumber(b.start)} – ${formatNumber(b.end)}`,
            }))}
          />
        )}
        {c.timeline && c.timeline.length > 0 && <Histogram data={c.timeline} />}
        {c.top_values && c.top_values.length > 0 && <TopValues data={c.top_values} total={c.count} />}
        {c.count === 0 && <p className="py-6 text-center text-sm text-muted">Column is empty</p>}
      </div>
    </section>
  );
}
