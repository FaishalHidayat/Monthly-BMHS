-- Skema aplikasi Monthly Report BMHS.
-- SQL standar PostgreSQL (tanpa fitur khusus Supabase) supaya bisa dipindah
-- ke PostgreSQL lokal cukup dengan menjalankan file ini.

create schema if not exists bmhs;

create table if not exists bmhs.schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);

create table if not exists bmhs.users (
  id serial primary key,
  email text not null unique,
  name text not null,
  password_hash text not null,
  role text not null check (role in ('admin', 'user')),
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists bmhs.settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- Satu baris per periode laporan (26 s/d 25 bulan berikutnya).
create table if not exists bmhs.periods (
  id serial primary key,
  label text not null,
  month_label text not null,
  start_date date not null,
  end_date date not null,
  is_seed boolean not null default false,
  metrics jsonb not null default '{}'::jsonb,
  overrides jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (start_date, end_date)
);

-- Riwayat upload raw data per dataset.
create table if not exists bmhs.uploads (
  id serial primary key,
  period_id int not null references bmhs.periods(id) on delete cascade,
  dataset text not null,
  filename text,
  row_count int not null default 0,
  uploaded_by int references bmhs.users(id) on delete set null,
  uploaded_at timestamptz not null default now(),
  unique (period_id, dataset)
);

-- Raw data ternormalisasi, disimpan per potongan (chunk) agar upload besar aman.
create table if not exists bmhs.raw_rows (
  period_id int not null references bmhs.periods(id) on delete cascade,
  dataset text not null,
  chunk int not null,
  rows jsonb not null,
  primary key (period_id, dataset, chunk)
);

-- Teks Highlight / Action per slide (hasil AI, aturan otomatis, atau edit manual).
create table if not exists bmhs.insights (
  period_id int not null references bmhs.periods(id) on delete cascade,
  slide_key text not null,
  highlight jsonb not null default '[]'::jsonb,
  action jsonb not null default '[]'::jsonb,
  source text not null default 'rule' check (source in ('ai', 'rule', 'manual')),
  updated_at timestamptz not null default now(),
  primary key (period_id, slide_key)
);

create index if not exists periods_start_idx on bmhs.periods (start_date desc);

insert into bmhs.schema_migrations (version) values ('001_init') on conflict do nothing;
