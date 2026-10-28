import "server-only";
import postgres from "postgres";

// Koneksi PostgreSQL standar. Untuk Supabase pakai connection string pooler
// (port 6543); untuk PostgreSQL lokal cukup ganti DATABASE_URL.
declare global {
  var __bmhsSql: postgres.Sql | undefined;
}

function create() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL belum di-set");
  const local = /localhost|127\.0\.0\.1/.test(url);
  return postgres(url, {
    ssl: local || process.env.DATABASE_SSL === "false" ? false : "require",
    prepare: false, // wajib untuk transaction pooler
    max: 3,
    idle_timeout: 20,
    connection: { search_path: "bmhs,public" },
    types: { bigint: postgres.BigInt },
  });
}

export const sql: postgres.Sql = globalThis.__bmhsSql ?? (globalThis.__bmhsSql = create());
