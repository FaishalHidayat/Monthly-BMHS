// Perhitungan metrik laporan dari baris raw data ternormalisasi.
import { detectRs, RS_LIST, RS_NAME } from "./rs";
import type {
  CallRow,
  DatasetRows,
  EscalationMetrics,
  EscalationRow,
  InboundMetrics,
  NameCount,
  OmniIncomingMetrics,
  OmniIncomingRow,
  OutboundMetrics,
  OutboundRow,
  PeriodMetrics,
  QualityBlock,
  ScoreSummary,
  TicketMetrics,
  TicketRow,
  TransferMetrics,
  TransferRow,
} from "./types";

const round = (v: number, d = 4) => Math.round(v * 10 ** d) / 10 ** d;

function countBy<T>(rows: T[], key: (r: T) => string | null | undefined): NameCount[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = key(r);
    if (!k) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

// ---------------- Inbound call ----------------

export function computeInbound(rows: CallRow[]): InboundMetrics {
  const ok = (r: CallRow) => /success|answer/i.test(r.status);
  const answered = rows.filter(ok);
  const incoming = rows.length;
  const abandon = incoming - answered.length;

  const byDate = new Map<string, CallRow[]>();
  for (const r of rows) {
    const d = r.start.slice(0, 10);
    if (!d) continue;
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(r);
  }
  const daily = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, rs]) => {
      const ans = rs.filter(ok);
      return {
        date,
        incoming: rs.length,
        answered: ans.length,
        abandon: rs.length - ans.length,
        sl: rs.length ? round(ans.length / rs.length) : 0,
        ahtSec: Math.round(avg(ans.map((r) => r.dur))),
      };
    });

  // Rata-rata per jam: jumlah call di jam tsb / jumlah hari yang memiliki call di jam tsb.
  const interval = Array.from({ length: 24 }, (_, hour) => {
    const inHour = rows.filter((r) => +r.start.slice(11, 13) === hour);
    const days = new Set(inHour.map((r) => r.start.slice(0, 10))).size;
    const ab = inHour.filter((r) => !ok(r));
    const abDays = new Set(ab.map((r) => r.start.slice(0, 10))).size;
    return {
      hour,
      avgIncoming: days ? round(inHour.length / days, 2) : 0,
      avgAbandon: abDays ? round(ab.length / abDays, 2) : 0,
    };
  });

  const peak = daily.reduce<{ date: string; incoming: number } | undefined>(
    (best, d) => (!best || d.incoming > best.incoming ? { date: d.date, incoming: d.incoming } : best),
    undefined,
  );

  return {
    incoming,
    answered: answered.length,
    abandon,
    ahtSec: Math.round(avg(answered.map((r) => r.dur))),
    soaSec: Math.round(avg(answered.map((r) => r.wait))),
    sl: incoming ? round(answered.length / incoming) : 0,
    abandonRate: incoming ? round(abandon / incoming) : 0,
    daily,
    interval,
    peakDay: peak,
  };
}

// ---------------- Dokter khusus ----------------

const TITLE_TOKENS = /^(DR|DRA|DRG|PROF|DOKTER|SP|SPA|SPOG|SPAK|SUBSP|MARS|PHD|M|KED|K|MKES|MSC|FICS|FINASIM)$/;
const STOP_WORDS =
  /^(PENDAFTARAN|PERNDAFTARAN|PERIHAL|MENANYAKAN|MENANYAKA|JADWAL|JADWALDR|PRAKTIK|PERJANJIAN|PERJANIJIAN|INFORMASI|DAN|HARI|INI|BESOK|UTK|UNTUK|TGL|RESCHEDULE|INGIN|DAFTAR|KE|DENGAN|DGN|APPT|PERMINTAAN|MINGGU|DEPAN|SENIN|SELASA|RABU|KAMIS|JUMAT|SABTU|ADA)$/;

/** Ambil nama dokter dari deskripsi tiket berformat bebas. */
export function extractDoctor(desc: string): string | null {
  const lines = desc
    .toUpperCase()
    .split(/\n|\/\//)
    .map((l) => l.replace(/\t/g, " ").trim())
    .filter(Boolean);
  let cand: string | null = null as string | null;
  // 1) Baris berlabel DOKTER
  for (const l of lines) {
    const m = /(?:NAMA\s+)?DOKTER(?:\s+(?:YANG\s+DITUJU|TUJUAN|YG\s+DITUJU))?\s*:\s*(.+)$/.exec(l);
    if (m && m[1].replace(/[-\s]/g, "")) {
      cand = m[1];
      break;
    }
  }
  // 2) Baris yang memuat gelar dokter
  if (!cand) {
    for (const l of lines) {
      if (/\bSP\s*\.?\s*[A-Z]|,\s*DR\b|DR\s*\.|\bDR\s+[A-Z]|\bPROF\b/.test(l) && !/POLI\s*:/.test(l)) {
        cand = l;
        break;
      }
    }
  }
  if (!cand) return null;
  const orig = cand;
  // Buang teks sebelum gelar "DR." / "PROF" yang diikuti nama (mis. "PERIHAL: PENDAFTARAN DR. ARIANI ...").
  // Gelar setelah koma (",DR.,SP.A") adalah gelar di belakang nama, jadi diabaikan.
  const titled = [...cand.matchAll(/(^|[^,A-Z])(?:DR|PROF)\.?,?\s*(?=(?!SP\b|SP\.|SUBSP|DR\b|DR\.)[A-Z][A-Z.])/g)];
  if (titled.length) {
    const last = titled[titled.length - 1];
    cand = cand.slice(last.index! + last[0].length);
    if (!cand.trim()) cand = null;
  }
  let s = (cand ?? orig)
    .replace(/\s+-\s+POLI.*$/, "")
    .replace(/^POLI\s+[A-Z ]+?(?=[A-Z]+\s*,)/, "")
    .replace(/\bPOLI\b.*$/, "")
    .replace(/\d{1,2}\s+(JAN|FEB|MAR|APR|MEI|JUN|JUL|AGU|AGS|SEP|OKT|NOV|DES)\w*\s+\d{4}.*/, "")
    .trim();
  s = s.replace(/^((DR|DRG|PROF|DOKTER)\.?,?\s*)+/, "").trim();
  // Nama inti = sebelum koma pertama
  s = s.split(",")[0].trim();
  s = s.replace(/\s+(SP\.?|M\.?KED).*$/, "").trim();
  const words = s
    .replace(/[^A-Z.\s'-]/g, " ")
    .split(/\s+/)
    .map((w) => (/^[A-Z]\.([A-Z]\.)+$/.test(w) ? w : w.replace(/^\.+|\.+$/g, "")))
    .filter((w) => w && !TITLE_TOKENS.test(w.replace(/\./g, "")) && !STOP_WORDS.test(w));
  if (!words.length || words.join("").length < 3) return null;
  return words.join(" ");
}

const keyWords = (name: string) => name.replace(/[^A-Z\s]/g, "").split(/\s+/).filter(Boolean);
const docKey = (name: string) => keyWords(name).join(" ");

function prettyDoctor(name: string) {
  const t = name
    .toLowerCase()
    .replace(/(^|[\s.'-])([a-z])/g, (_, p, c) => p + c.toUpperCase());
  return `dr. ${t}`;
}

// ---------------- Tiket inbound ----------------

export function computeTickets(rows: TicketRow[]): TicketMetrics {
  const total = rows.length;
  const closed = rows.filter((r) => /close|solved|done/i.test(r.status)).length;
  const sub = (cat: string) => countBy(rows.filter((r) => r.category === cat), (r) => r.sub);

  // Dokter khusus
  const dk = rows.filter((r) => /dokter khusus/i.test(r.sub));
  const docRows = dk.map((r) => {
    const doc = extractDoctor(r.desc);
    const rs = detectRs(r.desc) ?? detectRs(r.sub) ?? "LAINNYA";
    return { doc, rs };
  });
  const docCount = new Map<string, { names: Map<string, number>; perRs: Record<string, number>; total: number }>();
  for (const { doc, rs } of docRows) {
    if (!doc) continue;
    const k = docKey(doc);
    if (!k) continue;
    if (!docCount.has(k)) docCount.set(k, { names: new Map(), perRs: {}, total: 0 });
    const e = docCount.get(k)!;
    e.total++;
    e.names.set(doc, (e.names.get(doc) ?? 0) + 1);
    e.perRs[rs] = (e.perRs[rs] ?? 0) + 1;
  }
  // Gabungkan variasi nama (mis. "KLARA" / "ARIANI WIDODO" -> nama terlengkap yang paling sering)
  const keys = [...docCount.keys()].sort((a, b) => docCount.get(a)!.total - docCount.get(b)!.total);
  for (const k of keys) {
    const kw = k.split(" ");
    const target = [...docCount.keys()]
      .filter((o) => o !== k && docCount.get(o)!.total >= docCount.get(k)!.total)
      .filter((o) => {
        const ow = o.split(" ");
        return ow[0] === kw[0] && kw.every((w) => ow.includes(w));
      })
      .sort((a, b) => docCount.get(b)!.total - docCount.get(a)!.total)[0];
    if (target) {
      const src = docCount.get(k)!;
      const dst = docCount.get(target)!;
      dst.total += src.total;
      for (const [n, c] of src.names) dst.names.set(n, (dst.names.get(n) ?? 0) + c);
      for (const [rs, c] of Object.entries(src.perRs)) dst.perRs[rs] = (dst.perRs[rs] ?? 0) + c;
      docCount.delete(k);
    }
  }
  const byDoctor = [...docCount.values()]
    .map((e) => {
      const best = [...e.names.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)[0][0];
      return { doctor: prettyDoctor(best), total: e.total, perRs: e.perRs };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 15);

  // SHARECARECC & IGD (filter kolom Notes)
  const share = rows.filter((r) => /SHARECAREC/i.test(r.notes));
  const igd = rows.filter((r) => /FIGD/i.test(r.notes));
  const igdRs = (r: TicketRow) => detectRs(r.notes.replace(/#?FIGD/gi, " ")) ?? detectRs(r.desc) ?? "LAINNYA";
  const cap = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

  const keluhanRows = rows.filter((r) => r.category === "KELUHAN");

  // Kontributor tiket permintaan terbesar (untuk highlight)
  const perm = sub("PERMINTAAN");
  const top = perm[0];

  return {
    total,
    solvingRate: total ? round(closed / total) : 0,
    byCategory: countBy(rows, (r) => r.category),
    bySub: countBy(rows, (r) => r.sub),
    permintaan: perm,
    informasi: sub("INFORMASI"),
    keluhan: sub("KELUHAN"),
    spam: sub("SPAM"),
    keluhanList: keluhanRows.map((r) => ({
      date: r.date,
      sub: r.sub,
      rs: RS_NAME[detectRs(r.desc) ?? ""] ?? "-",
      description: r.desc,
      answer: r.answer,
    })),
    dokterKhusus: {
      total: dk.length,
      byRs: countBy(docRows, (r) => RS_NAME[r.rs] ?? "Lainnya"),
      byDoctor,
    },
    sharecare: {
      total: share.length,
      bySub: countBy(share, (r) => r.sub),
      byRs: countBy(share, (r) => RS_NAME[detectRs(r.sub) ?? detectRs(r.desc) ?? ""] ?? "Lainnya"),
    },
    igd: {
      total: igd.length,
      byRs: RS_LIST.filter((r) => ["RSIABJ", "RSUBJ", "RSUCH", "RSUBM", "RSIABD", "RSIABC", "RSUBP"].includes(r.code)).map((r) => ({
        name: r.code,
        count: igd.filter((t) => igdRs(t) === r.code).length,
      })),
      byCategory: countBy(igd, (r) => cap(r.category)),
      samples: igd.filter((r) => r.category === "PERMINTAAN" || r.category === "INFORMASI").slice(0, 40).map((r) => ({
        category: cap(r.category),
        sub: r.sub,
        description: r.desc.slice(0, 220),
      })),
    },
    topRsInbound: top ? { rs: detectRs(top.name) ?? "", sub: top.name, count: top.count, pct: total ? round(top.count / total) : 0 } : undefined,
  };
}

// ---------------- Outbound ----------------

function failReason(result: string) {
  const r = result.trim();
  if (/lain-lain/i.test(r)) return "Menolak (lain-lain)";
  const inner = /\(([^)]+)\)/.exec(r)?.[1] ?? r;
  const s = inner.replace(/^menolak\s+/i, "").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function menolakBucket(notes: string) {
  const n = notes.toLowerCase();
  if (/sendiri|onebunda|one bunda|aplikasi|apk/.test(n)) return "Ingin mendaftar / menghubungi sendiri";
  if (/sudah (di)?vaksin|sudah melakukan vaksin|sudah lengkap/.test(n)) return "Sudah melakukan vaksin";
  if (/tidak berkenan|tidak minat|belum minat|tidak tertarik/.test(n)) return "Menolak tanpa alasan spesifik";
  if (/jauh|pindah|domisili|luar kota/.test(n)) return "Lokasi / domisili";
  if (/sakit|demam|kondisi/.test(n)) return "Kondisi anak sedang sakit";
  return "Lainnya";
}

export function computeOutbound(rows: OutboundRow[]): OutboundMetrics {
  const isConnected = (r: OutboundRow) => /^connected$/i.test(r.attempt);
  const isSuccess = (r: OutboundRow) => /success/i.test(r.status);
  const connected = rows.filter(isConnected);
  const success = rows.filter(isSuccess);
  const bmhs = rows.filter((r) => /instruksi|bmhs/i.test(r.attempt) || /tidak boleh dihubungi/i.test(r.result));

  const byDate = new Map<string, OutboundRow[]>();
  for (const r of rows) {
    if (!r.date) continue;
    if (!byDate.has(r.date)) byDate.set(r.date, []);
    byDate.get(r.date)!.push(r);
  }
  const menolak = connected.filter((r) => /lain-lain/i.test(r.result));

  return {
    leads: rows.length,
    connected: connected.length,
    success: success.length,
    bmhsInstruction: bmhs.length,
    connectRate: rows.length ? round(connected.length / rows.length) : 0,
    successRate: connected.length ? round(success.length / connected.length) : 0,
    invalid: rows.filter((r) => /invalid|tidak aktif/i.test(r.result)).length,
    failReasons: countBy(connected.filter((r) => !isSuccess(r)), (r) => failReason(r.result)),
    notConnectedReasons: countBy(rows.filter((r) => !isConnected(r) && !isSuccess(r)), (r) => r.result || "-"),
    daily: [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, rs]) => ({ date, leads: rs.length, connected: rs.filter(isConnected).length, success: rs.filter(isSuccess).length })),
    appointmentsByRs: countBy(success, (r) => RS_NAME[detectRs(r.campaign) ?? ""] ?? r.campaign),
    campaigns: countBy(rows, (r) => r.campaign),
    menolakNotes: countBy(menolak, (r) => menolakBucket(r.notes)),
    successPhones: success.length,
  };
}

// ---------------- Omni ----------------

export function computeOmniIncoming(rows: OmniIncomingRow[], start?: string, end?: string): OmniIncomingMetrics {
  // Filter tanggal hanya dipakai bila file memuat data di luar periode secara jelas.
  const inside = rows.filter((r) => !r.date || !start || !end || (r.date.slice(0, 10) >= start && r.date.slice(0, 10) <= end));
  const inPeriod = inside.length >= rows.length * 0.97 ? inside : rows;
  const cat = (tags: string) => {
    const t = tags.trim();
    if (!t || t === "-") return "Permintaan - Pendaftaran ChatBot";
    if (/SPAM/i.test(t)) return null;
    const first = t.split(",")[0];
    const last = first.split(">").pop()!.trim();
    return last.replace(/^\d+\s*-\s*/, "").replace(/\s+/g, " ");
  };
  const spam = inPeriod.filter((r) => /SPAM/i.test(r.tags)).length;
  const byCategory = countBy(inPeriod, (r) => cat(r.tags));
  return { total: byCategory.reduce((a, b) => a + b.count, 0), spam, byCategory };
}

const MONTHS: Record<string, number> = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MEI: 5, MAY: 5, JUN: 6, JUL: 7, AGU: 8, AGS: 8, AUG: 8, SEP: 9, OKT: 10, OCT: 10, NOV: 11, DES: 12, DEC: 12,
};

function appointmentDate(comment: string): string | null {
  const m = /tanggal\s*app?o?i?n?t?\w*\s*:?\s*([^\n]{0,40})/i.exec(comment);
  if (!m) return null;
  const s = m[1].toUpperCase();
  let d = /(\d{1,2})\s*([A-Z]{3})[A-Z]*\s*(\d{4})/.exec(s);
  if (d && MONTHS[d[2]]) return `${d[3]}-${String(MONTHS[d[2]]).padStart(2, "0")}-${d[1].padStart(2, "0")}`;
  d = /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/.exec(s);
  if (d) return `${d[3]}-${d[2].padStart(2, "0")}-${d[1].padStart(2, "0")}`;
  return null;
}

/** 14 kondisi yang boleh ditransfer/eskalasi ke Admission (acuan SOP). */
export const ESCALATION_TOPICS = [
  "Pendaftaran Hari-H",
  "Dokter Khusus / Slot Terbatas",
  "Administrasi Rawat Inap",
  "Ubah Kelas Kamar",
  "Ketersediaan Kamar",
  "Ubah Appointment Khusus",
  "Status Adm. Pasien",
  "Deposit / Pembayaran",
  "Kelengkapan Dokumen",
  "Wewenang Admission",
  "Asuransi / Billing",
  "IGD / Emergency",
  "Ambulance",
  "BPJS (Cabang Tanpa PIC)",
] as const;

// Urutan cek = prioritas (yang paling spesifik lebih dulu).
const TOPIC_RULES: [string, RegExp][] = [
  ["IGD / Emergency", /\bigd\b|emergency|darurat|gawat/],
  ["Ambulance", /ambulan/],
  ["Ubah Kelas Kamar", /(naik|turun|ubah|pindah|ganti|upgrade|downgrade)\s*(ke\s*)?kelas/],
  ["Administrasi Rawat Inap", /(administrasi|admisi|pendaftaran|daftar|surat|pulang|keluar).{0,30}(rawat inap|ranap)|(rawat inap|ranap).{0,30}(administrasi|pulang|keluar|surat)/],
  ["Ketersediaan Kamar", /kamar|\bbed\b|tempat tidur|rawat inap|\branap\b|nicu|picu|\bhcu\b|\bicu\b|perina/],
  ["Deposit / Pembayaran", /deposit|pembayaran|\bbayar|tagihan|refund|\bdp\b|uang muka|transfer dana/],
  ["Asuransi / Billing", /klaim|billing|plafon|penutupan asuransi|asuransi(nya)? (belum )?(di)?tutup|\blog\b|guarantee|garansi|jaminan asuransi (tidak|belum)|limit asuransi/],
  ["BPJS (Cabang Tanpa PIC)", /bpjs/],
  ["Kelengkapan Dokumen", /dokumen|rujukan|surat|resume|hasil (lab|pemeriksaan|usg|rontgen|radiologi)|kwitansi|sertifikat|berkas|fotokopi/],
  ["Status Adm. Pasien", /status (pasien|administrasi)|administrasi pasien|data pasien|(ubah|ganti|perubahan|update|koreksi) data|nomor rm|no\.? ?rm|rekam medis|nomor rekam|registrasi ulang/],
  ["Ubah Appointment Khusus", /reschedule|re-?jadwal|ubah jadwal|ganti jadwal|ubah (appointment|appt|janji|perjanjian)|pembatalan|\bcancel\b|\bbatal|mundur(kan)?|majukan|pindah jadwal|ganti tanggal|ubah tanggal/],
  ["Wewenang Admission", /wewenang|kewenangan|(pihak|bagian|tim) (admission|admisi)|konfirmasi (ke )?admisi/],
];

/** Dokter khusus: subspesialis "(K)", SUBSP, Prof, atau disebut eksplisit. */
function isDokterKhusus(comment: string) {
  const c = comment.toLowerCase();
  if (/dokter khusus|slot|kuota|antrian penuh|jadwal penuh|kuota penuh/.test(c)) return true;
  const doc = /dokter\s*(yang dituju|tujuan)?\s*:?\s*([^\n]{0,90})/i.exec(comment)?.[2] ?? "";
  return /\(k\)|subsp|\bprof\b/i.test(doc);
}

export function escalationTopic(r: EscalationRow): string {
  // Ambil hanya isi "Keluhan/Kebutuhan" (berhenti di label field berikutnya pada form komentar).
  const raw = /keluhan\s*\/?\s*kebutuhan\s*:?([\s\S]{0,500})/i.exec(r.comment)?.[1] ?? r.comment;
  const need = raw
    .split(/mohon menghubungi|\bpoli\s*[:]|\bpoli\s+(?=[a-z])|\bdokter\s*:|status pasien\s*:|keterangan\s*:?|jaminan\s*:/i)[0]
    .toLowerCase();
  for (const [topic, re] of TOPIC_RULES) if (re.test(need)) return topic;
  if (isDokterKhusus(r.comment)) return "Dokter Khusus / Slot Terbatas";
  // Permintaan pendaftaran/konsultasi yang dieskalasi = pendaftaran hari-H.
  const appt = appointmentDate(r.comment);
  if (appt && r.date && appt === r.date.slice(0, 10)) return "Pendaftaran Hari-H";
  if (/hari ini|hari-h|hari h\b|daftar|pendaftaran|appointment|appt|janji temu|konsultasi|kontrol|periksa|berobat|vaksin|imunisasi|sakit|demam|batuk|pilek|nyeri|keluhan|diare|muntah/.test(need + " " + r.comment.toLowerCase()))
    return "Pendaftaran Hari-H";
  return "Lainnya";
}

export function computeEscalation(rows: EscalationRow[]): EscalationMetrics {
  const withRs = rows.map((r) => ({ r, rs: detectRs(r.customer) ?? detectRs(r.comment) ?? "LAINNYA" }));
  const byRs = RS_LIST.map((x) => ({ name: x.name, count: withRs.filter((w) => w.rs === x.code).length })).sort(
    (a, b) => b.count - a.count,
  );
  const topics = RS_LIST.map((x) => {
    const rs = withRs.filter((w) => w.rs === x.code);
    return { rs: x.name, total: rs.length, items: countBy(rs, (w) => escalationTopic(w.r)) };
  }).sort((a, b) => b.total - a.total);
  return { total: rows.length, byRs, topics };
}

// ---------------- Transfer call ----------------

export function computeTransfer(rows: TransferRow[]): TransferMetrics {
  const ans = (r: TransferRow) => /^ANSWERED$/.test(r.status.trim());
  const svc = (s: string) => {
    const u = s.toUpperCase();
    if (/RAJAL\s*(DAN|&)\s*RANAP/.test(u)) return "rajalRanap" as const;
    if (/^RAJAL/.test(u)) return "rajal" as const;
    if (/RANAP/.test(u)) return "ranap" as const;
    return "operator" as const;
  };
  const byRs = RS_LIST.map((x) => {
    const all = rows.filter((r) => detectRs(r.rs) === x.code);
    const ab = all.filter((r) => !ans(r));
    const c = { rajal: 0, ranap: 0, rajalRanap: 0, operator: 0 };
    for (const r of ab) c[svc(r.service)]++;
    return { rs: x.name, total: all.length, abandoned: ab.length, ...c };
  }).sort((a, b) => b.abandoned - a.abandoned);
  const answered = rows.filter(ans).length;
  return { total: rows.length, answered, abandoned: rows.length - answered, byRs };
}

// ---------------- Quality ----------------

export function computeQuality(s: ScoreSummary | undefined, label: string): QualityBlock | undefined {
  if (!s) return undefined;
  return {
    label,
    score: s.overall,
    categories: s.categories.map((c) => ({ name: c.name, pct: round(c.pct) })),
    agents: [...s.agents].sort((a, b) => b.score - a.score).map((a) => ({ name: a.name, score: round(a.score) })),
  };
}

// ---------------- Semua ----------------

export function computeMetrics(
  data: DatasetRows,
  opts: { start?: string; end?: string; qaLabel?: string } = {},
): PeriodMetrics {
  const qa = opts.qaLabel ?? "";
  const m: PeriodMetrics = {};
  if (data.calldetail?.length) m.inbound = computeInbound(data.calldetail);
  if (data.inbound?.length) m.tickets = computeTickets(data.inbound);
  if (data.outbound?.length) m.outbound = computeOutbound(data.outbound);
  if (data.omni_incoming?.length) m.omniIncoming = computeOmniIncoming(data.omni_incoming, opts.start, opts.end);
  if (data.omni_escalation?.length) m.escalation = computeEscalation(data.omni_escalation);
  if (data.transfer_call?.length) m.transfer = computeTransfer(data.transfer_call);
  const q = {
    inbound: computeQuality(data.score_inbound?.[0], qa),
    outbound: computeQuality(data.score_outbound?.[0], qa),
    chat: computeQuality(data.score_chat?.[0], qa),
  };
  if (q.inbound || q.outbound || q.chat) m.quality = q;
  return m;
}
