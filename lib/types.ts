// Tipe data bersama antara parser (browser), server, dashboard, dan PPT.

export type DatasetKey =
  | "calldetail"
  | "inbound"
  | "outbound"
  | "omni_escalation"
  | "omni_incoming"
  | "transfer_call"
  | "score_inbound"
  | "score_outbound"
  | "score_chat";

export const DATASETS: { key: DatasetKey; label: string; source: string; hint: string }[] = [
  { key: "calldetail", label: "Call Detail", source: "call detail", hint: "calldetail.xls (sheet CALL_DETAIL)" },
  { key: "inbound", label: "Tiket Inbound", source: "Inbound", hint: "inbound.xls (ALL TICKET)" },
  { key: "outbound", label: "Outbound Telesales", source: "outbond", hint: "outbound.xlsx" },
  { key: "omni_escalation", label: "Omni Chat (Eskalasi)", source: "Omni chat", hint: "Omni_chat.xlsx" },
  { key: "omni_incoming", label: "Omni Status Incoming", source: "Omni (status incoming)", hint: "Tiket_Omni_status_incoming.xlsx" },
  { key: "transfer_call", label: "Transfer Call", source: "Transfer call", hint: "TransferCall.xlsx" },
  { key: "score_inbound", label: "Score Inbound", source: "Score Inbound", hint: "SCORE_Inbound.xlsx" },
  { key: "score_outbound", label: "Score Outbound", source: "Score outbond", hint: "SCORE_Outbound.xlsx" },
  { key: "score_chat", label: "Score Chat", source: "Score chat", hint: "SCORE_Chat.xlsx" },
];

// ---------- Baris hasil normalisasi raw data ----------

export interface CallRow {
  agent: string;
  start: string; // "YYYY-MM-DD HH:mm:ss"
  dur: number; // detik
  wait: number; // detik
  status: string; // Success | Abandon
}

export interface TicketRow {
  id: string;
  date: string;
  name: string;
  category: string;
  sub: string;
  desc: string;
  answer: string;
  notes: string;
  dur: number;
  status: string;
  agent: string;
}

export interface OutboundRow {
  campaign: string;
  date: string; // tanggal attempt terakhir "YYYY-MM-DD"
  attempt: string; // Connected | Not Connected | Instruksi BMHS
  status: string; // Success | Failed
  result: string;
  notes: string;
  agent: string;
}

export interface EscalationRow {
  date: string;
  channel: string;
  agent: string;
  customer: string;
  ticket: string;
  comment: string;
}

export interface OmniIncomingRow {
  ticket: string;
  date: string;
  tags: string;
}

export interface TransferRow {
  date: string;
  agent: string;
  rs: string;
  service: string;
  status: string;
  dur: number;
}

export interface ScoreSummary {
  overall: number | null; // 0..1
  categories: { name: string; max: number; pct: number }[];
  agents: { name: string; tl: string; score: number }[];
  parameters: { category: string; name: string; pctYes: number; no: number }[];
  responses: number;
}

export type RowsOf<K extends DatasetKey> = K extends "calldetail"
  ? CallRow
  : K extends "inbound"
    ? TicketRow
    : K extends "outbound"
      ? OutboundRow
      : K extends "omni_escalation"
        ? EscalationRow
        : K extends "omni_incoming"
          ? OmniIncomingRow
          : K extends "transfer_call"
            ? TransferRow
            : ScoreSummary;

export type DatasetRows = Partial<{ [K in DatasetKey]: RowsOf<K>[] }>;

// ---------- Metrik per periode ----------

export interface NameCount {
  name: string;
  count: number;
}

export interface InboundMetrics {
  incoming: number;
  answered: number;
  abandon: number;
  ahtSec: number;
  soaSec: number;
  sl: number; // answered / incoming
  abandonRate: number;
  daily: { date: string; incoming: number; answered: number; abandon: number; sl: number; ahtSec: number }[];
  interval: { hour: number; avgIncoming: number; avgAbandon: number }[];
  peakDay?: { date: string; incoming: number };
}

export interface TicketMetrics {
  total: number;
  solvingRate: number;
  byCategory: NameCount[];
  bySub: NameCount[];
  permintaan: NameCount[];
  informasi: NameCount[];
  keluhan: NameCount[];
  spam: NameCount[];
  keluhanList: { date: string; sub: string; rs: string; description: string; answer: string }[];
  dokterKhusus: {
    total: number;
    byRs: NameCount[];
    byDoctor: { doctor: string; total: number; perRs: Record<string, number> }[];
  };
  sharecare: { total: number; bySub: NameCount[]; byRs: NameCount[] };
  igd: { total: number; byRs: NameCount[]; byCategory: NameCount[]; samples: { category: string; sub: string; description: string }[] };
  topRsInbound?: { rs: string; sub: string; count: number; pct: number };
}

export interface OutboundMetrics {
  leads: number;
  connected: number;
  success: number;
  bmhsInstruction: number;
  connectRate: number;
  successRate: number;
  invalid: number;
  failReasons: NameCount[];
  notConnectedReasons: NameCount[];
  daily: { date: string; leads: number; connected: number; success: number }[];
  appointmentsByRs: NameCount[];
  campaigns: NameCount[];
  menolakNotes: NameCount[];
  successPhones: number;
}

export interface OmniIncomingMetrics {
  total: number;
  spam: number;
  byCategory: NameCount[];
}

export interface EscalationMetrics {
  total: number;
  byRs: NameCount[];
  topics: { rs: string; total: number; items: NameCount[] }[];
}

export interface TransferMetrics {
  total: number;
  answered: number;
  abandoned: number;
  byRs: {
    rs: string;
    total: number;
    abandoned: number;
    rajal: number;
    ranap: number;
    rajalRanap: number;
    operator: number;
  }[];
}

export interface QualityBlock {
  label: string; // label periode QA
  score: number | null;
  categories: { name: string; pct: number }[];
  agents: { name: string; score: number }[];
}

export interface QualityMetrics {
  inbound?: QualityBlock;
  outbound?: QualityBlock;
  chat?: QualityBlock;
}

export interface PeriodMetrics {
  inbound?: InboundMetrics;
  tickets?: TicketMetrics;
  outbound?: OutboundMetrics;
  omniIncoming?: OmniIncomingMetrics;
  escalation?: EscalationMetrics;
  transfer?: TransferMetrics;
  quality?: QualityMetrics;
}

export interface Period {
  id: number;
  label: string; // "26 September – 25 Oktober 2026"
  month_label: string; // "Oct-26"
  start_date: string;
  end_date: string;
  is_seed: boolean;
  metrics: PeriodMetrics;
  datasets: Record<string, { rows: number; filename: string; uploaded_at: string }>;
}

// ---------- Insight (Highlight / Action per slide) ----------

export interface SlideInsight {
  highlight: string[];
  action: string[];
}

export type InsightMap = Record<string, SlideInsight>;
