import { requireAdminPage } from "@/lib/server/auth";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  await requireAdminPage();
  return <SettingsClient />;
}
