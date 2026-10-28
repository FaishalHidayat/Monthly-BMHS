// Buat / reset akun admin: node scripts/create-admin.mjs email@domain.com "Nama" "password"
import bcrypt from "bcryptjs";
import postgres from "postgres";

const [email, name, password] = process.argv.slice(2);
if (!email || !name || !password) throw new Error('Pemakaian: node scripts/create-admin.mjs email "Nama" password');
const url = process.env.DATABASE_URL;
const sql = postgres(url, { ssl: /localhost|127\.0\.0\.1/.test(url) || process.env.DATABASE_SSL === "false" ? false : "require", max: 1 });
await sql`insert into bmhs.users (email, name, password_hash, role)
  values (${email.toLowerCase()}, ${name}, ${await bcrypt.hash(password, 10)}, 'admin')
  on conflict (email) do update set password_hash = excluded.password_hash, role = 'admin'`;
await sql.end();
console.log("admin siap:", email);
