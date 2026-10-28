"use client";

import { fmtDur, fmtNum, fmtPct, hourLabel, shortDate } from "@/lib/format";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Urutan warna kategori tetap (tervalidasi CVD), mengikuti token CSS.
export const SERIES = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s6)"];

type Fmt = (v: number) => string;
export type FmtKey = "num" | "pct" | "pct0" | "dur" | "dec1" | "dec2";
export type XFmtKey = "date" | "hour" | "none";

const FMT: Record<FmtKey, Fmt> = {
  num: (v) => fmtNum(v),
  pct: (v) => fmtPct(v),
  pct0: (v) => fmtPct(v, 0),
  dur: (v) => fmtDur(v),
  dec1: (v) => fmtNum(v, 1),
  dec2: (v) => fmtNum(v, 2),
};
const XFMT: Record<XFmtKey, ((v: string) => string) | undefined> = {
  date: (v) => shortDate(v),
  hour: (v) => hourLabel(Number(v)),
  none: undefined,
};

const axisProps = {
  tick: { fill: "var(--ink-3)", fontSize: 11 },
  axisLine: { stroke: "var(--border)" },
  tickLine: false,
} as const;

function TooltipBox({
  active,
  payload,
  label,
  fmt,
  labelFmt,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string; dataKey?: string; payload?: Record<string, unknown> }[];
  label?: string | number;
  fmt: Fmt;
  labelFmt?: (l: string) => string;
}) {
  if (!active || !payload?.length) return null;
  const title = label != null && label !== "" ? (labelFmt ? labelFmt(String(label)) : String(label)) : String(payload[0]?.payload?.name ?? "");
  return (
    <div className="min-w-36 rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-semibold text-ink">{title}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 text-ink-2">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: p.color }} aria-hidden />
            {p.name}
          </span>
          <span className="tabular font-semibold text-ink">{typeof p.value === "number" ? fmt(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Bar tunggal (vertikal / horizontal) untuk ranking & komposisi. */
export function Bars({
  data,
  horizontal,
  height = 260,
  color = 0,
  fmt: fmtKey = "num",
  name = "Total",
  labelWidth = 170,
  showLabels = true,
}: {
  data: { name: string; value: number }[];
  horizontal?: boolean;
  height?: number;
  color?: number;
  fmt?: FmtKey;
  name?: string;
  labelWidth?: number;
  showLabels?: boolean;
}) {
  const fmt = FMT[fmtKey];
  const axisFmt = FMT[fmtKey === "pct" ? "pct0" : fmtKey];
  const h = horizontal ? Math.max(height, data.length * 30 + 30) : height;
  return (
    <div style={{ height: h }} className="w-full">
      <ResponsiveContainer>
        <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 18, right: horizontal ? 48 : 8, left: 0, bottom: 0 }} barCategoryGap={horizontal ? 6 : "22%"}>
          <CartesianGrid stroke="var(--grid)" horizontal={!horizontal} vertical={!!horizontal} />
          {horizontal ? (
            <>
              <XAxis type="number" {...axisProps} tickFormatter={(v) => axisFmt(v)} />
              <YAxis type="category" dataKey="name" width={labelWidth} {...axisProps} interval={0} tick={{ fill: "var(--ink-2)", fontSize: 11 }} />
            </>
          ) : (
            <>
              <XAxis dataKey="name" {...axisProps} interval={0} tick={{ fill: "var(--ink-2)", fontSize: 11 }} />
              <YAxis {...axisProps} width={44} tickFormatter={(v) => axisFmt(v)} />
            </>
          )}
          <Tooltip cursor={{ fill: "var(--surface-2)" }} content={<TooltipBox fmt={fmt} />} />
          <Bar dataKey="value" name={name} fill={SERIES[color]} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={horizontal ? 22 : 44}>
            {showLabels && (
              <LabelList dataKey="value" position={horizontal ? "right" : "top"} formatter={(v: unknown) => fmt(Number(v))} style={{ fill: "var(--ink-2)", fontSize: 11, fontWeight: 600 }} />
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Bar berkelompok / bertumpuk dengan beberapa seri. */
export function GroupBars({
  data,
  xKey = "name",
  series,
  height = 280,
  fmt: fmtKey = "num",
  stacked,
  horizontal,
  labels,
  labelWidth = 200,
  domain,
}: {
  data: Record<string, unknown>[];
  xKey?: string;
  series: { key: string; label: string; color?: string }[];
  height?: number;
  fmt?: FmtKey;
  stacked?: boolean;
  horizontal?: boolean;
  labels?: boolean;
  labelWidth?: number;
  domain?: [number | string, number | string];
}) {
  const fmt = FMT[fmtKey];
  const axisFmt = FMT[fmtKey === "pct" ? "pct0" : fmtKey];
  const h = horizontal ? Math.max(height, data.length * (stacked ? 30 : 22 * series.length + 10) + 50) : height;
  return (
    <div style={{ height: h }} className="w-full">
      <ResponsiveContainer>
        <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 18, right: 16, left: 0, bottom: 0 }} barGap={2}>
          <CartesianGrid stroke="var(--grid)" horizontal={!horizontal} vertical={!!horizontal} />
          {horizontal ? (
            <>
              <XAxis type="number" {...axisProps} tickFormatter={(v) => axisFmt(v)} domain={domain} />
              <YAxis type="category" dataKey={xKey} width={labelWidth} {...axisProps} interval={0} tick={{ fill: "var(--ink-2)", fontSize: 11 }} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} {...axisProps} interval={0} tick={{ fill: "var(--ink-2)", fontSize: 11 }} />
              <YAxis {...axisProps} width={48} tickFormatter={(v) => axisFmt(v)} domain={domain} />
            </>
          )}
          <Tooltip cursor={{ fill: "var(--surface-2)" }} content={<TooltipBox fmt={fmt} />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "var(--ink-2)" }} />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={s.color ?? SERIES[i % SERIES.length]}
              stackId={stacked ? "a" : undefined}
              radius={stacked ? (i === series.length - 1 ? (horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]) : 0) : horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
              maxBarSize={horizontal ? 18 : 36}
              stroke="var(--surface)"
              strokeWidth={stacked ? 1 : 0}
            >
              {labels && !stacked && (
                <LabelList dataKey={s.key} position={horizontal ? "right" : "top"} formatter={(v: unknown) => (v ? fmt(Number(v)) : "")} style={{ fill: "var(--ink-2)", fontSize: 10, fontWeight: 600 }} />
              )}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Garis (satu sumbu). */
export function Lines({
  data,
  xKey = "name",
  series,
  height = 260,
  fmt: fmtKey = "num",
  xFmt: xFmtKey = "none",
  domain,
  labels,
}: {
  data: Record<string, unknown>[];
  xKey?: string;
  series: { key: string; label: string; color?: string }[];
  height?: number;
  fmt?: FmtKey;
  xFmt?: XFmtKey;
  domain?: [number | string, number | string];
  labels?: boolean;
}) {
  const fmt = FMT[fmtKey];
  const axisFmt = FMT[fmtKey === "pct" ? "pct0" : fmtKey];
  const xFmt = XFMT[xFmtKey];
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 20, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey={xKey} {...axisProps} tickFormatter={xFmt} minTickGap={8} />
          <YAxis {...axisProps} width={52} tickFormatter={(v) => axisFmt(v)} domain={domain} />
          <Tooltip cursor={{ stroke: "var(--ink-3)", strokeDasharray: "3 3" }} content={<TooltipBox fmt={fmt} labelFmt={xFmt} />} />
          {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "var(--ink-2)" }} />}
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color ?? SERIES[i % SERIES.length]}
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 2, fill: "var(--surface)" }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)" }}
            >
              {labels && <LabelList dataKey={s.key} position="top" formatter={(v: unknown) => fmt(Number(v))} style={{ fill: "var(--ink-2)", fontSize: 10 }} />}
            </Line>
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Donut untuk komposisi kecil (≤ 6 kategori). */
export function Donut({
  data,
  height = 240,
  fmt: fmtKey = "num",
  center,
}: {
  data: { name: string; value: number }[];
  height?: number;
  fmt?: FmtKey;
  center?: { value: string; label: string };
}) {
  const fmt = FMT[fmtKey];
  const axisFmt = FMT[fmtKey === "pct" ? "pct0" : fmtKey];
  const total = data.reduce((a, b) => a + b.value, 0) || 1;
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row">
      <div style={{ height, width: height }} className="relative shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Tooltip content={<TooltipBox fmt={fmt} />} />
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={1.5} stroke="var(--surface)" strokeWidth={2}>
              {data.map((_, i) => (
                <Cell key={i} fill={SERIES[i % SERIES.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {center && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="tabular text-xl font-bold text-ink">{center.value}</div>
              <div className="text-[11px] text-ink-3">{center.label}</div>
            </div>
          </div>
        )}
      </div>
      <ul className="w-full space-y-1.5 text-[13px]">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 text-ink-2">
              <span className="size-2.5 shrink-0 rounded-sm" style={{ background: SERIES[i % SERIES.length] }} aria-hidden />
              <span className="truncate">{d.name}</span>
            </span>
            <span className="tabular shrink-0 font-semibold text-ink">
              {fmt(d.value)} <span className="font-normal text-ink-3">· {((d.value / total) * 100).toFixed(1).replace(".", ",")}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Progress bar sederhana untuk skor 0..1. */
export function ScoreBar({ value, target = 0.95 }: { value: number; target?: number }) {
  const ok = value >= target;
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-2 ring-1 ring-line">
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, value * 100)}%`, background: ok ? "var(--s1)" : "var(--s3)" }} />
      <div className="absolute top-0 h-full w-px bg-ink-3" style={{ left: `${target * 100}%` }} aria-hidden />
    </div>
  );
}
