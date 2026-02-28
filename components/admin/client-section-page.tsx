"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClientEditor } from "@/components/admin/client-editor";
import { useAdminTheme } from "@/components/admin/admin-theme-toggle";

const TOKEN_KEY = "admin_token";

export function ClientSectionPage({
  clientId,
  section,
}: {
  clientId: string;
  section: string;
}) {
  const router = useRouter();
  const [token, setToken] = useState<string>("");
  const [ready, setReady] = useState(false);
  const { theme, toggle } = useAdminTheme();

  useEffect(() => {
    const saved = sessionStorage.getItem(TOKEN_KEY);
    if (!saved) {
      router.push("/admin");
      return;
    }
    // Show content immediately — token present in sessionStorage
    setToken(saved);
    setReady(true);
    // Validate in background; redirect if invalid
    fetch("/api/admin/auth", { headers: { Authorization: `Bearer ${saved}` } }).then((res) => {
      if (!res.ok) {
        sessionStorage.removeItem(TOKEN_KEY);
        router.push("/admin");
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) {
    return (
      <div className={`admin-${theme}`}>
        <div
          className="flex min-h-dvh items-center justify-center"
          style={{ backgroundColor: "var(--adm-bg)" }}
        >
          <div
            className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: "var(--adm-accent)", borderTopColor: "transparent" }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`admin-${theme}`}>
      <ClientEditor
        clientId={clientId}
        section={section}
        token={token}
        onDelete={() => router.push("/admin")}
        theme={theme}
        toggleTheme={toggle}
      />
    </div>
  );
}
