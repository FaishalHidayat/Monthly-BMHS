// Parser raw data Excel -> baris ternormalisasi. Dipakai di browser (upload)
// dan di script Node (uji/seed). Jenis file dideteksi otomatis dari header.
import * as XLSX from "xlsx";
import type {
  CallRow,
  DatasetKey,
  EscalationRow,
  OmniIncomingRow,
  OutboundRow,
  ScoreSummary,
  TicketRow,
  TransferRow,
} from "./types";

type Cell = unknown;
type Grid = Cell[][];

const norm = (v: Cell) =>
  String(v ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const str = (v: Cell) => (v == null ? "" : String(v).trim());

const num = (v: Cell) => {
  if (typeof v === "number") return v;
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const pad = (n: number) => String(n).padStart(2, "0");

function fmtDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Normalisasi tanggal/waktu ke "YYYY-MM-DD HH:mm:ss" (waktu lokal). */
export function toDateTime(v: Cell): string {
  if (v == null || v === "") return "";
  if (v instanceof Date) return isNaN(v.getTime()) ? "" : fmtDate(v);
  if (typeof v === "number") {
    // Serial Excel
    const p = XLSX.SSF.parse_date_code(v);
    if (!p) return "";
    return `${p.y}-${pad(p.m)}-${pad(p.d)} ${pad(p.H)}:${pad(p.M)}:${pad(Math.floor(p.S))}`;
  }
  const s = String(v).trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(s);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])} ${pad(+(m[4] ?? 0))}:${pad(+(m[5] ?? 0))}:${pad(+(m[6] ?? 0))}`;
  m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(s);
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return `${y}-${pad(+m[2])}-${pad(+m[1])} ${pad(+(m[4] ?? 0))}:${pad(+(m[5] ?? 0))}:${pad(+(m[6] ?? 0))}`;
  }
  return "";
}

/** "00:03:36" atau angka detik/fraksi hari -> detik. */
export function toSeconds(v: Cell): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v < 1 ? Math.round(v * 86400) : v;
  if (v instanceof Date) return v.getHours() * 3600 + v.getMinutes() * 60 + v.getSeconds();
  const m = /^(\d+):(\d{2})(?::(\d{2}))?$/.exec(String(v).trim());
  if (m) return m[3] != null ? +m[1] * 3600 + +m[2] * 60 + +m[3] : +m[1] * 60 + +m[2];
  return num(v);
}

function sheetGrid(wb: XLSX.WorkBook, name: string): Grid {
  const ws = wb.Sheets[name];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json<Cell[]>(ws, { header: 1, raw: true, defval: null, blankrows: false });
}

/** Cari baris header yang memuat semua kolom wajib; kembalikan index & peta kolom. */
function findHeader(grid: Grid, required: string[], scan = 30) {
  for (let r = 0; r < Math.min(scan, grid.length); r++) {
    const cells = (grid[r] ?? []).map(norm);
    if (required.every((h) => cells.includes(h))) {
      const col = (h: string) => cells.indexOf(h);
      return { row: r, col, cells };
    }
  }
  return null;
}

// ---------------- Dataset parsers ----------------

function parseCallDetail(grid: Grid): CallRow[] | null {
  const h = findHeader(grid, ["agent", "name", "start time", "duration(s)", "status"]);
  if (!h) return null;
  const cWait = h.col("duration wait(s)");
  const cEnd = h.col("end time");
  // Call abandon tidak punya Start Time, jadi pakai End Time sebagai cadangan.
  return grid
    .slice(h.row + 1)
    .filter((r) => r[h.col("status")] != null && (r[h.col("start time")] != null || (cEnd >= 0 && r[cEnd] != null)))
    .map((r) => ({
      agent: str(r[h.col("name")]),
      start: toDateTime(r[h.col("start time")] ?? (cEnd >= 0 ? r[cEnd] : null)),
      dur: num(r[h.col("duration(s)")]),
      wait: cWait >= 0 ? num(r[cWait]) : 0,
      status: str(r[h.col("status")]),
    }));
}

function parseInbound(grid: Grid): TicketRow[] | null {
  const h = findHeader(grid, ["id", "call date", "category", "sub category", "description"]);
  if (!h) return null;
  const g = (r: Cell[], k: string) => (h.col(k) >= 0 ? r[h.col(k)] : null);
  return grid
    .slice(h.row + 1)
    .filter((r) => g(r, "id") != null)
    .map((r) => ({
      id: str(g(r, "id")),
      date: toDateTime(g(r, "call date")),
      name: str(g(r, "name")),
      category: str(g(r, "category")).toUpperCase(),
      sub: str(g(r, "sub category")).replace(/\s+/g, " "),
      desc: str(g(r, "description")),
      answer: str(g(r, "answer")),
      notes: str(g(r, "notes")),
      dur: toSeconds(g(r, "duration")),
      status: str(g(r, "status")),
      agent: str(g(r, "agent name")),
    }));
}

function parseOutbound(grid: Grid): OutboundRow[] | null {
  const h = findHeader(grid, ["campaign", "attempt call", "status call", "result call"]);
  if (!h) return null;
  const g = (r: Cell[], k: string) => (h.col(k) >= 0 ? r[h.col(k)] : null);
  return grid
    .slice(h.row + 1)
    .filter((r) => g(r, "campaign") != null)
    .map((r) => {
      const dt = toDateTime(g(r, "hp last_attempt")) || toDateTime(g(r, "telp last_attempt"));
      return {
        campaign: str(g(r, "campaign")).replace(/\s+/g, " "),
        date: dt.slice(0, 10),
        attempt: str(g(r, "attempt call")),
        status: str(g(r, "status call")),
        result: str(g(r, "result call")),
        notes: str(g(r, "notes")),
        agent: str(g(r, "agent")),
      };
    });
}

function parseEscalation(grid: Grid): EscalationRow[] | null {
  const h = findHeader(grid, ["date", "channel", "customer name", "comment"]);
  if (!h) return null;
  const g = (r: Cell[], k: string) => (h.col(k) >= 0 ? r[h.col(k)] : null);
  return grid
    .slice(h.row + 1)
    .filter((r) => g(r, "customer name") != null)
    .map((r) => ({
      date: toDateTime(g(r, "date")),
      channel: str(g(r, "channel")),
      agent: str(g(r, "name")),
      customer: str(g(r, "customer name")),
      ticket: str(g(r, "no. ticket")),
      comment: str(g(r, "comment")),
    }));
}

function parseOmniIncoming(grid: Grid): OmniIncomingRow[] | null {
  const h = findHeader(grid, ["no. ticket", "ticket date", "tags"]);
  if (!h) return null;
  return grid
    .slice(h.row + 1)
    .filter((r) => r[h.col("no. ticket")] != null)
    .map((r) => ({
      ticket: str(r[h.col("no. ticket")]),
      date: toDateTime(r[h.col("ticket date")]),
      tags: str(r[h.col("tags")]),
    }));
}

function parseTransfer(grid: Grid): TransferRow[] | null {
  const h = findHeader(grid, ["datetime", "transfer rs. name", "transfer rs. services", "status"]);
  if (!h) return null;
  const g = (r: Cell[], k: string) => (h.col(k) >= 0 ? r[h.col(k)] : null);
  return grid
    .slice(h.row + 1)
    .filter((r) => g(r, "datetime") != null)
    .map((r) => ({
      date: toDateTime(g(r, "datetime")),
      agent: str(g(r, "agent")),
      rs: str(g(r, "transfer rs. name")),
      service: str(g(r, "transfer rs. services")),
      status: str(g(r, "status")).toUpperCase(),
      dur: toSeconds(g(r, "duration")),
    }));
}

// ---------------- Score (QA) ----------------

const CATEGORY_NAME_FIX: Record<string, string> = {
  "OPENING & GREETING": "Greeting Opening",
};

function titleCase(s: string) {
  return s
    .toLowerCase()
    .replace(/(^|[\s(/&-])([a-z])/g, (_, p, c) => p + c.toUpperCase())
    .replace(/\bAnd\b/g, "and");
}

function cleanCategory(raw: string, kind: "inbound" | "outbound" | "chat") {
  const base = raw.replace(/^\d+\.\s*/, "").replace(/\n.*$/s, "").replace(/\(max.*$/i, "").trim().toUpperCase();
  if (kind === "inbound" && CATEGORY_NAME_FIX[base]) return CATEGORY_NAME_FIX[base];
  return titleCase(base);
}

function parseScore(wb: XLSX.WorkBook, kind: "inbound" | "outbound" | "chat"): ScoreSummary {
  const out: ScoreSummary = { overall: null, categories: [], agents: [], parameters: [], responses: 0 };

  // 1) Ringkasan per Kategori
  const rk = sheetGrid(wb, wb.SheetNames.find((n) => /ringkasan/i.test(n)) ?? "");
  const hk = findHeader(rk, ["kategori", "bobot / poin maks", "% pencapaian"]);
  if (hk) {
    for (let r = hk.row + 1; r < rk.length; r++) {
      const row = rk[r];
      const name = str(row[hk.col("kategori")]);
      if (!name) break;
      const max = num(row[hk.col("bobot / poin maks")]);
      const pct = num(row[hk.col("% pencapaian")]);
      if (/^total$/i.test(name)) {
        if (pct > 0) out.overall = pct;
        break;
      }
      out.categories.push({ name: cleanCategory(name, kind), max, pct });
    }
    // Ringkasan per parameter
    const hp = findHeader(rk.slice(hk.row + 1), ["no", "kategori", "parameter", "% ya"], 60);
    if (hp) {
      const base = hk.row + 1 + hp.row + 1;
      for (let r = base; r < rk.length; r++) {
        const row = rk[r];
        if (row[hp.col("parameter")] == null) continue;
        const total = num(row[hp.col("total dinilai")]);
        if (total > out.responses) out.responses = total;
        out.parameters.push({
          category: cleanCategory(str(row[hp.col("kategori")]), kind),
          name: str(row[hp.col("parameter")]),
          pctYes: num(row[hp.col("% ya")]),
          no: num(row[hp.col("tidak")]),
        });
      }
    }
  }

  // 2) Skor Agent per Kategori
  const ag = sheetGrid(wb, wb.SheetNames.find((n) => /agent/i.test(n)) ?? "");
  const ha = findHeader(ag, ["agent", "team leader"]);
  if (ha) {
    const totalCol = ha.cells.findIndex((c) => c.startsWith("total"));
    const catCols = ha.cells
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => /\(max\s*\d+\)/.test(c));
    let teamRow: Cell[] | null = null;
    for (let r = ha.row + 1; r < ag.length; r++) {
      const row = ag[r];
      const name = str(row[ha.col("agent")]);
      if (!name) continue;
      if (/rata-rata/i.test(name)) {
        teamRow = row;
        continue;
      }
      const score = num(row[totalCol]);
      if (score > 0) out.agents.push({ name, tl: str(row[ha.col("team leader")]), score: score / 100 });
    }
    // Fallback bila sheet ringkasan belum terhitung (nilai 0)
    const ringkasanKosong = out.categories.length === 0 || out.categories.every((c) => c.pct === 0);
    if (ringkasanKosong && teamRow) {
      out.categories = catCols.map(({ c, i }) => {
        const max = num(/\(max\s*(\d+)\)/.exec(c)?.[1]);
        const name = cleanCategory(String(ag[ha.row][i]), kind);
        return { name, max, pct: max ? num(teamRow![i]) / max : 0 };
      });
      out.overall = num(teamRow[totalCol]) / 100;
    }
  }

  // 3) Fallback: hitung rata-rata TOTAL dari Skor per Respon
  if (out.overall == null) {
    const sr = sheetGrid(wb, wb.SheetNames.find((n) => /respon/i.test(n)) ?? "");
    const totals = sr
      .slice(1)
      .map((r) => r.find((c, i) => i > 30 && typeof c === "number" && c > 1 && c <= 100) as number | undefined)
      .filter((v): v is number => typeof v === "number");
    if (totals.length) out.overall = totals.reduce((a, b) => a + b, 0) / totals.length / 100;
  }
  return out;
}

function scoreKind(wb: XLSX.WorkBook): "inbound" | "outbound" | "chat" | null {
  if (!wb.SheetNames.some((n) => /skor per respon/i.test(n))) return null;
  const text = wb.SheetNames.map((n) => {
    const g = sheetGrid(wb, n).slice(0, 12);
    return g.map((r) => r.map((c) => str(c)).join(" ")).join(" ");
  })
    .join(" ")
    .toUpperCase();
  if (/\(CHAT\)|— CHAT|WRITING SKILL/.test(text)) return "chat";
  if (/NEED IDENTIFICATION|SALES TECHNIQUE|OPENING & INTRODUCTION/.test(text)) return "outbound";
  if (/\(INBOUND\)|— INBOUND|COMMUNICATION SKILLS/.test(text)) return "inbound";
  return null;
}

export interface ParsedFile {
  dataset: DatasetKey;
  rows: unknown[];
  info: string;
}

/** Deteksi jenis file + parse. Melempar error bila format tidak dikenali. */
export function parseWorkbook(data: ArrayBuffer | Uint8Array, filename = ""): ParsedFile {
  const wb = XLSX.read(data, { type: "array", cellDates: true, dense: true });

  const kind = scoreKind(wb);
  if (kind) {
    const s = parseScore(wb, kind);
    return {
      dataset: `score_${kind}` as DatasetKey,
      rows: [s],
      info: `Score ${kind}: ${s.overall != null ? (s.overall * 100).toFixed(2) + "%" : "-"}, ${s.agents.length} agent`,
    };
  }

  const preferred = ["CALL_DETAIL", ...wb.SheetNames];
  const tries: [DatasetKey, (g: Grid) => unknown[] | null][] = [
    ["calldetail", parseCallDetail],
    ["inbound", parseInbound],
    ["outbound", parseOutbound],
    ["omni_escalation", parseEscalation],
    ["omni_incoming", parseOmniIncoming],
    ["transfer_call", parseTransfer],
  ];
  for (const sheet of preferred) {
    if (!wb.Sheets[sheet]) continue;
    const grid = sheetGrid(wb, sheet);
    for (const [key, fn] of tries) {
      const rows = fn(grid);
      if (rows && rows.length) return { dataset: key, rows, info: `${rows.length.toLocaleString("id-ID")} baris (sheet ${sheet})` };
    }
  }
  throw new Error(`Format file "${filename}" tidak dikenali. Pastikan header kolom sesuai template raw data.`);
}
