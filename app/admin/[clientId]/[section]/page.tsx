import { ClientSectionPage } from "@/components/admin/client-section-page";

export default async function Page({
  params,
}: {
  params: Promise<{ clientId: string; section: string }>;
}) {
  const { clientId, section } = await params;
  return <ClientSectionPage clientId={clientId} section={section} />;
}
