import clsx from "clsx";
import { ArrowDownRight, ArrowUpRight, Lightbulb, Minus, Sparkles, Target } from "lucide-react";
import type { SlideInsight } from "@/lib/types";

export function Card({
  title,
  subtitle,
  source,
  right,
  className,
  children,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  source?: string;
  right?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={clsx("card fade-up p-5", className)}>
      {(title || right) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h3 className="text-[15px] font-semibold leading-tight text-ink">{title}</h3>}
            {subtitle && <p className="mt-1 text-xs text-ink-3">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {source && (
              <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-ink-3 ring-1 ring-line">
                {source}
              </span>
            )}
            {right}
          </div>
        </header>
      )}
      {children}
    </section>
  );
}

export type Trend = "up-good" | "up-bad" | "neutral";

export function Delta({ value, text, trend = "up-good" }: { value: number; text: string; trend?: Trend }) {
  if (!Number.isFinite(value) || value === 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-ink-3">
        <Minus size={12} aria-hidden /> {text}
      </span>
    );
  const good = trend === "neutral" ? null : (value > 0) === (trend === "up-good");
  const Icon = value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold",
        good === null && "bg-surface-2 text-ink-2",
        good === true && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        good === false && "bg-red-500/10 text-red-700 dark:text-red-300",
      )}
    >
      <Icon size={12} aria-hidden />
      {text}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
  delta,
  icon,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  delta?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "default" | "brand";
}) {
  return (
    <div
      className={clsx(
        "card fade-up flex flex-col gap-2 p-4",
        tone === "brand" && "!border-transparent bg-gradient-to-br from-emerald-600 to-green-800 text-white",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={clsx("text-xs font-medium", tone === "brand" ? "text-emerald-50/90" : "text-ink-3")}>{label}</span>
        {icon && (
          <span
            className={clsx(
              "grid size-8 place-items-center rounded-xl",
              tone === "brand" ? "bg-white/15 text-white" : "bg-brand-soft text-brand",
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="tabular text-2xl font-bold tracking-tight">{value}</div>
      <div className="flex min-h-5 flex-wrap items-center gap-2">
        {delta}
        {hint && <span className={clsx("text-xs", tone === "brand" ? "text-emerald-50/80" : "text-ink-3")}>{hint}</span>}
      </div>
    </div>
  );
}

export function SectionTitle({ title, desc, right }: { title: string; desc?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-4 mt-10 flex flex-wrap items-end justify-between gap-3 first:mt-0">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-ink">{title}</h2>
        {desc && <p className="mt-0.5 text-sm text-ink-3">{desc}</p>}
      </div>
      {right}
    </div>
  );
}

export function InsightPanel({ insight, compact }: { insight?: SlideInsight; compact?: boolean }) {
  if (!insight || (!insight.highlight.length && !insight.action.length)) return null;
  return (
    <div className={clsx("grid gap-3", !compact && insight.action.length > 0 && "md:grid-cols-2")}>
      {insight.highlight.length > 0 && (
        <div className="rounded-2xl bg-brand-soft/70 p-4 ring-1 ring-brand/10">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-ink">
            <Lightbulb size={14} aria-hidden /> Highlight
          </div>
          <ul className="space-y-1.5 text-[13px] leading-relaxed text-ink-2">
            {insight.highlight.map((h, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {insight.action.length > 0 && (
        <div className="rounded-2xl bg-amber-500/8 p-4 ring-1 ring-amber-500/15">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            <Target size={14} aria-hidden /> Action
          </div>
          <ul className="space-y-1.5 text-[13px] leading-relaxed text-ink-2">
            {insight.action.map((h, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="card grid place-items-center gap-2 p-10 text-center">
      <Sparkles className="text-brand" aria-hidden />
      <div className="font-semibold">{title}</div>
      {children && <div className="max-w-md text-sm text-ink-3">{children}</div>}
    </div>
  );
}

export function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "bad" | "brand" }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        tone === "neutral" && "bg-surface-2 text-ink-2 ring-1 ring-line",
        tone === "good" && "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
        tone === "bad" && "bg-red-500/12 text-red-700 dark:text-red-300",
        tone === "brand" && "bg-brand-soft text-brand-ink",
      )}
    >
      {children}
    </span>
  );
}

export function DataTable({
  head,
  rows,
  align,
  dense,
}: {
  head: React.ReactNode[];
  rows: React.ReactNode[][];
  align?: ("left" | "right" | "center")[];
  dense?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-xl ring-1 ring-line">
      <table className="w-full text-left text-[13px]">
        <thead className="bg-surface-2 text-xs uppercase tracking-wide text-ink-3">
          <tr>
            {head.map((h, i) => (
              <th key={i} className={clsx("px-3 font-semibold", dense ? "py-2" : "py-2.5", align?.[i] === "right" && "text-right", align?.[i] === "center" && "text-center")}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-surface-2/60">
              {r.map((c, j) => (
                <td key={j} className={clsx("tabular px-3 text-ink-2", dense ? "py-1.5" : "py-2.5", align?.[j] === "right" && "text-right", align?.[j] === "center" && "text-center")}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
