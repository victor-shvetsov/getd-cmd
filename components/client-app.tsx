"use client";

import { useCallback, useEffect, useState } from "react";
import type { ClientConfig } from "@/lib/types";
import { PinGate } from "@/components/pin-gate";
import { ReportView } from "@/components/report-view";

function applyBranding(config: ClientConfig) {
  const root = document.documentElement;
  const b = config.branding;

  // Set CSS custom properties for dynamic theming
  root.style.setProperty("--client-primary", b.primary_color);
  root.style.setProperty("--client-secondary", b.secondary_color);
  root.style.setProperty("--client-accent", b.accent_color);
  root.style.setProperty("--client-bg", b.background_color);
  root.style.setProperty("--client-text", b.text_color);
  root.style.setProperty("--client-radius", b.border_radius);
  root.style.setProperty("--client-font-heading", b.font_heading);
  root.style.setProperty("--client-font-body", b.font_body);
  root.style.setProperty("--client-primary-light", `${b.primary_color}10`);
}

interface ClientAppProps {
  config: ClientConfig;
}

export function ClientApp({ config }: ClientAppProps) {
  const sessionKey = `pin_auth_${config.slug}`;
  const [authenticated, setAuthenticated] = useState(() => {
    // Restore auth state after Stripe redirect or page refresh within the same session
    if (typeof window !== "undefined") {
      return sessionStorage.getItem(sessionKey) === "1";
    }
    return false;
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    applyBranding(config);
    // Load Google Fonts dynamically
    const families = new Set([config.branding.font_heading, config.branding.font_body]);
    families.forEach((font) => {
      if (font && font !== "Inter") {
        const link = document.createElement("link");
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;500;600;700&display=swap`;
        link.rel = "stylesheet";
        document.head.appendChild(link);
      }
    });
    setMounted(true);
  }, [config]);

  const verifyPin = useCallback(
    async (pin: string): Promise<boolean> => {
      try {
        const res = await fetch("/api/verify-pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: config.slug, pin }),
        });
        return res.ok;
      } catch {
        return false;
      }
    },
    [config.slug]
  );

  const handleSuccess = useCallback(() => {
    sessionStorage.setItem(sessionKey, "1");
    setAuthenticated(true);
  }, [sessionKey]);

  if (!mounted) {
    return (
      <div className="flex min-h-dvh items-center justify-center" style={{ backgroundColor: config.branding.background_color }}>
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: config.branding.primary_color, borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <PinGate
        config={config}
        onSuccess={handleSuccess}
        verifyPin={verifyPin}
      />
    );
  }

  return <ReportView config={config} />;
}
