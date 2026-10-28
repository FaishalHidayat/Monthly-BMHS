# Monthly Report BMHS — Contact Center Dashboard

Web app laporan bulanan Contact Center RS Bunda Group (BMHS): dashboard interaktif untuk seluruh grafik di template
**Report CC BMHS**, upload 9 raw data Excel, narasi Highlight/Action otomatis (AI Claude), dan **Download PPT**
dengan struktur template.

## Fitur

- **Dashboard** (tema hijau, mode terang/gelap): Ringkasan, Inbound, Outbound, Omni Chat, Quality, Appendix.
- **Upload raw data** (admin): seret semua file sekaligus; jenis file dideteksi otomatis dari header kolom.
  File diproses di browser lalu dikirim per potongan 1.000 baris, jadi file > 2 MB aman.
- **Narasi AI**: tombol *Generate dengan AI* menulis ulang Highlight & Action semua slide dari data terbaru.
  Tanpa API key, teks otomatis berbasis aturan tetap tersedia. Admin bisa mengedit tiap slide.
- **Download PPT**: ±40 slide mengikuti template (grafik native PowerPoint yang bisa diedit).
- **Pengguna**: role `admin` (akses penuh) dan `user` (lihat grafik & download PPT).

## Raw data (9 file)

| Dataset | File contoh | Dipakai di slide |
|---|---|---|
| Call Detail | `calldetail.xls` (sheet CALL_DETAIL) | KPI inbound, call performance, interval, AHT daily, abandon |
| Tiket Inbound | `inbound.xls` | Dokter khusus, case category, SHARECARECC (Notes `SHARECAREC`), IGD (Notes `FIGD`), keluhan (Description), spam |
| Outbound | `outbound.xlsx` | Outbound performance, KPI, leads harian |
| Omni Chat (Eskalasi) | `Omni_chat.xlsx` | Total & topik eskalasi per RS |
| Omni Status Incoming | `Tiket_Omni_status_incoming.xlsx` | Kategori pesan masuk (tag `-` = Pendaftaran ChatBot, spam dikecualikan) |
| Transfer Call | `TransferCall.xlsx` | Call #1 Agent TF Unit Abandoned |
| Score Inbound / Outbound / Chat | `SCORE_*.xlsx` | Quality performance, parameter, agent |

## Arsitektur

- Next.js 16 (App Router) + TypeScript + Tailwind v4 + Recharts; PPT dibuat di browser dengan `pptxgenjs`.
- Database: **PostgreSQL standar** (skema `bmhs`) melalui driver `postgres` — tidak memakai API khusus Supabase.
- Login: email + password (bcrypt), sesi JWT di cookie httpOnly. API key AI disimpan terenkripsi AES-256-GCM.

## Environment variable

Lihat `.env.example`: `DATABASE_URL`, `AUTH_SECRET` (wajib), `DATABASE_SSL`, `ANTHROPIC_API_KEY` (opsional).

## Menjalankan lokal

```bash
npm install
cp .env.example .env.local   # isi DATABASE_URL & AUTH_SECRET
npm run db:migrate
npm run db:create-admin -- admin@domain.com "Nama Admin" "PasswordKuat123"
npm run dev
```

## Pindah dari Supabase ke PostgreSQL lokal

1. Buat database: `createdb bmhs`.
2. Pindahkan data: `pg_dump --schema=bmhs --no-owner "<url supabase>" | psql postgres://user:pass@localhost:5432/bmhs`
   (atau jalankan `npm run db:migrate` untuk database kosong).
3. Ganti `DATABASE_URL=postgres://user:pass@localhost:5432/bmhs` (SSL otomatis nonaktif untuk localhost).
4. Selesai — tidak ada perubahan kode.

## Deploy

Vercel (framework Next.js, region fungsi `arn1` dekat database Supabase eu-north-1). Set `DATABASE_URL` dan
`AUTH_SECRET` di Project Settings → Environment Variables.
