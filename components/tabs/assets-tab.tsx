"use client";

import { useState, useEffect, useRef } from "react";
import { t } from "@/lib/i18n";
import type { AssetsData } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import {
  Download,
  FileText,
  Video,
  X,
  ExternalLink,
} from "lucide-react";

interface Props {
  data?: Record<string, unknown>;
  lang: string;
  translations: Record<string, Record<string, Record<string, string>>>;
}

/* ── radius helper ── */
const R = "var(--client-radius, 0.75rem)";
const R_SM = "calc(var(--client-radius, 0.75rem) * 0.65)";
const R_XS = "calc(var(--client-radius, 0.75rem) * 0.4)";

/* ── natural image size hook ── */
function useNaturalSize(url: string) {
  const [ratio, setRatio] = useState<number | null>(null);
  useEffect(() => {
    if (!url) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setRatio(img.naturalWidth / img.naturalHeight);
    img.src = url;
  }, [url]);
  return ratio;
}

/* ── masonry item that loads its own aspect ratio ── */
function MasonryImage({
  url,
  name,
  onClick,
  onDownload,
}: {
  url: string;
  name: string;
  onClick: () => void;
  onDownload: (e: React.MouseEvent) => void;
}) {
  const ratio = useNaturalSize(url);
  return (
    <div
      className="group relative cursor-pointer overflow-hidden break-inside-avoid"
      style={{ borderRadius: R, marginBottom: 8 }}
      onClick={onClick}
    >
      <div style={{ backgroundColor: "var(--surface-1)" }}>
        <img
          src={url}
          alt={name}
          className="block w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          crossOrigin="anonymous"
          style={ratio ? { aspectRatio: ratio } : { minHeight: 100 }}
        />
      </div>
      {/* Hover overlay */}
      <div className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100">
        <div className="pointer-events-auto flex w-full items-center gap-2 px-3 py-2.5">
          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-white">
            {name}
          </span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm"
            title="Download"
            onClick={onDownload}
          >
            <Download className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

/* ── file card (non-image) ── */
function FileCard({
  name,
  url,
  isVideo,
  notes,
}: {
  name: string;
  url: string;
  isVideo: boolean;
  notes?: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 break-inside-avoid px-3 py-3 transition-colors"
      style={{
        backgroundColor: "var(--surface-1)",
        borderRadius: R,
        marginBottom: 8,
      }}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center"
        style={{
          backgroundColor: "var(--surface-2)",
          borderRadius: R_SM,
        }}
      >
        {isVideo ? (
          <Video className="h-4 w-4 opacity-40" />
        ) : (
          <FileText className="h-4 w-4 opacity-40" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[12px] font-semibold">{name}</span>
        {notes && (
          <span className="truncate text-[10px] opacity-40">{notes}</span>
        )}
      </div>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-40" />
    </a>
  );
}

/* ── main component ── */
export function AssetsTab({ data, lang, translations }: Props) {
  const d = data as unknown as AssetsData | undefined;
  const [lightbox, setLightbox] = useState<string | null>(null);

  const brandKit = d?.asset_library?.brand_kit;
  const content = d?.asset_library?.content;
  const website = d?.asset_library?.website;

  // Separate images from files
  const images: { name: string; url: string; notes?: string }[] = [];
  const files: { name: string; url: string; isVideo: boolean; notes?: string }[] = [];

  // Logos
  brandKit?.logos?.forEach((f) => {
    const isImg = /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(f.name);
    if (isImg) {
      images.push({ name: f.name, url: f.file_url, notes: f.notes || undefined });
    } else {
      files.push({ name: f.name, url: f.file_url, isVideo: false, notes: f.notes || undefined });
    }
  });

  // Guidelines
  brandKit?.guidelines?.forEach((f) => {
    files.push({ name: f.name, url: f.file_url, isVideo: false });
  });

  // Content
  content?.items
    ?.filter((it) => it.status === "approved" || it.status === "delivered")
    .forEach((item) => {
      const isImg = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(item.name);
      const isVid = /\.(mp4|mov|webm)$/i.test(item.name);
      if (isImg) {
        images.push({ name: item.name, url: item.file_url });
      } else {
        files.push({ name: item.name, url: item.file_url, isVideo: isVid });
      }
    });

  // Website docs
  website?.copy_docs?.forEach((f) => {
    files.push({ name: f.name, url: f.file_url, isVideo: false });
  });

  const colors = brandKit?.colors ?? [];
  const fonts = brandKit?.fonts ?? [];
  const hasAnything = images.length > 0 || files.length > 0 || colors.length > 0 || fonts.length > 0;

  if (!hasAnything) {
    return <EmptyState lang={lang} translations={translations} />;
  }

  return (
    <div className="flex flex-col gap-5 px-4 py-4">
      {/* ── Color palette ── */}
      {colors.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[10px] font-bold uppercase tracking-wider opacity-35">
            {t("assets.colors", lang, translations)}
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {colors.map((c, i) => (
              <div
                key={i}
                className="flex shrink-0 flex-col items-center gap-1.5"
              >
                <div
                  className="h-14 w-14 shadow-sm"
                  style={{
                    backgroundColor: c.hex,
                    borderRadius: R_SM,
                    border: "1px solid var(--border-1)",
                  }}
                />
                <span className="text-[9px] font-semibold uppercase tracking-wider opacity-40">
                  {c.hex}
                </span>
                {c.label && (
                  <span className="max-w-[60px] truncate text-[8px] opacity-30">
                    {c.label}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Typography preview ── */}
      {fonts.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[10px] font-bold uppercase tracking-wider opacity-35">
            {t("assets.fonts", lang, translations)}
          </h3>
          <div className="flex flex-col gap-2">
            {fonts.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-3.5 py-3"
                style={{
                  backgroundColor: "var(--surface-1)",
                  borderRadius: R,
                }}
              >
                <div className="flex flex-col gap-0.5">
                  <span
                    className="text-[18px] font-semibold leading-tight"
                    style={{ fontFamily: `'${f.family}', sans-serif` }}
                  >
                    {f.family}
                  </span>
                  <span className="text-[10px] opacity-35">{f.label}</span>
                </div>
                <span
                  className="text-[28px] font-bold opacity-15"
                  style={{ fontFamily: `'${f.family}', sans-serif` }}
                >
                  Aa
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Visual board (masonry) ── */}
      {images.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-wider opacity-35">
              {t("assets.logos", lang, translations)}
            </h3>
            <span className="text-[10px] font-medium opacity-25">
              {images.length} {images.length === 1 ? t("assets.file_singular", lang, translations) : t("assets.files_plural", lang, translations)}
            </span>
          </div>

          {/* CSS columns masonry -- images flow naturally */}
          <div
            style={{
              columnCount: images.length === 1 ? 1 : 2,
              columnGap: 8,
            }}
          >
            {images.map((img, i) => (
              <MasonryImage
                key={`${img.url}-${i}`}
                url={img.url}
                name={img.name}
                onClick={() => setLightbox(img.url)}
                onDownload={(e) => e.stopPropagation()}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Documents & other files ── */}
      {files.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[10px] font-bold uppercase tracking-wider opacity-35">
            {t("assets.guidelines", lang, translations)}
          </h3>
          <div className="flex flex-col">
            {files.map((file, i) => (
              <FileCard
                key={`${file.url}-${i}`}
                name={file.name}
                url={file.url}
                isVideo={file.isVideo}
                notes={file.notes}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Figma / staging links ── */}
      {(website?.figma_links?.length ?? 0) > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[10px] font-bold uppercase tracking-wider opacity-35">
            {t("assets.website", lang, translations)}
          </h3>
          <div className="flex flex-col gap-1.5">
            {website!.figma_links.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2.5 px-3 py-2.5 transition-colors"
                style={{
                  backgroundColor: "var(--surface-1)",
                  borderRadius: R,
                }}
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-35" />
                <span className="text-[12px] font-medium">{link.label || link.url}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ── Lightbox ── */}
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
            className="max-h-[85vh] max-w-[90vw] object-contain"
            crossOrigin="anonymous"
            style={{ borderRadius: R }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
