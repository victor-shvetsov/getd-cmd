import { redirect } from "next/navigation";

export default async function ClientAdminPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  redirect(`/admin/${clientId}/general`);
}
