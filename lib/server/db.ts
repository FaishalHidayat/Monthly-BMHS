import "server-only";
import postgres from "postgres";

// Koneksi PostgreSQL standar. Untuk Supabase pakai pooler mode session
// (port 5432) — mode transaction (6543) bisa macet saat beberapa query berjalan
// bersamaan. Untuk PostgreSQL lokal cukup ganti DATABASE_URL.
declare global {
  var __bmhsSql: postgres.Sql | undefined;
}

function create() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL belum di-set");
  const local = /localhost|127\.0\.0\.1/.test(url);
  return postgres(url, {
    ssl: local || process.env.DATABASE_SSL === "false" ? false : "require",
    prepare: false,
    max: 2,
    idle_timeout: 15,
    max_lifetime: 60 * 5,
    connect_timeout: 10,
    connection: { search_path: "bmhs,public" },
    types: { bigint: postgres.BigInt },
  });
}

export const sql: postgres.Sql = globalThis.__bmhsSql ?? (globalThis.__bmhsSql = create());
