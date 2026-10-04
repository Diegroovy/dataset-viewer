import type { Kind } from "@/lib/api";

const STYLES: Record<Kind, string> = {
  numeric: "bg-accent-soft text-accent",
  categorical: "bg-ok-soft text-ok",
  text: "bg-surface-2 text-muted",
  datetime: "bg-warn-soft text-warn",
  boolean: "bg-surface-2 text-text",
};

export function KindBadge({ kind }: { kind: Kind }) {
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${STYLES[kind]}`}>{kind}</span>
  );
}
