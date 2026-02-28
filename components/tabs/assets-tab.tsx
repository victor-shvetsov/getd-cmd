"use client";

import { useState } from "react";
import { t } from "@/lib/i18n";
import type { AssetsData, AssetFile } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import {
  Download,
  FileText,
  Video,
  X,
} from "lucide-react";

interface Props {
  data?: Record<string, unknown>;
  lang: string;
  translations: Record<string, Record<string, Record<string, string>>>;
}

export function AssetsTab({ data, lang, translations }: Props) {
  const d = data as unknown as AssetsData | undefined;
  const [lightbox, setLightbox] = useState<string | null>(null);

  const brandKit = d?.asset_library?.brand_kit;
  const content = d?.asset_library?.content;

  // Flatten everything into one list: logos, guidelines, content items
  const allFiles: { name: string; url: string; type: "image" | "video" | "file"; notes?: string }[] = [];

  // Logos
  brandKit?.logos?.forEach((f) => {
    const isImg = /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(f.name);
    allFiles.push({ name: f.name, url: f.file_url, type: isImg ? "image" : "file", notes: f.notes || undefined });
  });

  // Guidelines / brand docs
  brandKit?.guidelines?.forEach((f) => {
    allFiles.push({ name: f.name, url: f.file_url, type: "file" });
  });

  // Content items (photos, videos, etc)
  content?.items
    ?.filter((it) => it.status === "approved" || it.status === "delivered")
    .forEach((item) => {
      const isImg = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(item.name);
      const isVid = /\.(mp4|mov|webm)$/i.test(item.name);
      allFiles.push({
        name: item.name,
        url: item.file_url,
        type: isVid ? "video" : isImg ? "image" : "file",
      });
    });

  if (allFiles.length === 0) {
    return <EmptyState lang={lang} translations={translations} />;
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-wider opacity-45">
          {t("assets.your_files", lang, translations)}
        </h2>
        <span className="text-[11px] font-medium opacity-30">
          {allFiles.length} {allFiles.length === 1 ? t("assets.file_singular", lang, translations) : t("assets.files_plural", lang, translations)}
        </span>
      </div>

      {/* Simple grid -- tap to preview images, download anything */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {allFiles.map((file, i) => (
          <div
            key={`${file.url}-${i}`}
            className="group flex flex-col overflow-hidden"
            style={{
              backgroundColor: "var(--surface-2)",
              borderRadius: "var(--client-radius, 0.75rem)",
            }}
          >
            {/* Thumbnail / icon area */}
            <div
              className="flex h-28 cursor-pointer items-center justify-center overflow-hidden"
              style={{ backgroundColor: "var(--surface-1)" }}
              onClick={() => file.type === "image" && setLightbox(file.url)}
            >
              {file.type === "image" ? (
                <img
                  src={file.url}
                  alt={file.name}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  crossOrigin="anonymous"
                />
              ) : file.type === "video" ? (
                <Video className="h-6 w-6 opacity-30" />
              ) : (
                <FileText className="h-6 w-6 opacity-30" />
              )}
            </div>

            {/* Name + download */}
            <div className="flex items-center gap-1.5 px-2.5 py-2">
              <span className="min-w-0 flex-1 truncate text-[11px] font-medium">
                {file.name}
              </span>
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded"
                style={{ color: "var(--client-primary, #3b82f6)" }}
                title="Download"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="h-3 w-3" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightbox}
            alt="Preview"
            className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
            crossOrigin="anonymous"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
