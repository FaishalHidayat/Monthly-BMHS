import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { getAiConfig } from "./settings";
import { SLIDES } from "../report/slides";
import { ruleInsights } from "../report/rule-insights";
import type { InsightMap, Period, PeriodMetrics } from "../types";

/** Ringkas metrics agar prompt tidak terlalu besar (daftar dipotong ke top-N). */
function compact(m: PeriodMetrics) {
  const top = <T,>(xs: T[] | undefined, n = 8) => (xs ?? []).slice(0, n);
  return {
    inbound: m.inbound && {
      ...m.inbound,
      daily: m.inbound.daily.map((d) => [d.date.slice(5), d.incoming, d.abandon, d.ahtSec]),
      interval: m.inbound.interval.map((x) => [x.hour, x.avgIncoming, x.avgAbandon]),
    },
    tickets: m.tickets && {
      total: m.tickets.total,
      solvingRate: m.tickets.solvingRate,
      byCategory: m.tickets.byCategory,
      permintaan: top(m.tickets.permintaan, 10),
      informasi: top(m.tickets.informasi),
      keluhan: m.tickets.keluhan,
      spam: m.tickets.spam,
      keluhanList: m.tickets.keluhanList.map((k) => ({ sub: k.sub, rs: k.rs, description: k.description.slice(0, 400) })),
      dokterKhusus: { total: m.tickets.dokterKhusus.total, byRs: m.tickets.dokterKhusus.byRs, top: top(m.tickets.dokterKhusus.byDoctor, 6) },
      sharecare: m.tickets.sharecare,
      igd: { ...m.tickets.igd, samples: m.tickets.igd.samples.slice(0, 15) },
    },
    outbound: m.outbound && { ...m.outbound, notConnectedReasons: top(m.outbound.notConnectedReasons) },
    omniIncoming: m.omniIncoming,
    escalation: m.escalation && { ...m.escalation, topics: m.escalation.topics.map((t) => ({ ...t, items: top(t.items, 5) })) },
    transfer: m.transfer,
    quality: m.quality,
  };
}

const summary = (p: Period) => ({
  periode: p.label,
  inbound: p.metrics.inbound && {
    incoming: p.metrics.inbound.incoming,
    answered: p.metrics.inbound.answered,
    abandon: p.metrics.inbound.abandon,
    ahtSec: p.metrics.inbound.ahtSec,
    soaSec: p.metrics.inbound.soaSec,
    sl: p.metrics.inbound.sl,
  },
  outbound: p.metrics.outbound && {
    leads: p.metrics.outbound.leads,
    connected: p.metrics.outbound.connected,
    success: p.metrics.outbound.success,
    connectRate: p.metrics.outbound.connectRate,
    successRate: p.metrics.outbound.successRate,
  },
  quality: p.metrics.quality && {
    inbound: p.metrics.quality.inbound && { label: p.metrics.quality.inbound.label, score: p.metrics.quality.inbound.score, categories: p.metrics.quality.inbound.categories },
    outbound: p.metrics.quality.outbound && { label: p.metrics.quality.outbound.label, score: p.metrics.quality.outbound.score, categories: p.metrics.quality.outbound.categories },
    chat: p.metrics.quality.chat && { label: p.metrics.quality.chat.label, score: p.metrics.quality.chat.score, categories: p.metrics.quality.chat.categories },
  },
});

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: SLIDES.map((s) => s.key),
  properties: Object.fromEntries(
    SLIDES.map((s) => [
      s.key,
      {
        type: "object",
        additionalProperties: false,
        required: ["highlight", "action"],
        properties: {
          highlight: { type: "array", items: { type: "string" } },
          action: { type: "array", items: { type: "string" } },
        },
      },
    ]),
  ),
};

const SYSTEM = `Anda adalah analis senior Contact Center untuk RS Bunda Group (BMHS) yang menyusun laporan bulanan untuk manajemen rumah sakit.
Tulis teks Highlight dan Action setiap slide dalam Bahasa Indonesia yang formal, ringkas, dan berbasis data.

Aturan:
- Gunakan HANYA angka yang ada di data. Jangan mengarang angka, nama dokter, RS, atau kejadian.
- Format angka gaya Indonesia: ribuan pakai titik (4.911), desimal pakai koma (98,82%), durasi hh:mm:ss.
- Bandingkan dengan periode sebelumnya bila datanya ada (sebut naik/turun dan selisihnya).
- Highlight = temuan (2–4 butir, tiap butir 1–2 kalimat). Action = langkah perbaikan konkret (1–3 butir). Slide tanpa Action: kembalikan array action kosong.
- Jangan memakai simbol bullet atau penomoran di awal butir; tiap butir adalah satu string.
- Nilai rate/persentase di data berbentuk pecahan 0–1 (0.9882 = 98,82%). ahtSec/soaSec dalam detik.
- Quality memiliki label periode QA sendiri (biasanya 1 bulan sebelum periode laporan); sebut label tersebut.`;

export async function generateAiInsights(history: Period[]): Promise<{ insights: InsightMap; model: string }> {
  const { apiKey, model } = await getAiConfig();
  if (!apiKey) throw new Error("API key AI belum diisi. Admin dapat mengisinya di menu Pengaturan.");
  const client = new Anthropic({ apiKey, timeout: 280_000, maxRetries: 1 });
  const cur = history[history.length - 1];
  const drafts = ruleInsights(history);

  const prompt = `Periode laporan: ${cur.label}

## Data periode ini (JSON)
${JSON.stringify(compact(cur.metrics))}

## Ringkasan periode sebelumnya (terlama -> terbaru, JSON)
${JSON.stringify(history.slice(0, -1).map(summary))}

## Daftar slide & isi yang diharapkan
${SLIDES.map((s) => `- ${s.key} (${s.title}): ${s.guide}`).join("\n")}

## Draf otomatis (boleh diperbaiki, diperkaya, atau diganti)
${JSON.stringify(drafts)}

Kembalikan JSON berisi Highlight dan Action untuk setiap slide di atas.`;

  const stream = client.messages.stream({
    model,
    max_tokens: 32000,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === "refusal") throw new Error("Model menolak permintaan ini; teks otomatis tetap dipakai.");
  if (msg.stop_reason === "max_tokens") throw new Error("Respons AI terpotong (max_tokens); coba lagi.");
  const text = msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  const parsed = JSON.parse(text) as InsightMap;
  const clean = (xs: string[]) => xs.map((x) => x.replace(/^\s*([-•*]|\d+[.)])\s*/, "").trim()).filter(Boolean);
  for (const k of Object.keys(parsed)) {
    parsed[k] = { highlight: clean(parsed[k].highlight ?? []), action: clean(parsed[k].action ?? []) };
  }
  return { insights: parsed, model };
}

/** Uji API key dengan permintaan kecil. */
export async function testApiKey(apiKey: string, model: string) {
  const client = new Anthropic({ apiKey, timeout: 60_000, maxRetries: 0 });
  const msg = await client.messages.create({
    model,
    max_tokens: 1024,
    output_config: { effort: "low" },
    messages: [{ role: "user", content: "Balas dengan satu kata: OK" }],
  });
  return msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").trim();
}
