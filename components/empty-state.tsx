"use client";

import { t } from "@/lib/i18n";

interface EmptyStateProps {
  lang: string;
  translations: Record<string, Record<string, Record<string, string>>>;
}

export function EmptyState({ lang, translations }: EmptyStateProps) {
  return (
    <div
      className="rounded-lg border p-6 text-center"
      style={{
        borderColor: "var(--client-text, #1a2536)11",
        borderRadius: "var(--client-radius, 0.5rem)",
      }}
    >
      <p className="text-sm" style={{ opacity: 0.5 }}>
        {t("common.no_data", lang, translations)}
      </p>
    </div>
  );
}
