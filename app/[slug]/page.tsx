import { getClientBySlug } from "@/lib/data";
import { notFound } from "next/navigation";
import { ClientApp } from "@/components/client-app";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ClientPage({ params }: PageProps) {
  const { slug } = await params;
  const config = await getClientBySlug(slug);
  if (!config) notFound();
  return <ClientApp config={config} />;
}
