// Teks Highlight / Action otomatis berbasis aturan (tanpa AI). Dipakai sebagai
// draf awal dan cadangan bila API key AI belum diisi.
import { COVERAGE_TEXT, RS_NAME } from "../rs";
import { dayMonth, fmtDur, fmtNum, fmtPct, hourLabel } from "../format";
import type { InsightMap, Period, QualityBlock } from "../types";

const pts = (a: number, b: number) => fmtNum(Math.abs((a - b) * 100), 2);

function qualityText(name: string, q: QualityBlock | undefined, prev: QualityBlock | undefined) {
  if (!q || q.score == null) return [`Data quality ${name} belum tersedia untuk periode ini.`];
  const out = [`Quality Score ${name} periode ${q.label} tercatat sebesar ${fmtPct(q.score)}.`];
  if (prev?.score != null) {
    const diff = q.score - prev.score;
    out[0] += diff >= 0 ? ` Skor naik ${pts(q.score, prev.score)} poin dibanding periode sebelumnya (${fmtPct(prev.score)}).` : ` Skor turun ${pts(q.score, prev.score)} poin dibanding periode sebelumnya (${fmtPct(prev.score)}).`;
  }
  const cats = [...q.categories].sort((a, b) => a.pct - b.pct);
  if (cats.length) {
    const low = cats.slice(0, 2).map((c) => `${c.name} (${fmtPct(c.pct)})`).join(" dan ");
    out.push(`Parameter dengan capaian terendah adalah ${low}, sehingga menjadi fokus utama area improvement.`);
  }
  return out;
}

function categoryText(q: QualityBlock | undefined, prev: QualityBlock | undefined) {
  if (!q?.categories.length) return ["Data parameter quality belum tersedia."];
  const sorted = [...q.categories].sort((a, b) => a.pct - b.pct);
  const out = sorted.slice(0, 3).map((c) => {
    const p = prev?.categories.find((x) => x.name === c.name);
    const delta = p ? `, ${c.pct >= p.pct ? "naik" : "turun"} ${pts(c.pct, p.pct)} poin dari periode sebelumnya` : "";
    return `${c.name} – ${fmtPct(c.pct)}${delta}.`;
  });
  const top = sorted[sorted.length - 1];
  out.push(`Parameter tertinggi adalah ${top.name} (${fmtPct(top.pct)}).`);
  return out;
}

export function ruleInsights(history: Period[]): InsightMap {
  const cur = history[history.length - 1];
  const prev = history.length > 1 ? history[history.length - 2] : undefined;
  const m = cur?.metrics ?? {};
  const pm = prev?.metrics ?? {};
  const ib = m.inbound;
  const t = m.tickets;
  const o = m.outbound;
  const q = m.quality ?? {};
  const pq = pm.quality ?? {};
  const map: InsightMap = {};

  // Executive summary — 4 paragraf
  map.exec_summary = {
    highlight: [
      ib
        ? `Untuk periode ini, tim menjaga Average Handling Time (AHT) pada ${fmtDur(ib.ahtSec)} dan Speed of Answer (SOA) ${ib.soaSec} detik, sementara Abandon Rate mencapai ${fmtPct(ib.abandonRate)}. Solving Ticket tercatat ${fmtPct(t?.solvingRate ?? 1, 0)}.`
        : "Data KPI inbound belum tersedia.",
      `Proses monitoring kualitas dijalankan secara terstruktur melalui call evaluation dan coaching rutin. Quality Score Inbound tercatat ${fmtPct(q.inbound?.score)}, Outbound ${fmtPct(q.outbound?.score)}, dan Chat ${fmtPct(q.chat?.score)}.`,
      t
        ? `Komposisi ${fmtNum(t.total)} tiket didominasi oleh kategori ${t.byCategory[0]?.name.toLowerCase()} (${fmtNum(t.byCategory[0]?.count)} tiket), dengan sub-kategori terbanyak "${t.bySub[0]?.name}". Kondisi ini menunjukkan peran Contact Center yang kuat dalam mendukung proses administratif pasien sekaligus peluang mengoptimalkan kapasitas agent untuk layanan yang lebih proaktif.`
        : "Data tiket belum tersedia.",
      `Call center melayani 9 cabang RS Bunda Group, yaitu ${COVERAGE_TEXT}.`,
    ],
    action: [],
  };

  if (ib) {
    const pib = pm.inbound;
    map.inbound_kpi = {
      highlight: [
        `Seluruh indikator utama ${ib.ahtSec <= 300 && ib.soaSec <= 60 && ib.abandonRate <= 0.05 ? "memenuhi" : "belum seluruhnya memenuhi"} target: AHT ${fmtDur(ib.ahtSec)} (target 00:05:00), SOA ${fmtDur(ib.soaSec)} (target 00:01:00), Abandon Rate ${fmtPct(ib.abandonRate)} (target 5%), dan Solving Ticket ${fmtPct(t?.solvingRate ?? 1, 0)} (target 85%).`,
      ],
      action: [],
    };
    const hourAb = [...ib.interval].sort((a, b) => b.avgAbandon - a.avgAbandon)[0];
    map.inbound_performance = {
      highlight: [
        pib
          ? `Incoming call ${ib.incoming >= pib.incoming ? "naik" : "turun"} dari ${fmtNum(pib.incoming)} menjadi ${fmtNum(ib.incoming)} calls${t?.topRsInbound ? `, didominasi "${t.topRsInbound.sub}" sebanyak ${fmtNum(t.topRsInbound.count)} tiket (${fmtPct(t.topRsInbound.pct, 1)})` : ""}.`
          : `Total incoming call periode ini ${fmtNum(ib.incoming)} calls dengan ${fmtNum(ib.answered)} terjawab.`,
        `Abandon call tercatat ${fmtNum(ib.abandon)} (${fmtPct(ib.abandonRate)})${pib ? `, ${ib.abandon <= pib.abandon ? "berkurang" : "bertambah"} ${fmtNum(Math.abs(ib.abandon - pib.abandon))} dibanding periode sebelumnya` : ""}; rata-rata abandon tertinggi terjadi pada interval ${hourLabel(hourAb.hour)}.`,
      ],
      action: [
        "Mempertahankan pengaturan shift sejak awal operasional serta memonitor traffic call secara real-time untuk menjaga coverage agent.",
        "Melakukan follow-up abandoned call sesuai prioritas untuk memastikan kebutuhan pasien tetap terlayani.",
      ],
    };
    map.call_performance = {
      highlight: [
        `Tingkat keberhasilan penanganan (Service Level) sebesar ${fmtPct(ib.sl)}.`,
        ib.peakDay ? `Volume panggilan masuk tertinggi tercatat pada tanggal ${dayMonth(ib.peakDay.date)} dengan total ${fmtNum(ib.peakDay.incoming)} calls.` : "",
      ].filter(Boolean),
      action: ["Mengoptimalkan schedule agent dan backup coverage pada hari dengan potensi traffic tinggi untuk menjaga Service Level tetap optimal."],
    };
    const peak = [...ib.interval].sort((a, b) => b.avgIncoming - a.avgIncoming)[0];
    const rising = ib.interval.find((x) => x.hour >= 4 && x.avgIncoming >= 5);
    map.interval = {
      highlight: [
        `Rata-rata incoming call mulai meningkat sejak pukul ${hourLabel(rising?.hour ?? 6)} dan mencapai puncak pada pukul ${hourLabel(peak.hour)} dengan rata-rata ${fmtNum(peak.avgIncoming, 0)} panggilan per interval.`,
        "Volume panggilan relatif stabil pada siang hingga sore hari, kemudian menurun bertahap hingga akhir operasional.",
      ],
      action: [
        `Mengoptimalkan ketersediaan agent pada jam volume tertinggi (sekitar ${hourLabel(peak.hour)}) dengan meminimalkan aktivitas non-call.`,
        "Evaluasi pola incoming call secara berkala untuk menentukan kebutuhan coverage dan penempatan agent.",
      ],
    };
    const ahts = ib.daily.map((d) => d.ahtSec).filter((x) => x > 0);
    map.aht_daily = {
      highlight: [
        `AHT harian berada pada rentang ${fmtDur(Math.min(...ahts))} – ${fmtDur(Math.max(...ahts))} dengan rata-rata ${fmtDur(ib.ahtSec)}, relatif stabil sepanjang periode.`,
        "Stabilnya AHT mencerminkan agent mampu menangani kebutuhan pelanggan secara efisien.",
      ],
      action: ["Mengoptimalkan penerapan SOP serta probing yang efektif untuk menjaga keseimbangan kecepatan penanganan dan kualitas pelayanan."],
    };
    map.abandon_interval = {
      highlight: [
        `Rata-rata abandon tertinggi terjadi pada pukul ${hourLabel(hourAb.hour)} (${fmtNum(hourAb.avgAbandon, 2)} call per interval); secara umum abandon berada pada level rendah (${fmtPct(ib.abandonRate)}).`,
      ],
      action: ["Mempertahankan pengaturan jadwal shift dan monitoring traffic secara real-time agar abandon call tetap rendah."],
    };
  }

  if (t) {
    const dk = t.dokterKhusus;
    const top3 = dk.byDoctor.slice(0, 3).map((d) => `${d.doctor} (${d.total} appointment)`).join(", ");
    map.dokter_khusus = {
      highlight: [
        `Terdapat ${fmtNum(dk.total)} permintaan pendaftaran dokter khusus, didominasi tujuan ${dk.byRs[0]?.name ?? "-"} (${fmtNum(dk.byRs[0]?.count)}). Volume appointment tertinggi pada ${top3}.`,
      ],
      action: [],
    };
    const perm = t.permintaan[0];
    const info = t.informasi[0];
    map.case_category = {
      highlight: [
        `Total tiket tercatat sebanyak ${fmtNum(t.total)} tiket.`,
        perm ? `Kontributor terbesar kategori permintaan adalah "${perm.name}" (${fmtNum(perm.count)} tiket).` : "",
        info ? `Kategori informasi tertinggi adalah "${info.name}" (${fmtNum(info.count)} tiket); agent memanfaatkan interaksi untuk menawarkan bantuan penjadwalan.` : "",
        `Kategori keluhan sebanyak ${fmtNum(t.keluhan.reduce((a, b) => a + b.count, 0))} tiket: ${t.keluhanList.map((k) => `${k.sub.replace("Keluhan - ", "")} di ${k.rs}`).join("; ")}.`,
      ].filter(Boolean),
      action: [],
    };
    map.sharecare = {
      highlight: [
        `Pendaftaran dengan Voucher SHARECARECC tercatat ${fmtNum(t.sharecare.total)} pendaftaran.`,
        ...t.sharecare.byRs.map((r) => `${r.name}: ${fmtNum(r.count)} pendaftaran.`),
      ],
      action: [],
    };
    const igdTop = [...t.igd.byRs].sort((a, b) => b.count - a.count)[0];
    map.igd = {
      highlight: [
        `Total ${fmtNum(t.igd.total)} call IGD diteruskan ke Call Center; RS tujuan terbanyak ${RS_NAME[igdTop?.name] ?? igdTop?.name} sebanyak ${fmtNum(igdTop?.count)} calls.`,
        `Kategori IGD terbanyak adalah ${t.igd.byCategory[0]?.name ?? "-"} (${fmtNum(t.igd.byCategory[0]?.count)} tiket), umumnya terkait ketersediaan kamar, pendaftaran dokter hari-H, dan informasi layanan IGD.`,
      ],
      action: [],
    };
    map.spam = {
      highlight: [
        `Spam call didominasi oleh "${t.spam[0]?.name ?? "-"}" (${fmtNum(t.spam[0]?.count)} calls)${t.spam[1] ? ` dan "${t.spam[1].name}" (${fmtNum(t.spam[1].count)} calls)` : ""}.`,
      ],
      action: ["Reminder agent melakukan greeting 3x jika tidak ada suara sebelum panggilan diputus.", "Briefing rutin untuk mengingatkan cara penanganan spam agar tidak mengganggu SLA."],
    };
    map.keluhan = {
      highlight: [
        `Total keluhan sebanyak ${fmtNum(t.keluhanList.length)} tiket (${t.keluhan.map((k) => `${k.name.replace("Keluhan - ", "")} ${k.count}`).join(", ")}).`,
        ...t.keluhanList.map((k) => `${k.sub} di ${k.rs}: ${k.description.replace(/\s+/g, " ").slice(0, 140)}…`),
      ],
      action: [
        "Roleplay dan refreshment penanganan pasien komplain, termasuk empati dan pengendalian emosi.",
        "Melakukan eskalasi dan monitoring keluhan hingga mendapatkan tindak lanjut dari unit terkait.",
      ],
    };
  }

  if (o) {
    const po = pm.outbound;
    const fr = o.failReasons;
    const totalMenolak = o.menolakNotes.reduce((a, b) => a + b.count, 0) || 1;
    map.outbound_performance = {
      highlight: [
        `Periode ini mencatatkan connected rate ${fmtPct(o.connectRate)} dan success rate ${fmtPct(o.successRate)}.`,
        `Sebanyak ${fmtNum(o.success)} appointment berhasil dijadwalkan: ${o.appointmentsByRs.map((r) => `${r.count} ${r.name}`).join(", ")}.`,
        ...fr.slice(0, 3).map((r, i) => `${["Penyumbang terbesar", "Penyumbang kedua", "Penyumbang ketiga"][i]} dari angka connected adalah ${r.name} sebanyak ${fmtNum(r.count)} kasus.`),
        ...o.menolakNotes.slice(0, 3).map((n) => `${fmtPct(n.count / totalMenolak, 0)} (${n.count} kasus) — ${n.name}.`),
      ],
      action: [],
    };
    map.outbound_kpi = {
      highlight: [
        `Connected Rate mencapai ${fmtPct(o.connectRate)} (${o.connectRate >= 0.08 ? "di atas" : "di bawah"} target 8%) dengan total leads ${fmtNum(o.leads)}${po ? ` (periode lalu ${fmtNum(po.leads)})` : ""}. Success Rate ${po ? (o.successRate >= po.successRate ? "meningkat" : "menurun") + " menjadi " : ""}${fmtPct(o.successRate)}.`,
      ],
      action: [],
    };
    map.outbound_call = {
      highlight: [
        `Aktivitas outbound difokuskan pada campaign ${o.campaigns.slice(0, 4).map((c) => c.name).join(", ")}.`,
        `Berhasil menghasilkan ${fmtNum(o.success)} appointment dari ${fmtNum(o.connected)} leads yang terhubung.`,
      ],
      action: [
        `Evaluasi opening script dan bridging untuk menekan reject up-front, serta penguatan objection handling.`,
        `Penjadwalan ulang follow-up untuk leads call back request sesuai waktu yang diminta, serta re-attempt di jam berbeda untuk nomor sibuk/tidak diangkat.`,
        `Koordinasi dengan BMHS terkait validasi ${fmtNum(o.invalid)} nomor invalid/tidak aktif dan ${fmtNum(o.bmhsInstruction)} leads dengan instruksi tidak boleh dihubungi.`,
      ],
    };
    map.outbound_daily = {
      highlight: [
        `${fmtNum(o.leads)} leads berhasil diproses dengan ${fmtNum(o.connected)} leads terhubung (Connected Rate ${fmtPct(o.connectRate)}).`,
        `${fmtNum(o.success)} appointment berhasil diperoleh dari aktivitas outbound periode ini.`,
      ],
      action: [],
    };
  }

  map.quality_inbound = {
    highlight: qualityText("Inbound", q.inbound, pq.inbound),
    action: ["Coaching & feedback bagi agent yang belum mencapai parameter, dilanjutkan monitoring ulang.", "Kalibrasi dengan Team Leader tiap 2 minggu untuk menyamakan standar penilaian.", "Temuan berulang diproses dengan SP sesuai ketentuan."],
  };
  map.quality_inbound_category = {
    highlight: categoryText(q.inbound, pq.inbound),
    action: ["Coaching alur handling yang sistematis (salam, probing, solusi, reconfirm, penutup), lalu monitoring ulang.", "Briefing singkat setiap ada update info dokter, jadwal, atau layanan."],
  };
  const agents = q.inbound?.agents ?? [];
  const below = agents.filter((a) => a.score < 0.95);
  map.quality_inbound_agent = {
    highlight: [
      `Terdapat ${below.length} dari ${agents.length} agent masih di bawah target 95%${below.length ? ` (${below.map((a) => `${a.name} ${fmtPct(a.score, 0)}`).join(", ")})` : ""}.`,
    ],
    action: ["Coaching dan feedback terarah kepada agent yang belum mencapai target 95%.", "Review recording berkala disertai sharing best practice antar agent.", "Menetapkan target perbaikan individu dan evaluasi progres berkelanjutan."],
  };
  map.quality_outbound = {
    highlight: qualityText("Outbound", q.outbound, pq.outbound),
    action: ["Penguatan product knowledge melalui refreshment dan morning briefing.", "Development sales & probing skills (consultative selling, objection handling).", "Coaching dan monitoring berkelanjutan berbasis hasil QA."],
  };
  map.quality_outbound_category = { highlight: categoryText(q.outbound, pq.outbound), action: [] };
  map.quality_chat = {
    highlight: qualityText("Chat", q.chat, pq.chat),
    action: ["Monitoring berkala kepatuhan agent pada SOP, akurasi informasi, dan penggunaan template.", "Coaching berdasarkan hasil evaluasi pada parameter yang turun atau di bawah target."],
  };
  map.quality_chat_category = {
    highlight: categoryText(q.chat, pq.chat),
    action: ["Sosialisasi dan monitoring penggunaan template chat.", "Feedback dan coaching individual untuk agent dengan skor Writing Skill & Communication rendah."],
  };

  const oi = m.omniIncoming;
  if (oi) {
    map.omni_incoming = {
      highlight: [
        `Total pesan tercatat ${fmtNum(oi.total)} pelanggan/pasien yang menghubungi melalui Omni Channel (WhatsApp bot).`,
        `3 kategori tertinggi adalah ${oi.byCategory.slice(0, 3).map((c) => `${c.name} (${fmtNum(c.count)})`).join(", ")}.`,
      ],
      action: ["Review hasil sampling kepada agent untuk menyesuaikan tata bahasa penanganan pesan masuk.", "Monitoring pesan masuk untuk memastikan seluruh pesan mendapatkan respons."],
    };
  }
  const e = m.escalation;
  if (e) {
    const topRs = e.topics[0];
    map.omni_escalation = {
      highlight: [
        `Total ${fmtNum(e.total)} tiket telah dieskalasi ke unit rumah sakit selama periode pelaporan.`,
        topRs ? `Topik terbanyak pada ${topRs.rs} yaitu ${topRs.items[0]?.name} sebanyak ${fmtNum(topRs.items[0]?.count)} tiket dari total ${fmtNum(topRs.total)} tiket.` : "",
        ...e.byRs.filter((r) => r.count === 0).map((r) => `Tidak terdapat eskalasi ke ${r.name} pada periode ini.`),
      ].filter(Boolean),
      action: [],
    };
    map.omni_topics = {
      highlight: e.topics
        .filter((x) => x.total > 0)
        .map(
          (x) =>
            `${x.rs}: ${fmtNum(x.total)} tiket, terbanyak ${x.items[0]?.name} (${x.items[0]?.count} tiket, ${fmtPct(x.items[0]?.count / x.total, 1)})${x.items[1] ? `, diikuti ${x.items[1].name} (${x.items[1].count})` : ""}.`,
        ),
      action: [],
    };
  }
  const tf = m.transfer;
  if (tf) {
    const top = tf.byRs[0];
    const svc = top ? (["rajal", "operator", "ranap", "rajalRanap"] as ("rajal" | "operator" | "ranap" | "rajalRanap")[]).sort((a, b) => top[b] - top[a])[0] : null;
    const svcName = { rajal: "Rajal", operator: "Operator", ranap: "Ranap", rajalRanap: "Rajal & Ranap" };
    map.transfer_call = {
      highlight: [
        `Data call permintaan transfer sebanyak ${fmtNum(tf.total)} call, ${fmtNum(tf.answered)} tersambung (${fmtPct(tf.answered / tf.total, 0)}).`,
        `Transfer call unit tidak tersambung (abandoned) sebanyak ${fmtNum(tf.abandoned)} call.`,
        top ? `Abandoned terbanyak di ${top.rs} (${fmtNum(top.abandoned)} call), paling banyak permintaan disambungkan ke unit ${svc ? svcName[svc] : "-"}.` : "",
      ].filter(Boolean),
      action: [],
    };
  }
  return map;
}
