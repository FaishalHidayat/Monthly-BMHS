// Master data rumah sakit RS Bunda Group yang dilayani Contact Center.

export type RsCode =
  | "RSIABJ"
  | "RSUBJ"
  | "RSUBM"
  | "RSUCH"
  | "RSIABC"
  | "RSUBP"
  | "RSIABD"
  | "RSIAAZ"
  | "RSIAPT";

export const RS_LIST: { code: RsCode; name: string; short: string }[] = [
  { code: "RSIABJ", name: "RSIA Bunda Jakarta", short: "RSIABJ" },
  { code: "RSUBJ", name: "RSU Bunda Jakarta", short: "RSUBJ" },
  { code: "RSUBM", name: "RSU Bunda Margonda", short: "RSUBM" },
  { code: "RSUCH", name: "RSU Bunda Citra Harapan", short: "RSUCH" },
  { code: "RSIABC", name: "RSIA Bunda Ciputat", short: "RSIABC" },
  { code: "RSUBP", name: "RSU Bunda Padang", short: "RSUBP" },
  { code: "RSIABD", name: "RSIA Bunda Denpasar", short: "RSIABD" },
  { code: "RSIAAZ", name: "RSIA Az Zahra Palembang", short: "RSIAAZ" },
  { code: "RSIAPT", name: "RSIA Pusura Tegalsari", short: "RSIAPT" },
];

export const RS_NAME: Record<string, string> = Object.fromEntries(
  RS_LIST.map((r) => [r.code, r.name]),
);

// Urutan pola penting: nama lengkap dulu, lalu kode singkatan.
const RS_PATTERNS: [RsCode, RegExp][] = [
  ["RSIABJ", /RSIA\s*\.?\s*BUNDA\s*JAKARTA|RSIA\s*BJ\b|RSIABJ/],
  ["RSUBJ", /RSU\s*\.?\s*BUNDA\s*JAKARTA|RSU\s*BJ\b|RSUBJ/],
  ["RSUBM", /MARGONDA|RSUBM|RSU\s*BM\b/],
  ["RSUCH", /CITRA\s*HARAPAN|RSUCH|RSU\s*CH\b|RSCH\b/],
  ["RSIABC", /CIPUTAT|RSIABC|RSIA\s*BC\b/],
  ["RSUBP", /PADANG|RSUBP|RSU\s*BP\b/],
  ["RSIABD", /DENPASAR|RSIABD|RSIA\s*BD\b/],
  ["RSIAAZ", /AZ[\s-]*ZAHRA|AZZAHRA|PALEMBANG|PELEMBANG|RSIAAZ|RSIAPLG/],
  ["RSIAPT", /PUSURA|TEGALSARI|RSIAPT/],
];

/** Cari RS yang disebut paling awal dalam teks. */
export function detectRs(text: unknown): RsCode | null {
  if (text == null) return null;
  const t = String(text).toUpperCase();
  let best: { code: RsCode; idx: number } | null = null;
  for (const [code, re] of RS_PATTERNS) {
    const m = re.exec(t);
    if (m && (best === null || m.index < best.idx)) best = { code, idx: m.index };
  }
  return best?.code ?? null;
}

/** Nama-nama RS yang dilayani (untuk teks Coverage Area). */
export const COVERAGE_TEXT = RS_LIST.map((r) => r.name).join(", ");
