// Format angka, persen, durasi, dan label periode (Bahasa Indonesia).

export const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const MON_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];

export const fmtNum = (n: number | null | undefined, d = 0) =>
  n == null || !Number.isFinite(n) ? "-" : n.toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });

/** 0.9882 -> "98,82%" */
export const fmtPct = (n: number | null | undefined, d = 2) => (n == null || !Number.isFinite(n) ? "-" : `${fmtNum(n * 100, d)}%`);

/** 216 -> "00:03:36" */
export function fmtDur(sec: number | null | undefined) {
  if (sec == null || !Number.isFinite(sec)) return "-";
  const s = Math.round(sec);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

const parse = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return { y, m, d };
};

/** "2026-09-26","2026-10-25" -> "26 September – 25 Oktober 2026" */
export function periodLabel(start: string, end: string) {
  const a = parse(start);
  const b = parse(end);
  const left = a.y === b.y ? `${a.d} ${BULAN[a.m - 1]}` : `${a.d} ${BULAN[a.m - 1]} ${a.y}`;
  return `${left} – ${b.d} ${BULAN[b.m - 1]} ${b.y}`;
}

/** Label kolom KPI bulanan: "Oct-26" */
export function monthLabel(end: string) {
  const b = parse(end);
  return `${MON_EN[b.m - 1]}-${String(b.y).slice(2)}`;
}

/** Label periode QA: "26 Agustus'26 - 25 September'26" */
export function qaLabel(start: string, end: string) {
  const a = parse(start);
  const b = parse(end);
  return `${a.d} ${BULAN[a.m - 1]}'${String(a.y).slice(2)} - ${b.d} ${BULAN[b.m - 1]}'${String(b.y).slice(2)}`;
}

/** Periode sebelumnya (geser 1 bulan). */
export function previousRange(start: string, end: string) {
  const shift = (iso: string) => {
    const { y, m, d } = parse(iso);
    const dt = new Date(Date.UTC(y, m - 2, d));
    return dt.toISOString().slice(0, 10);
  };
  return { start: shift(start), end: shift(end) };
}

/** Periode default: 26 bulan lalu s/d 25 bulan ini. */
export function defaultRange(today = new Date()) {
  const y = today.getFullYear();
  const m = today.getMonth(); // 0-based
  const endMonth = today.getDate() > 25 ? m : m - 1;
  const end = new Date(Date.UTC(y, endMonth, 25));
  const start = new Date(Date.UTC(y, endMonth - 1, 26));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export const shortDate = (iso: string) => {
  const { m, d } = parse(iso);
  return `${d} ${BULAN[m - 1].slice(0, 3)}`;
};

/** Tanggal + nama bulan lengkap: "13 Oktober" */
export const dayMonth = (iso: string) => {
  const { m, d } = parse(iso);
  return `${d} ${BULAN[m - 1]}`;
};

export const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;

/** Selisih bertanda: +204 / -311 */
export const signed = (n: number, d = 0) => `${n > 0 ? "+" : n < 0 ? "-" : ""}${fmtNum(Math.abs(n), d)}`;
