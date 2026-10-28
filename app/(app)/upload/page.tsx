import { requireAdminPage } from "@/lib/server/auth";
import { listPeriods } from "@/lib/server/periods";
import { UploadClient } from "./upload-client";

export default async function UploadPage() {
  await requireAdminPage();
  const periods = await listPeriods();
  return <UploadClient periods={periods} />;
}
