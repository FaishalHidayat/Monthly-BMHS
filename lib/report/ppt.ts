// Generator PPT (berjalan di browser) mengikuti struktur template Report CC BMHS.
// Grafik memakai chart native PowerPoint sehingga tetap bisa diedit.
import PptxGenJS from "pptxgenjs";
import { fmtDur, fmtNum, fmtPct, hourLabel, signed } from "../format";

import type { InsightMap, Period, QualityBlock, SlideInsight } from "../types";

type Slide = PptxGenJS.Slide;

// Palet hijau (base) + aksen tervalidasi
const C = {
  green: "15803D",
  greenDark: "0F5F2D",
  greenMid: "1F9D55",
  greenSoft: "E8F6EE",
  greenLine: "BFE5CE",
  ink: "102A1C",
  ink2: "4B5A52",
  ink3: "7C8A82",
  amber: "F59E0B",
  amberSoft: "FFF6E5",
  white: "FFFFFF",
  grid: "E5ECE8",
  s: ["16A34A", "2A78D6", "EB6834", "6250D6", "EDA100", "E87BA4"],
};
const FONT = "Calibri";
const W = 13.333;

let ORIGIN = "";
const asset = (p: string) => `${ORIGIN}${p}`;

// ---------------------------------------------------------------- helpers

function autoSize(text: string, w: number, h: number, base = 12, min = 8) {
  // Perkiraan kasar: karakter per inci persegi pada ukuran font tertentu.
  for (let size = base; size > min; size -= 0.5) {
    const charsPerLine = (w * 72) / (size * 0.5);
    const lines = text.split("\n").reduce((a, l) => a + Math.max(1, Math.ceil(l.length / charsPerLine)), 0);
    if (lines * size * 1.35 <= h * 72) return size;
  }
  return min;
}

function header(slide: Slide, title: string, source: string, period: string) {
  slide.addText(title.toUpperCase(), { x: 0.45, y: 0.18, w: 9.4, h: 0.55, fontFace: FONT, fontSize: 22, bold: true, color: C.white, valign: "middle", margin: 0 });
  slide.addText(period, { x: 0.45, y: 0.72, w: 8, h: 0.3, fontFace: FONT, fontSize: 11, color: "D7F5E2", margin: 0 });
  slide.addShape("roundRect", { x: W - 3.05, y: 0.36, w: 2.6, h: 0.42, fill: { color: C.white, transparency: 82 }, line: { color: C.white, transparency: 60, width: 0.75 }, rectRadius: 0.2 });
  slide.addText(`Sumber: ${source}`, { x: W - 3.05, y: 0.36, w: 2.6, h: 0.42, fontFace: FONT, fontSize: 10, color: C.white, align: "center", valign: "middle", margin: 0 });
}

function bullets(lines: string[], size: number, color = C.ink2) {
  return lines.map((t) => ({
    text: t,
    options: { bullet: { indent: 12 }, fontSize: size, color, fontFace: FONT, paraSpaceAfter: 3, breakLine: true },
  }));
}

/** Kotak Highlight / Action. */
function insightBox(slide: Slide, kind: "Highlight" | "Action", lines: string[], x: number, y: number, w: number, h: number) {
  if (!lines?.length) return;
  const action = kind === "Action";
  slide.addShape("roundRect", { x, y, w, h, fill: { color: action ? C.amberSoft : C.greenSoft }, line: { color: action ? "F8DDA8" : C.greenLine, width: 0.75 }, rectRadius: 0.08 });
  slide.addShape("rect", { x, y: y + 0.12, w: 0.06, h: 0.32, fill: { color: action ? C.amber : C.green }, line: { type: "none" } });
  slide.addText(kind.toUpperCase(), { x: x + 0.18, y: y + 0.08, w: w - 0.3, h: 0.36, fontFace: FONT, fontSize: 11, bold: true, color: action ? "B45309" : C.greenDark, margin: 0 });
  const size = autoSize(lines.join("\n"), w - 0.4, h - 0.55, 11.5, 7.5);
  slide.addText(bullets(lines, size), { x: x + 0.12, y: y + 0.45, w: w - 0.27, h: h - 0.52, valign: "top", margin: 2 });
}

function insightPair(slide: Slide, ins: SlideInsight | undefined, x: number, y: number, w: number, h: number, stacked = false) {
  if (!ins) return;
  const hasA = ins.action.length > 0;
  if (!hasA) return insightBox(slide, "Highlight", ins.highlight, x, y, w, h);
  if (stacked) {
    const hh = h * 0.6;
    insightBox(slide, "Highlight", ins.highlight, x, y, w, hh - 0.08);
    insightBox(slide, "Action", ins.action, x, y + hh + 0.04, w, h - hh - 0.04);
  } else {
    const ww = (w - 0.15) * 0.58;
    insightBox(slide, "Highlight", ins.highlight, x, y, ww, h);
    insightBox(slide, "Action", ins.action, x + ww + 0.15, y, w - ww - 0.15, h);
  }
}

function tile(slide: Slide, x: number, y: number, w: number, h: number, label: string, value: string, color = C.green, sub?: string) {
  slide.addShape("roundRect", { x, y, w, h, fill: { color: C.white }, line: { color: C.grid, width: 1 }, rectRadius: 0.1, shadow: { type: "outer", blur: 6, offset: 1.5, angle: 90, color: "000000", opacity: 0.08 } });
  slide.addShape("rect", { x: x + 0.15, y: y + 0.14, w: 0.32, h: 0.06, fill: { color }, line: { type: "none" } });
  slide.addText(label, { x: x + 0.12, y: y + 0.22, w: w - 0.24, h: 0.3, fontFace: FONT, fontSize: 10.5, color: C.ink3, margin: 0 });
  slide.addText(value, { x: x + 0.12, y: y + 0.5, w: w - 0.24, h: h - (sub ? 0.85 : 0.6), fontFace: FONT, fontSize: value.length > 9 ? 18 : 22, bold: true, color: C.ink, margin: 0, valign: "middle" });
  if (sub) slide.addText(sub, { x: x + 0.12, y: y + h - 0.36, w: w - 0.24, h: 0.26, fontFace: FONT, fontSize: 9, color: C.ink3, margin: 0 });
}

function card(slide: Slide, x: number, y: number, w: number, h: number, title?: string) {
  slide.addShape("roundRect", { x, y, w, h, fill: { color: C.white }, line: { color: C.grid, width: 1 }, rectRadius: 0.08 });
  if (title) slide.addText(title, { x: x + 0.18, y: y + 0.08, w: w - 0.36, h: 0.35, fontFace: FONT, fontSize: 12, bold: true, color: C.ink, margin: 0 });
}

const tableHeader = (cells: string[]) =>
  cells.map((c) => ({ text: c, options: { bold: true, color: C.white, fill: { color: C.green }, align: "center" as const, valign: "middle" as const } }));

interface BarOpts {
  horizontal?: boolean;
  colors?: string[];
  format?: string;
  stacked?: boolean;
  legend?: boolean;
  labelSize?: number;
  min?: number;
  max?: number;
  showValue?: boolean;
}

function bar(slide: Slide, pptx: PptxGenJS, series: { name: string; labels: string[]; values: number[] }[], x: number, y: number, w: number, h: number, o: BarOpts = {}) {
  if (!series.length || !series[0].labels.length) return;
  // Bar horizontal di PowerPoint menggambar kategori pertama di bawah — dibalik agar urutan dari atas.
  const data = o.horizontal ? series.map((s) => ({ ...s, labels: [...s.labels].reverse(), values: [...s.values].reverse() })) : series;
  slide.addChart(pptx.ChartType.bar, data, {
    x, y, w, h,
    barDir: o.horizontal ? "bar" : "col",
    barGrouping: o.stacked ? "stacked" : "clustered",
    barGapWidthPct: o.horizontal ? 45 : 70,
    chartColors: o.colors ?? C.s,
    showValue: o.showValue ?? !o.stacked,
    dataLabelFormatCode: o.format ?? "#,##0",
    dataLabelFontSize: 9,
    dataLabelColor: C.ink2,
    dataLabelPosition: o.stacked ? "ctr" : "outEnd",
    catAxisLabelFontSize: o.labelSize ?? 9,
    catAxisLabelColor: C.ink2,
    catAxisLineShow: false,
    valAxisHidden: true,
    valGridLine: { style: "none" },
    valAxisMinVal: o.min,
    valAxisMaxVal: o.max,
    valAxisLabelFormatCode: o.format ?? "#,##0",
    showLegend: o.legend ?? series.length > 1,
    legendPos: "b",
    legendFontSize: 9,
    legendColor: C.ink2,
    catAxisLabelFontFace: FONT,
    dataLabelFontFace: FONT,
  });
}

function line(slide: Slide, pptx: PptxGenJS, series: { name: string; labels: string[]; values: number[] }[], x: number, y: number, w: number, h: number, format = "#,##0", colors = C.s, showValue = true) {
  if (!series.length || !series[0].labels.length) return;
  slide.addChart(pptx.ChartType.line, series, {
    x, y, w, h,
    chartColors: colors,
    lineSize: 2,
    lineDataSymbol: "circle",
    lineDataSymbolSize: 6,
    showValue,
    dataLabelFormatCode: format,
    dataLabelFontSize: 8,
    dataLabelColor: C.ink2,
    dataLabelPosition: "t",
    catAxisLabelFontSize: 8,
    catAxisLabelColor: C.ink2,
    valAxisLabelFontSize: 8,
    valAxisLabelColor: C.ink3,
    valAxisLabelFormatCode: format,
    valGridLine: { color: C.grid, size: 0.5 },
    showLegend: series.length > 1,
    legendPos: "b",
    legendFontSize: 9,
  });
}

function doughnut(slide: Slide, pptx: PptxGenJS, labels: string[], values: number[], x: number, y: number, w: number, h: number) {
  slide.addChart(pptx.ChartType.doughnut, [{ name: "Total", labels, values }], {
    x, y, w, h,
    holeSize: 58,
    chartColors: C.s,
    showPercent: true,
    showValue: false,
    showLegend: true,
    legendPos: "r",
    legendFontSize: 9,
    dataLabelColor: C.white,
    dataLabelFontSize: 9,
  });
}

const short = (s: string, n = 46) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

// ---------------------------------------------------------------- main

export async function buildPpt({ history, insights }: { history: Period[]; insights: InsightMap }) {
  ORIGIN = typeof window !== "undefined" ? window.location.origin : "";
  const cur = history[history.length - 1];
  const prev = history.length > 1 ? history[history.length - 2] : undefined;
  const m = cur.metrics;
  const P = cur.label;
  const I = (k: string): SlideInsight => insights[k] ?? { highlight: [], action: [] };

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Contact Center BMHS";
  pptx.company = "RS Bunda Group";
  pptx.title = `Report CC BMHS ${P}`;

  pptx.defineSlideMaster({
    title: "CONTENT",
    background: { color: "F6F9F7" },
    objects: [
      { rect: { x: 0, y: 0, w: W, h: 1.12, fill: { color: C.green } } },
      { rect: { x: W - 4.2, y: 0, w: 4.2, h: 1.12, fill: { color: C.greenMid, transparency: 35 } } },
      { rect: { x: 0, y: 1.12, w: W, h: 0.05, fill: { color: "86EFAC" } } },
      { image: { x: 0.35, y: 7.02, w: 0.84, h: 0.36, path: asset("/brand/bunda-logo.png") } },
      { image: { x: W - 1.75, y: 7.05, w: 1.35, h: 0.33, path: asset("/brand/ivosights.png") } },
    ],
    slideNumber: { x: W / 2 - 0.3, y: 7.08, w: 0.6, h: 0.28, color: C.ink3, fontFace: FONT, fontSize: 9, align: "center" },
  });
  pptx.defineSlideMaster({
    title: "SECTION",
    background: { color: C.green },
    objects: [
      { rect: { x: 0, y: 0, w: W, h: 3.6, fill: { color: C.greenDark } } },
      { rect: { x: 0, y: 3.6, w: W, h: 0.06, fill: { color: "86EFAC" } } },
      { rect: { x: 0, y: 3.66, w: W, h: 3.84, fill: { color: C.white } } },
      { image: { x: 3.7, y: 4.55, w: 5.9, h: 2.03, path: asset("/brand/bunda-logo-large.png") } },
    ],
  });

  // 1. Executive summary
  {
    const s = pptx.addSlide({ masterName: "CONTENT" });
    header(s, "Executive Summary", "summary semua temuan data", P);
    const ex = I("exec_summary").highlight;
    const blocks = [
      ["Key Performance Indicator", ex[0]],
      ["Quality Performance", ex[1]],
      ["Summary Case", ex[2]],
      ["Coverage Area", ex[3]],
    ];
    blocks.forEach(([t, txt], i) => {
      const x = 0.45 + (i % 2) * 6.27;
      const y = 1.45 + Math.floor(i / 2) * 2.75;
      card(s, x, y, 6.07, 2.55);
      s.addShape("ellipse", { x: x + 0.2, y: y + 0.2, w: 0.42, h: 0.42, fill: { color: C.greenSoft }, line: { color: C.greenLine } });
      s.addText(String(i + 1), { x: x + 0.2, y: y + 0.2, w: 0.42, h: 0.42, fontFace: FONT, fontSize: 13, bold: true, color: C.green, align: "center", valign: "middle", margin: 0 });
      s.addText(t, { x: x + 0.75, y: y + 0.2, w: 5.1, h: 0.42, fontFace: FONT, fontSize: 15, bold: true, color: C.greenDark, valign: "middle", margin: 0 });
      const body = txt ?? "-";
      s.addText(body, { x: x + 0.2, y: y + 0.75, w: 5.67, h: 1.7, fontFace: FONT, fontSize: autoSize(body, 5.67, 1.7, 12.5, 9), color: C.ink2, align: "justify", valign: "top", margin: 0 });
    });
  }

  const months = history.filter((h) => h.metrics.inbound);
  const ib = m.inbound;
  const t = m.tickets;

  // 2. KPI inbound
  if (ib) {
    const s = pptx.addSlide({ masterName: "CONTENT" });
    header(s, "Key Performance Indicator Inbound", "call detail", P);
    const rows = [
      ["Avg Handling Time", "00:05:00", ...months.map((h) => fmtDur(h.metrics.inbound!.ahtSec))],
      ["Speed of Answer", "00:01:00", ...months.map((h) => fmtDur(h.metrics.inbound!.soaSec))],
      ["Abandon Rate", "5%", ...months.map((h) => fmtPct(h.metrics.inbound!.abandonRate))],
      ["Solving Ticket", "85%", ...months.map((h) => fmtPct(h.metrics.tickets?.solvingRate ?? 1, 0))],
    ];
    s.addTable(
      [tableHeader(["KPI", "TARGET", ...months.map((h) => h.month_label)]), ...rows.map((r, i) => r.map((c, j) => ({ text: c, options: { bold: j === 0, align: (j === 0 ? "left" : "center") as "left" | "center", fill: { color: i % 2 ? "F3FAF6" : C.white } } })))],
      { x: 1.2, y: 1.55, w: 10.9, colW: [3.1, 1.9, ...months.map(() => 5.9 / months.length)], rowH: 0.6, fontFace: FONT, fontSize: 14, color: C.ink, border: { type: "solid", color: C.greenLine, pt: 0.75 }, valign: "middle" },
    );
    insightBox(s, "Highlight", I("inbound_kpi").highlight, 1.2, 5.0, 10.9, 1.7);
  }

  // 3. KPI scoring
  if (ib) {
    const s = pptx.addSlide({ masterName: "CONTENT" });
    header(s, "Key Performance Inbound", "call detail", P);
    const sc = (k: string, v: number) => (k === "solving" ? (v > 0.85 ? 3 : v > 0.7 ? 2 : 1) : k === "aht" ? (v <= 300 ? 3 : v <= 600 ? 2 : 1) : k === "ab" ? (v <= 0.05 ? 3 : v <= 0.1 ? 2 : 1) : v <= 60 ? 3 : v <= 120 ? 2 : 1);
    const solving = t?.solvingRate ?? 1;
    const data: [string, string, string, string, number][] = [
      ["Solving Ticket", "85%", fmtPct(solving, 0), "Score 1 : ≤70% Total Call\nScore 2 : >70 – 85% Total Call\nScore 3 : >85% Total Call", sc("solving", solving)],
      ["AHT", "00:05:00", fmtDur(ib.ahtSec), "Score 1 : >10 Menit\nScore 2 : 5 – 10 Menit\nScore 3 : ≤5 Menit", sc("aht", ib.ahtSec)],
      ["Abandon Rate", "5%", fmtPct(ib.abandonRate), "Score 1 : >10%\nScore 2 : 5 – 10%\nScore 3 : ≤5%", sc("ab", ib.abandonRate)],
      ["Speed Of Answer", "00:01:00", fmtDur(ib.soaSec), "Score 1 : >2 Menit\nScore 2 : 1 – 2 Menit\nScore 3 : ≤1 Menit", sc("soa", ib.soaSec)],
    ];
    const total = data.reduce((a, r) => a + r[4], 0);
    const body = data.map((r) => [
      { text: r[0], options: { bold: true } },
      { text: r[1], options: { align: "center" as const, bold: true } },
      { text: r[2], options: { align: "center" as const, bold: true, color: C.green } },
      { text: r[3], options: { fontSize: 10 } },
      { text: String(r[4]), options: { align: "center" as const, bold: true } },
    ]);
    s.addTable(
      [
        tableHeader(["KPI", "TARGET", "ACTUAL", "MEASUREMENT", "SCORE"]),
        ...body,
        [{ text: "Total Score Actual", options: { colspan: 4, align: "right" as const, bold: true } }, { text: String(total), options: { align: "center" as const, bold: true } }],
        [{ text: "Target Max Score", options: { colspan: 4, align: "right" as const, bold: true } }, { text: "12", options: { align: "center" as const, bold: true } }],
        [{ text: "Performance", options: { colspan: 4, align: "right" as const, bold: true, color: C.white, fill: { color: C.green } } }, { text: `${Math.round((total / 12) * 100)}%`, options: { align: "center" as const, bold: true, color: C.white, fill: { color: C.green } } }],
      ],
      { x: 1.0, y: 1.5, w: 11.3, colW: [2.4, 1.6, 1.6, 4.5, 1.2], fontFace: FONT, fontSize: 12, color: C.ink, border: { type: "solid", color: C.greenLine, pt: 0.75 }, valign: "middle", rowH: 0.42 },
    );
  }

  // 4. Inbound performance (3 bulan)
  if (ib) {
    const s = pptx.addSlide({ masterName: "CONTENT" });
    header(s, "Inbound Performance", "call detail", P);
    const metrics: [string, (h: Period) => number, string, string][] = [
      ["Incoming", (h) => h.metrics.inbound!.incoming, "#,##0", C.s[0]],
      ["Answered", (h) => h.metrics.inbound!.answered, "#,##0", C.s[0]],
      ["Abandon", (h) => h.metrics.inbound!.abandon, "#,##0", C.s[2]],
      ["Handling Time", (h) => h.metrics.inbound!.ahtSec / 86400, "hh:mm:ss", C.s[1]],
      ["Service Level", (h) => h.metrics.inbound!.sl, "0.00%", C.s[3]],
    ];
    metrics.forEach(([name, get, fmt, col], i) => {
      const x = 0.45 + i * 2.5;
      card(s, x, 1.4, 2.35, 2.85, name);
      const vals = months.map(get);
      if (vals.length > 1) {
        const d = vals[vals.length - 1] - vals[vals.length - 2];
        const txt = fmt === "0.00%" ? `${signed(d * 100, 2)}%` : fmt === "hh:mm:ss" ? `${d >= 0 ? "+" : "-"} ${fmtDur(Math.abs(d * 86400))}` : signed(d);
        s.addText(txt, { x: x + 1.2, y: 1.48, w: 1.05, h: 0.3, fontFace: FONT, fontSize: 10, bold: true, color: C.ink2, align: "right", margin: 0 });
      }
      bar(s, pptx, [{ name, labels: months.map((h) => h.month_label), values: vals }], x + 0.05, 1.8, 2.25, 2.4, { colors: [col], format: fmt, min: fmt === "0.00%" ? 0.9 : 0 });
    });
    insightPair(s, I("inbound_performance"), 0.45, 4.45, 12.35, 2.45);
  }

  // 5. Call performance harian
  if (ib) {
    const s = pptx.addSlide({ masterName: "CONTENT" });
    header(s, "Call Performance", "call detail", P);
    const tiles: [string, string, string][] = [
      ["Incoming", fmtNum(ib.incoming), C.s[1]],
      ["Answered", fmtNum(ib.answered), C.s[0]],
      ["Abandon", fmtNum(ib.abandon), C.s[2]],
      ["Handling Time", fmtDur(ib.ahtSec), C.s[3]],
      ["SL (Service Level)", fmtPct(ib.sl), C.green],
    ];
    tiles.forEach(([l, v, c], i) => tile(s, 0.45 + i * 2.5, 1.35, 2.35, 1.0, l, v, c));
    card(s, 0.45, 2.5, 8.3, 2.75, "Call per Hari");
    bar(s, pptx, [
      { name: "Success Call", labels: ib.daily.map((d) => d.date.slice(8)), values: ib.daily.map((d) => d.answered) },
      { name: "Total Abandon", labels: ib.daily.map((d) => d.date.slice(8)), values: ib.daily.map((d) => d.abandon) },
    ], 0.55, 2.85, 8.1, 2.35, { stacked: true, colors: [C.s[0], C.s[2]], showValue: false, labelSize: 8 });
    card(s, 8.9, 2.5, 3.9, 2.75, "Service Level Harian");
    line(s, pptx, [{ name: "Service Level", labels: ib.daily.map((d) => d.date.slice(8)), values: ib.daily.map((d) => d.sl) }], 8.95, 2.85, 3.8, 2.35, "0%", [C.green], false);
    insightPair(s, I("call_performance"), 0.45, 5.4, 12.35, 1.5);
  }

  // 6. Dokter khusus
  if (t) {
    const dk = t.dokterKhusus;
    const s = pptx.addSlide({ masterName: "CONTENT" });
    header(s, "Pendaftaran Dokter Khusus", "Inbound", P);
    card(s, 0.45, 1.4, 4.4, 3.6, "RS Tujuan");
    bar(s, pptx, [{ name: "Jumlah Appointment", labels: dk.byRs.map((r) => r.name), values: dk.byRs.map((r) => r.count) }], 0.5, 1.8, 4.3, 3.15, { colors: [C.s[0]], labelSize: 8 });
    card(s, 5.0, 1.4, 7.8, 3.6, "Dokter Khusus");
    const docs = dk.byDoctor.slice(0, 10);
    const rsKeys = [...new Set(docs.flatMap((d) => Object.keys(d.perRs)))].filter((k) => k !== "LAINNYA");
    bar(s, pptx, rsKeys.map((k) => ({ name: k, labels: docs.map((d) => short(d.doctor, 34)), values: docs.map((d) => d.perRs[k] ?? 0) })), 5.05, 1.8, 7.7, 3.15, { horizontal: true, stacked: true, showValue: true, labelSize: 8 });
    insightBox(s, "Highlight", I("dokter_khusus").highlight, 0.45, 5.15, 12.35, 1.75);
  }

  // 7. Case category
  if (t) {
    const s = pptx.addSlide({ masterName: "CONTENT" });
    header(s, "Case Category", "Inbound", P);
    card(s, 0.45, 1.4, 4.0, 2.7, `Kategori (${fmtNum(t.total)} tiket)`);
    doughnut(s, pptx, t.byCategory.map((c) => c.name), t.byCategory.map((c) => c.count), 0.5, 1.75, 3.9, 2.3);
    card(s, 4.6, 1.4, 4.1, 2.7, "Permintaan (Top 10)");
    bar(s, pptx, [{ name: "Total", labels: t.permintaan.slice(0, 10).map((x) => short(x.name.replace("Permintaan - ", ""), 40)), values: t.permintaan.slice(0, 10).map((x) => x.count) }], 4.65, 1.75, 4.0, 2.3, { horizontal: true, colors: [C.s[0]], labelSize: 7 });
    card(s, 8.85, 1.4, 3.95, 2.7, "Informasi");
    bar(s, pptx, [{ name: "Total", labels: t.informasi.slice(0, 6).map((x) => short(x.name.replace("Informasi - ", ""), 36)), values: t.informasi.slice(0, 6).map((x) => x.count) }], 8.9, 1.75, 3.85, 2.3, { horizontal: true, colors: [C.s[1]], labelSize: 7 });
    insightBox(s, "Highlight", I("case_category").highlight, 0.45, 4.25, 12.35, 2.65);
  }

  // 8. SHARECARECC
  if (t) {
    const s = pptx.addSlide({ masterName: "CONTENT" });
    header(s, "Appointment Voucher SHARECARECC", "Inbound (filter SHARECAREC)", P);
    card(s, 0.45, 1.4, 6.6, 3.4, "Category");
    bar(s, pptx, [{ name: "Total", labels: t.sharecare.bySub.map((x) => short(x.name.replace("Permintaan - ", ""), 48)), values: t.sharecare.bySub.map((x) => x.count) }], 0.5, 1.8, 6.5, 2.95, { horizontal: true, colors: [C.s[0]], labelSize: 8 });
    card(s, 7.2, 1.4, 5.6, 3.4, "RS Tujuan");
    bar(s, pptx, [{ name: "Total", labels: t.sharecare.byRs.map((x) => x.name), values: t.sharecare.byRs.map((x) => x.count) }], 7.25, 1.8, 5.5, 2.95, { colors: [C.s[1]] });
    insightBox(s, "Highlight", I("sharecare").highlight, 0.45, 4.95, 12.35, 1.95);
  }

  // Quality slides helper
  const qualityTrend = (kind: "inbound" | "outbound" | "chat", title: string, source: string, key: string) => {
    const blocks = history.map((h) => h.metrics.quality?.[kind]).filter((b): b is QualityBlock => !!b && b.score != null);
    if (!blocks.length) return;
    const s = pptx.addSlide({ masterName: "CONTENT" });
    header(s, title, source, P);
    card(s, 0.45, 1.4, 5.2, 5.5, `Score ${kind === "inbound" ? "Inbound" : kind === "outbound" ? "Outbound" : "Chat"}`);
    bar(s, pptx, [{ name: "Score", labels: blocks.map((b) => b.label), values: blocks.map((b) => b.score!) }], 0.5, 2.1, 5.1, 4.7, { colors: [C.s[0]], format: "0.00%", min: 0, max: 1, labelSize: 8 });
    const deltas = blocks.slice(1).map((b, i) => signed((b.score! - blocks[i].score!) * 100, 2));
    s.addText(deltas.join("     "), { x: 1.6, y: 1.75, w: 3.8, h: 0.3, fontFace: FONT, fontSize: 11, bold: true, color: C.green, align: "center", margin: 0 });
    insightPair(s, I(key), 5.8, 1.4, 7.0, 5.5, true);
  };
  const qualityCategory = (kind: "inbound" | "outbound" | "chat", title: string, source: string, key: string) => {
    const blocks = history.map((h) => h.metrics.quality?.[kind]).filter((b): b is QualityBlock => !!b && b.categories.length > 0);
    const curB = blocks[blocks.length - 1];
    if (!curB) return;
    const prevB = blocks.length > 1 ? blocks[blocks.length - 2] : undefined;
    const s = pptx.addSlide({ masterName: "CONTENT" });
    header(s, title, source, P);
    card(s, 0.45, 1.4, 12.35, 3.35, "Parameter Category");
    const labels = curB.categories.map((c) => c.name);
    const series = [
      ...(prevB ? [{ name: prevB.label, labels, values: labels.map((l) => prevB.categories.find((c) => c.name === l)?.pct ?? 0) }] : []),
      { name: curB.label, labels, values: curB.categories.map((c) => c.pct) },
    ];
    bar(s, pptx, series, 0.5, 1.8, 12.25, 2.9, { colors: prevB ? [C.s[1], C.s[0]] : [C.s[0]], format: "0.00%", min: 0, max: 1, labelSize: 8 });
    insightPair(s, I(key), 0.45, 4.9, 12.35, 2.0);
  };

  qualityTrend("inbound", "Quality Performance Inbound", "Score Inbound", "quality_inbound");
  qualityCategory("inbound", "Score Quality Inbound", "Score Inbound", "quality_inbound_category");
  const qi = m.quality?.inbound;
  if (qi?.agents.length) {
    const s = pptx.addSlide({ masterName: "CONTENT" });
    header(s, "Score Quality Inbound", "Score Inbound", P);
    card(s, 0.45, 1.4, 12.35, 3.35, "Score Agent Inbound");
    bar(s, pptx, [{ name: "Score Agent", labels: qi.agents.map((a) => a.name), values: qi.agents.map((a) => a.score) }], 0.5, 1.8, 12.25, 2.9, { colors: [C.s[0]], format: "0%", min: 0.5, max: 1, labelSize: 7 });
    insightPair(s, I("quality_inbound_agent"), 0.45, 4.9, 12.35, 2.0);
  }

  // Section: Outbound
  const section = (title: string, sub: string) => {
    const s = pptx.addSlide({ masterName: "SECTION" });
    s.addText(title, { x: 0.8, y: 1.3, w: 11.7, h: 0.9, fontFace: FONT, fontSize: 36, bold: true, color: C.white, margin: 0 });
    s.addText(sub, { x: 0.8, y: 2.2, w: 11.7, h: 0.5, fontFace: FONT, fontSize: 18, color: "BBF7D0", margin: 0 });
  };

  const o = m.outbound;
  if (o) {
    section("OUTBOUND TELESALES – BMHS", P);
    {
      const s = pptx.addSlide({ masterName: "CONTENT" });
      header(s, "Outbound Performance", "outbond", P);
      const tl: [string, string, string][] = [
        ["Total leads", fmtNum(o.leads), C.s[1]],
        ["Connected", fmtNum(o.connected), C.s[0]],
        ["Success", fmtNum(o.success), C.green],
        ["Connect rate", fmtPct(o.connectRate), C.s[3]],
        ["Success rate", fmtPct(o.successRate), C.s[4]],
        ["BMHS instruction", fmtNum(o.bmhsInstruction), C.s[2]],
      ];
      tl.forEach(([l, v, c], i) => tile(s, 0.45 + i * 2.07, 1.35, 1.95, 1.0, l, v, c));
      card(s, 0.45, 2.5, 5.0, 4.4, "Alasan gagal — connected");
      doughnut(s, pptx, o.failReasons.slice(0, 8).map((r) => r.name), o.failReasons.slice(0, 8).map((r) => r.count), 0.5, 2.9, 4.9, 3.9);
      insightBox(s, "Highlight", I("outbound_performance").highlight, 5.6, 2.5, 7.2, 4.4);
    }
    {
      const om = history.filter((h) => h.metrics.outbound);
      const s = pptx.addSlide({ masterName: "CONTENT" });
      header(s, "Key Performance Indicator", "outbond", P);
      const rows = [
        ["Total Leads", "-", ...om.map((h) => fmtNum(h.metrics.outbound!.leads))],
        ["Total connected Leads", "-", ...om.map((h) => fmtNum(h.metrics.outbound!.connected))],
        ["Success", "-", ...om.map((h) => fmtNum(h.metrics.outbound!.success))],
        ["Connected Rate", "8%", ...om.map((h) => fmtPct(h.metrics.outbound!.connectRate))],
        ["Success Rate", "-", ...om.map((h) => fmtPct(h.metrics.outbound!.successRate))],
      ];
      s.addTable(
        [tableHeader(["KPI", "TARGET", ...om.map((h) => h.month_label)]), ...rows.map((r, i) => r.map((c, j) => ({ text: c, options: { bold: j === 0, align: (j === 0 ? "left" : "center") as "left" | "center", fill: { color: i % 2 ? "F3FAF6" : C.white } } })))],
        { x: 1.2, y: 1.5, w: 10.9, colW: [3.1, 1.9, ...om.map(() => 5.9 / om.length)], rowH: 0.52, fontFace: FONT, fontSize: 14, color: C.ink, border: { type: "solid", color: C.greenLine, pt: 0.75 }, valign: "middle" },
      );
      insightBox(s, "Highlight", I("outbound_kpi").highlight, 1.2, 5.0, 10.9, 1.75);
    }
    {
      const om = history.filter((h) => h.metrics.outbound);
      const s = pptx.addSlide({ masterName: "CONTENT" });
      header(s, "Call Performance", "outbond", P);
      card(s, 0.45, 1.4, 4.4, 5.5, "Appointment");
      bar(s, pptx, [{ name: "Appointment", labels: om.map((h) => h.label), values: om.map((h) => h.metrics.outbound!.success) }], 0.5, 1.85, 4.3, 4.95, { colors: [C.s[0]], labelSize: 8 });
      insightPair(s, I("outbound_call"), 5.0, 1.4, 7.8, 5.5, true);
    }
    if (o.daily.length) {
      const s = pptx.addSlide({ masterName: "CONTENT" });
      header(s, "Call Performance", "outbond", P);
      const tl: [string, string, string][] = [
        ["Total Leads", fmtNum(o.leads), C.s[1]],
        ["Total Appointment", fmtNum(o.success), C.green],
        ["Connected Leads", fmtNum(o.connected), C.s[0]],
        ["BMHS Instruction", fmtNum(o.bmhsInstruction), C.s[2]],
        ["Connected Rate", fmtPct(o.connectRate), C.s[3]],
        ["Success Rate", fmtPct(o.successRate), C.s[4]],
      ];
      tl.forEach(([l, v, c], i) => tile(s, 0.45 + i * 2.07, 1.35, 1.95, 1.0, l, v, c));
      card(s, 0.45, 2.5, 12.35, 2.75, "Leads per Tanggal");
      const lab = o.daily.map((d) => `${d.date.slice(8, 10)}/${d.date.slice(5, 7)}`);
      line(s, pptx, [
        { name: "Total Leads", labels: lab, values: o.daily.map((d) => d.leads) },
        { name: "Connected", labels: lab, values: o.daily.map((d) => d.connected) },
      ], 0.5, 2.85, 12.25, 2.35, "#,##0", [C.s[1], C.s[2]]);
      insightBox(s, "Highlight", I("outbound_daily").highlight, 0.45, 5.4, 12.35, 1.5);
    }
  }
  qualityTrend("outbound", "Quality Performance Outbound", "Score outbond", "quality_outbound");
  qualityCategory("outbound", "Score Category Outbound", "Score outbond", "quality_outbound_category");

  // Section: Omni
  const oi = m.omniIncoming;
  const e = m.escalation;
  if (oi || e) section("Sociomile Omni Channel (Chat)", P);
  if (oi) {
    const s = pptx.addSlide({ masterName: "CONTENT" });
    header(s, "Kategori Tiket: Pesan Masuk (Incoming Chat)", "Omni (status incoming)", P);
    card(s, 0.45, 1.4, 7.6, 5.5, `Category Ticket (${fmtNum(oi.total)} pesan)`);
    bar(s, pptx, [{ name: "Category Ticket", labels: oi.byCategory.map((c) => short(c.name, 50)), values: oi.byCategory.map((c) => c.count) }], 0.5, 1.8, 7.5, 5.0, { horizontal: true, colors: [C.s[0]], labelSize: 8 });
    insightPair(s, I("omni_incoming"), 8.2, 1.4, 4.6, 5.5, true);
  }
  if (e) {
    const s = pptx.addSlide({ masterName: "CONTENT" });
    header(s, "Total Eskalasi Ticketing", "Omni chat", P);
    card(s, 0.45, 1.4, 7.6, 5.5, `RS Tujuan (${fmtNum(e.total)} tiket)`);
    bar(s, pptx, [{ name: "Jumlah Tiket Eskalasi", labels: e.byRs.map((r) => r.name), values: e.byRs.map((r) => r.count) }], 0.5, 1.8, 7.5, 5.0, { colors: [C.s[0]], labelSize: 8 });
    insightBox(s, "Highlight", I("omni_escalation").highlight, 8.2, 1.4, 4.6, 5.5);

    // Topik eskalasi: 2 RS per slide
    const topicHl = I("omni_topics").highlight;
    const withData = e.topics.filter((x) => x.total > 0);
    const zero = e.topics.filter((x) => x.total === 0);
    for (let i = 0; i < withData.length; i += 2) {
      const s2 = pptx.addSlide({ masterName: "CONTENT" });
      header(s2, "Topik Eskalasi Ticketing", "Omni chat", P);
      withData.slice(i, i + 2).forEach((tp, j) => {
        const x = 0.45 + j * 6.25;
        const items = tp.items.slice(0, 10);
        const rowH = 0.3;
        s2.addTable(
          [
            [{ text: `DETAIL TOPIK ESKALASI — ${tp.rs.toUpperCase()}`, options: { colspan: 5, bold: true, color: C.white, fill: { color: j ? C.s[1] : C.green }, align: "center" as const } }],
            tableHeader(["No", "Topik Eskalasi", "Jumlah", "% RS", "% Semua"]),
            ...items.map((it, k) => [String(k + 1), it.name, fmtNum(it.count), fmtPct(it.count / tp.total, 1), fmtPct(it.count / e.total, 1)].map((c, ci) => ({ text: c, options: { align: (ci === 1 ? "left" : "center") as "left" | "center", fill: { color: k % 2 ? "F6FAF8" : C.white } } }))),
            [{ text: `TOTAL ${tp.rs.toUpperCase()}`, options: { colspan: 2, bold: true, fill: { color: C.greenSoft } } }, { text: fmtNum(tp.total), options: { bold: true, align: "center" as const, fill: { color: C.greenSoft } } }, { text: "100%", options: { bold: true, align: "center" as const, fill: { color: C.greenSoft } } }, { text: fmtPct(tp.total / e.total, 1), options: { bold: true, align: "center" as const, fill: { color: C.greenSoft } } }],
          ],
          { x, y: 1.4, w: 6.05, colW: [0.45, 3.0, 0.8, 0.9, 0.9], rowH, fontFace: FONT, fontSize: 9, color: C.ink, border: { type: "solid", color: C.greenLine, pt: 0.5 }, valign: "middle" },
        );
        const hl = topicHl.filter((h) => h.toUpperCase().includes(tp.rs.toUpperCase()));
        insightBox(s2, "Highlight", hl.length ? hl : [`${tp.rs}: ${fmtNum(tp.total)} tiket, terbanyak ${tp.items[0]?.name} (${tp.items[0]?.count}).`], x, 5.3, 6.05, 1.6);
      });
    }
    if (zero.length) {
      const last = pptx.addSlide({ masterName: "CONTENT" });
      header(last, "Topik Eskalasi Ticketing", "Omni chat", P);
      insightBox(last, "Highlight", zero.map((z) => `Tidak terdapat tiket eskalasi ke ${z.rs} pada periode ini (0 tiket).`), 0.45, 1.4, 12.35, 1.6);
    }
  }
  qualityTrend("chat", "Quality Performance Chat", "Score chat", "quality_chat");
  qualityCategory("chat", "Score Quality Category Chat", "Score chat", "quality_chat_category");

  // Penutup
  {
    const s = pptx.addSlide();
    s.background = { color: C.white };
    s.addShape("rect", { x: 0, y: 0, w: 0.35, h: 7.5, fill: { color: C.green }, line: { type: "none" } });
    s.addImage({ path: asset("/brand/bunda-logo-large.png"), x: 0.9, y: 0.8, w: 4.4, h: 1.51 });
    s.addImage({ path: asset("/brand/closing-person.png"), x: 7.6, y: 1.0, w: 4.8, h: 5.48 });
    s.addText([
      { text: "TERIMA KASIH", options: { fontSize: 40, bold: true, color: C.greenDark, breakLine: true } },
      { text: "dan", options: { fontSize: 22, color: C.ink2, breakLine: true } },
      { text: "Salam Sehat Selalu", options: { fontSize: 26, italic: true, bold: true, color: C.green } },
    ], { x: 0.9, y: 3.0, w: 6.5, h: 2.6, fontFace: FONT, valign: "middle" });
    s.addImage({ path: asset("/brand/ivosights.png"), x: 0.9, y: 6.6, w: 1.6, h: 0.39 });
  }

  // Appendix
  section("APPENDIX", P);
  const tf = m.transfer;
  if (tf) {
    const s = pptx.addSlide({ masterName: "CONTENT" });
    header(s, "Call #1 Agent TF Unit Abandoned", "Transfer call", P);
    tile(s, 0.45, 1.35, 3.0, 1.05, "Call TF Unit", fmtNum(tf.total), C.s[1]);
    tile(s, 3.6, 1.35, 3.0, 1.05, "Call TF Unit Tersambung", `${fmtNum(tf.answered)}  (${fmtPct(tf.answered / (tf.total || 1), 0)})`, C.s[0]);
    tile(s, 6.75, 1.35, 3.0, 1.05, "Call TF Unit Abandoned", `${fmtNum(tf.abandoned)}  (${fmtPct(tf.abandoned / (tf.total || 1), 0)})`, C.s[2]);
    const rsRows = tf.byRs.filter((r) => r.total > 0);
    s.addTable(
      [
        tableHeader(["RS Tujuan", "Abandoned", "% Abd", "Rajal", "Rajal & Ranap", "Ranap", "Operator"]),
        ...rsRows.map((r, i) => [r.rs, fmtNum(r.abandoned), fmtPct(r.abandoned / (tf.abandoned || 1), 1), fmtNum(r.rajal), fmtNum(r.rajalRanap), fmtNum(r.ranap), fmtNum(r.operator)].map((c, j) => ({ text: c, options: { align: (j === 0 ? "left" : "center") as "left" | "center", bold: j === 0, fill: { color: i % 2 ? "F6FAF8" : C.white } } }))),
      ],
      { x: 0.45, y: 2.6, w: 7.6, colW: [2.2, 0.95, 0.85, 0.8, 1.1, 0.8, 0.9], rowH: 0.34, fontFace: FONT, fontSize: 9.5, color: C.ink, border: { type: "solid", color: C.greenLine, pt: 0.5 }, valign: "middle" },
    );
    insightBox(s, "Highlight", I("transfer_call").highlight, 8.2, 2.6, 4.6, 4.3);
  }
  if (t) {
    const s = pptx.addSlide({ masterName: "CONTENT" });
    header(s, "Pasien Tekan IGD (Tidak Terangkat)", "Inbound (filter FIGD)", P);
    tile(s, 0.45, 1.35, 1.8, 1.05, "IGD #2", fmtNum(t.igd.total), C.green);
    t.igd.byRs.forEach((r, i) => tile(s, 2.4 + i * 1.5, 1.35, 1.4, 1.05, r.name, fmtNum(r.count), C.s[i % 6], fmtPct(r.count / (t.igd.total || 1))));
    card(s, 0.45, 2.6, 5.5, 4.3, "Category Ticket IGD");
    bar(s, pptx, [{ name: "Total", labels: t.igd.byCategory.map((c) => c.name), values: t.igd.byCategory.map((c) => c.count) }], 0.5, 3.0, 5.4, 3.8, { horizontal: true, colors: [C.s[1]] });
    insightBox(s, "Highlight", I("igd").highlight, 6.1, 2.6, 6.7, 4.3);
  }
  if (ib) {
    const lab = ib.interval.map((x) => hourLabel(x.hour));
    {
      const s = pptx.addSlide({ masterName: "CONTENT" });
      header(s, "Average Incoming Call / Interval", "call detail", P);
      card(s, 0.45, 1.4, 12.35, 3.3, "Average Incoming Call / Interval");
      line(s, pptx, [{ name: "Avg Incoming", labels: lab, values: ib.interval.map((x) => Math.round(x.avgIncoming)) }], 0.5, 1.8, 12.25, 2.85, "#,##0", [C.s[0]]);
      insightPair(s, I("interval"), 0.45, 4.85, 12.35, 2.05);
    }
    {
      const s = pptx.addSlide({ masterName: "CONTENT" });
      header(s, "AHT Daily", "call detail", P);
      card(s, 0.45, 1.4, 12.35, 3.3, "Average Handling Time / Day");
      bar(s, pptx, [{ name: "AHT", labels: ib.daily.map((d) => d.date.slice(8)), values: ib.daily.map((d) => d.ahtSec / 86400) }], 0.5, 1.8, 12.25, 2.85, { colors: [C.s[0]], format: "hh:mm:ss", labelSize: 8 });
      insightPair(s, I("aht_daily"), 0.45, 4.85, 12.35, 2.05);
    }
    {
      const s = pptx.addSlide({ masterName: "CONTENT" });
      header(s, "Abandon / Interval", "call detail", P);
      card(s, 0.45, 1.4, 12.35, 3.3, "Average Abandon / Interval");
      line(s, pptx, [{ name: "Avg Abandon", labels: lab, values: ib.interval.map((x) => Math.round(x.avgAbandon)) }], 0.5, 1.8, 12.25, 2.85, "#,##0", [C.s[2]]);
      insightPair(s, I("abandon_interval"), 0.45, 4.85, 12.35, 2.05);
    }
  }
  if (t) {
    {
      const s = pptx.addSlide({ masterName: "CONTENT" });
      header(s, "Permintaan & Informasi", "Inbound", P);
      const tbl = (title: string, rows: { name: string; count: number }[], x: number, w: number) => {
        const list = rows.slice(0, 30);
        const fs = list.length > 22 ? 7 : 8.5;
        s.addTable(
          [
            tableHeader([title, "Total"]),
            ...list.map((r, i) => [{ text: r.name, options: { fill: { color: i % 2 ? "F6FAF8" : C.white } } }, { text: fmtNum(r.count), options: { align: "center" as const, fill: { color: i % 2 ? "F6FAF8" : C.white } } }]),
            [{ text: "Total", options: { bold: true, color: C.white, fill: { color: C.green } } }, { text: fmtNum(rows.reduce((a, b) => a + b.count, 0)), options: { bold: true, align: "center" as const, color: C.white, fill: { color: C.green } } }],
          ],
          { x, y: 1.4, w, colW: [w - 0.8, 0.8], rowH: list.length > 22 ? 0.165 : 0.22, fontFace: FONT, fontSize: fs, color: C.ink, border: { type: "solid", color: C.greenLine, pt: 0.5 }, valign: "middle", margin: 0.03 },
        );
      };
      tbl("Permintaan", t.permintaan, 0.45, 6.6);
      tbl("Informasi", t.informasi, 7.25, 5.55);
    }
    {
      const s = pptx.addSlide({ masterName: "CONTENT" });
      header(s, "Spam", "Inbound", P);
      card(s, 0.45, 1.4, 7.3, 5.5, "Kategori Spam");
      bar(s, pptx, [{ name: "Total", labels: t.spam.map((c) => c.name), values: t.spam.map((c) => c.count) }], 0.5, 1.8, 7.2, 5.0, { horizontal: true, colors: [C.s[1]] });
      insightPair(s, I("spam"), 7.9, 1.4, 4.9, 5.5, true);
    }
    {
      const s = pptx.addSlide({ masterName: "CONTENT" });
      header(s, "Keluhan Pelayanan Unit", "Inbound", P);
      card(s, 0.45, 1.4, 5.0, 3.0, "Kategori Keluhan");
      bar(s, pptx, [{ name: "Total", labels: t.keluhan.map((c) => c.name), values: t.keluhan.map((c) => c.count) }], 0.5, 1.8, 4.9, 2.55, { horizontal: true, colors: [C.s[2]] });
      insightPair(s, I("keluhan"), 5.6, 1.4, 7.2, 5.5, true);
    }
    if (t.keluhanList.length) {
      for (let i = 0; i < t.keluhanList.length; i += 4) {
        const s = pptx.addSlide({ masterName: "CONTENT" });
        header(s, "Detail Keluhan Pelayanan Unit", "Inbound", P);
        t.keluhanList.slice(i, i + 4).forEach((k, j) => {
          const x = 0.45 + (j % 2) * 6.25;
          const y = 1.4 + Math.floor(j / 2) * 2.8;
          card(s, x, y, 6.05, 2.65);
          s.addText(`${k.sub} · ${k.rs} · ${k.date.slice(0, 10)}`, { x: x + 0.18, y: y + 0.1, w: 5.7, h: 0.32, fontFace: FONT, fontSize: 11, bold: true, color: C.greenDark, margin: 0 });
          const body = `${k.description.replace(/\t/g, " ").replace(/\n{2,}/g, "\n")}${k.answer ? `\n\nPenanganan: ${k.answer}` : ""}`;
          s.addText(body, { x: x + 0.18, y: y + 0.45, w: 5.7, h: 2.1, fontFace: FONT, fontSize: autoSize(body, 5.7, 2.1, 10, 6.5), color: C.ink2, valign: "top", margin: 0 });
        });
      }
    }
  }

  const fileName = `Report CC BMHS ${P.replace(/–/g, "-")}.pptx`;
  await pptx.writeFile({ fileName, compression: true });
  return fileName;
}

