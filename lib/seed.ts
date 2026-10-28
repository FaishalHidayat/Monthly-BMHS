// Data historis awal (diambil dari PPT Report CC BMHS 26 Sep – 25 Okt 2026)
// supaya tren 3 bulan & perbandingan quality langsung tampil.
import type { PeriodMetrics } from "./types";

const inbound = (incoming: number, answered: number, ahtSec: number, sl: number, abandonRate: number) => ({
  incoming,
  answered,
  abandon: incoming - answered,
  ahtSec,
  soaSec: 3,
  sl,
  abandonRate,
  daily: [],
  interval: [],
});

const outbound = (leads: number, connected: number, success: number, connectRate: number, successRate: number) => ({
  leads,
  connected,
  success,
  connectRate,
  successRate,
  bmhsInstruction: 0,
  invalid: 0,
  failReasons: [],
  notConnectedReasons: [],
  daily: [],
  appointmentsByRs: [],
  campaigns: [],
  menolakNotes: [],
  successPhones: success,
});

const q = (label: string, score: number, cats: [string, number][] = []) => ({
  label,
  score,
  categories: cats.map(([name, pct]) => ({ name, pct })),
  agents: [],
});

export const SEED_PERIODS: { start: string; end: string; metrics: PeriodMetrics }[] = [
  {
    start: "2026-07-26",
    end: "2026-08-25",
    metrics: {
      inbound: inbound(5018, 4940, 220, 0.9845, 0.0155),
      outbound: outbound(6240, 921, 28, 0.1476, 0.0304),
      quality: {
        inbound: q("26 Juni'26 - 25 Juli'26", 0.9534),
        outbound: q("26 Juni'26 - 25 Juli'26", 0.88),
        chat: q("26 Juni'26 - 25 Juli'26", 0.8939),
      },
    },
  },
  {
    start: "2026-08-26",
    end: "2026-09-25",
    metrics: {
      inbound: inbound(5222, 5130, 208, 0.9824, 0.0176),
      outbound: outbound(2124, 235, 34, 0.1106, 0.1447),
      quality: {
        inbound: q("26 Juli'26 - 25 Agustus'26", 0.9195, [
          ["Greeting Opening", 0.968],
          ["Verification", 0.9605],
          ["Flow Handling", 0.8581],
          ["Product Knowledge", 0.9044],
          ["Communication Skills", 0.8384],
          ["Upselling Product", 0.9605],
          ["Sales Closing", 0.9128],
          ["Closing & Documentation", 0.9535],
        ]),
        outbound: q("26 Juli'26 - 25 Agustus'26", 0.9107, [
          ["Opening & Introduction", 0.95],
          ["Need Identification", 0.875],
          ["Product Knowledge & Compliance", 0.965],
          ["Sales Technique", 0.79],
          ["Communication Skills", 0.92],
          ["Sales Closing", 0.9],
          ["Closing & Commitment", 0.975],
        ]),
        chat: q("26 Juli'26 - 25 Agustus'26", 0.9064, [
          ["Opening & Greeting", 0.9036],
          ["Verification", 0.9281],
          ["Flow Handling", 0.949],
          ["Product Knowledge", 0.9945],
          ["Writing Skill & Communication", 0.851],
          ["Upselling Product", 0.9797],
          ["Sales Closing", 1],
          ["Closing & Documentation", 0.9779],
        ]),
      },
    },
  },
];
