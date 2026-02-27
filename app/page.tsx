import { getClientBySlug } from "@/lib/data";
import { ClientApp } from "@/components/client-app";

export default async function Page() {
  // Root page loads the "demo" client as default
  const config = await getClientBySlug("demo");
  if (!config) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">No clients configured yet.</p>
      </div>
    );
  }
  return <ClientApp config={config} />;
}
