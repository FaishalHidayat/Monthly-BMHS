import { requireAdminPage } from "@/lib/server/auth";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  const me = await requireAdminPage();
  return <UsersClient meId={me.id} />;
}
