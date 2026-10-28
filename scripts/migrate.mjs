// Jalankan semua file db/migrations/*.sql ke DATABASE_URL (untuk PostgreSQL lokal/baru).
import { readdirSync, readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL terlebih dahulu");
const sql = postgres(url, { ssl: /localhost|127\.0\.0\.1/.test(url) || process.env.DATABASE_SSL === "false" ? false : "require", max: 1 });
for (const f of readdirSync("db/migrations").filter((f) => f.endsWith(".sql")).sort()) {
  console.log("menjalankan", f);
  await sql.unsafe(readFileSync(`db/migrations/${f}`, "utf8"));
}
await sql.end();
console.log("selesai");
