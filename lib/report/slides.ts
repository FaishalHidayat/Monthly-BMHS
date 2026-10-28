// Daftar slide yang punya teks Highlight / Action (dipakai dashboard, AI, PPT).

export interface SlideDef {
  key: string;
  title: string;
  section: "Executive" | "Inbound" | "Outbound" | "Omni Chat" | "Appendix";
  hasAction: boolean;
  /** Petunjuk untuk AI tentang isi teks slide ini. */
  guide: string;
}

export const SLIDES: SlideDef[] = [
  { key: "exec_summary", title: "Executive Summary", section: "Executive", hasAction: false,
    guide: "Tepat 4 paragraf berurutan: (1) Key Performance Indicator (AHT, SOA, Abandon Rate, Solving Ticket), (2) Quality Performance (monitoring, coaching, quality score), (3) Summary Case (komposisi total tiket & kategori dominan, peluang), (4) Coverage Area (daftar cabang RS yang dilayani)." },
  { key: "inbound_kpi", title: "Key Performance Indicator Inbound", section: "Inbound", hasAction: false,
    guide: "1 paragraf ringkas kesimpulan pencapaian KPI inbound vs target (AHT 5 menit, SOA 1 menit, Abandon 5%, Solving 85%) dan tren 3 bulan." },
  { key: "inbound_performance", title: "Inbound Performance", section: "Inbound", hasAction: true,
    guide: "Highlight: perubahan volume incoming/answered/abandon vs periode lalu beserta penyebab dominan (RS/kategori), pola abandon. Action: langkah operasional (shift, monitoring real-time, follow-up abandon)." },
  { key: "call_performance", title: "Call Performance (Harian)", section: "Inbound", hasAction: true,
    guide: "Highlight: service level periode, tanggal volume tertinggi & penyebabnya. Action: pengaturan schedule/backup coverage." },
  { key: "dokter_khusus", title: "Pendaftaran Dokter Khusus", section: "Inbound", hasAction: false,
    guide: "Highlight: RS tujuan dominan dan 3 dokter dengan appointment terbanyak beserta jumlahnya, makna bagi layanan." },
  { key: "case_category", title: "Case Category", section: "Inbound", hasAction: false,
    guide: "Bullet: total tiket & komposisi kategori, kontributor permintaan terbesar, kategori informasi tertinggi, jumlah & ringkasan keluhan (sebut RS & isu tiap keluhan)." },
  { key: "sharecare", title: "Appointment Voucher SHARECARECC", section: "Inbound", hasAction: false,
    guide: "Bullet: total pendaftaran voucher dan rincian per RS." },
  { key: "quality_inbound", title: "Quality Performance Inbound", section: "Inbound", hasAction: true,
    guide: "Highlight: quality score inbound periode QA terbaru vs sebelumnya (selisih poin), area improvement. Action: coaching, kalibrasi, SP." },
  { key: "quality_inbound_category", title: "Score Quality Inbound per Parameter", section: "Inbound", hasAction: true,
    guide: "Highlight: 2-3 parameter terendah beserta nilai & gap perilakunya, parameter yang turun. Action: perbaikan per parameter." },
  { key: "quality_inbound_agent", title: "Score Quality Inbound per Agent", section: "Inbound", hasAction: true,
    guide: "Highlight: jumlah agent di bawah target 95% dan sebarannya, pola kelemahan. Action: coaching terarah, review recording, target individu." },
  { key: "outbound_performance", title: "Outbound Performance", section: "Outbound", hasAction: false,
    guide: "Highlight: connect rate & success rate, jumlah appointment per RS, 3 alasan gagal connected terbesar dengan rincian Menolak (lain-lain)." },
  { key: "outbound_kpi", title: "Key Performance Indicator Outbound", section: "Outbound", hasAction: false,
    guide: "1 paragraf: Connected Rate vs target 8%, perubahan leads, dan success rate vs periode lalu." },
  { key: "outbound_call", title: "Call Performance Outbound", section: "Outbound", hasAction: true,
    guide: "Highlight: fokus campaign periode (layanan & RS), jumlah appointment. Action: evaluasi script/objection handling, follow-up call back, validasi nomor invalid & instruksi BMHS." },
  { key: "outbound_daily", title: "Leads Harian Outbound", section: "Outbound", hasAction: false,
    guide: "Highlight: total leads diproses, connected & connected rate, appointment." },
  { key: "quality_outbound", title: "Quality Performance Outbound", section: "Outbound", hasAction: true,
    guide: "Highlight: skor kualitas outbound vs periode sebelumnya. Action: product knowledge, sales & probing, coaching." },
  { key: "quality_outbound_category", title: "Score Category Outbound", section: "Outbound", hasAction: false,
    guide: "Highlight: parameter terendah/yang naik-turun, fokus consultative selling." },
  { key: "omni_incoming", title: "Kategori Tiket Pesan Masuk (Chat)", section: "Omni Chat", hasAction: true,
    guide: "Highlight: total pesan masuk dan 3 kategori tertinggi. Action: sampling bahasa agent, monitoring respons." },
  { key: "omni_escalation", title: "Total Eskalasi Ticketing", section: "Omni Chat", hasAction: false,
    guide: "Highlight: total tiket eskalasi, RS terbanyak dan topik terbanyaknya, RS dengan eskalasi kecil/nol." },
  { key: "omni_topics", title: "Topik Eskalasi per RS", section: "Omni Chat", hasAction: false,
    guide: "Satu bullet per RS (urut terbanyak): total tiket, topik terbanyak (jumlah & %), topik berikutnya." },
  { key: "quality_chat", title: "Quality Performance Chat", section: "Omni Chat", hasAction: true,
    guide: "Highlight: quality score chat vs sebelumnya dan parameter pendorong. Action: monitoring SOP & template, coaching." },
  { key: "quality_chat_category", title: "Score Quality Category Chat", section: "Omni Chat", hasAction: true,
    guide: "Highlight: parameter tertinggi, terendah, yang turun. Action: template chat & coaching writing skill." },
  { key: "transfer_call", title: "Transfer Call ke Unit", section: "Appendix", hasAction: false,
    guide: "Highlight: total permintaan transfer, tersambung vs abandoned, RS & unit dengan abandoned terbanyak." },
  { key: "igd", title: "Pasien Tekan IGD", section: "Appendix", hasAction: false,
    guide: "Highlight: RS tujuan terbanyak case IGD, kategori terbanyak, contoh kebutuhan pasien." },
  { key: "interval", title: "Average Incoming Call / Interval", section: "Appendix", hasAction: true,
    guide: "Highlight: jam mulai naik, jam puncak & rata-ratanya, pola sore. Action: penempatan agent di jam puncak." },
  { key: "aht_daily", title: "AHT Daily", section: "Appendix", hasAction: true,
    guide: "Highlight: kestabilan AHT harian (rentang). Action: SOP & probing efektif." },
  { key: "abandon_interval", title: "Abandon / Interval", section: "Appendix", hasAction: true,
    guide: "Highlight: jam dengan abandon tertinggi dan kondisi umum. Action: pengaturan shift & monitoring real-time." },
  { key: "spam", title: "Spam", section: "Appendix", hasAction: true,
    guide: "Highlight: komposisi kategori spam. Action: reminder greeting 3x untuk call tanpa suara, briefing penanganan spam." },
  { key: "keluhan", title: "Keluhan Pelayanan Unit", section: "Appendix", hasAction: true,
    guide: "Highlight: total keluhan & sub-kategori, ringkasan tiap keluhan (RS + isu). Action: roleplay & refreshment, coaching, eskalasi & monitoring." },
];

export const SLIDE_KEYS = SLIDES.map((s) => s.key);
export const slideByKey = (k: string) => SLIDES.find((s) => s.key === k);
