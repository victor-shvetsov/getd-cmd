"use client";

import { useState } from "react";
import { t } from "@/lib/i18n";
import type { AssetsData, AssetFile, ContentAsset } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import {
  Download,
  ExternalLink,
  Palette,
  Type,
  FileText,
  Image as ImageIcon,
  Camera,
  Globe,
  Video,
  X,
} from "lucide-react";

interface Props {
  data?: Record<string, unknown>;
  lang: string;
  translations: Record<string, Record<string, Record<string, string>>>;
}

type Section = "brand" | "content" | "website";

export function AssetsTab({ data, lang, translations }: Props) {
  const d = data as unknown as AssetsData | undefined;
  const [section, setSection] = useState<Section>("brand");
  const [lightbox, setLightbox] = useState<string | null>(null);

  const brandKit = d?.asset_library?.brand_kit;
  const content = d?.asset_library?.content;
  const website = d?.asset_library?.website;

  const hasContent =
    brandKit?.logos?.length ||
    brandKit?.colors?.length ||
    brandKit?.fonts?.length ||
    content?.items?.length ||
    website?.figma_links?.length ||
    website?.staging_url ||
    website?.live_url;

  if (!hasContent) {
    return <EmptyState lang={lang} translations={translations} />;
  }

  const sections: { key: Section; label: string; icon: typeof Palette }[] = [
    { key: "brand", label: t("assets.brand_kit", lang, translations) || "Brand Kit", icon: Palette },
    { key: "content", label: t("assets.content", lang, translations) || "Content", icon: Camera },
    { key: "website", label: t("assets.website", lang, translations) || "Website", icon: Globe },
  ];

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      {/* Section tabs */}
      <div className="flex items-center gap-1 overflow-x-auto">
        {sections.map((s) => {
          const Icon = s.icon;
          const active = section === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-[11px] font-medium transition-colors"
              style={{
                backgroundColor: active ? "color-mix(in srgb, var(--client-primary, #3b82f6) 10%, transparent)" : "transparent",
                color: active ? "var(--client-primary, #3b82f6)" : "var(--text-1)",
                opacity: active ? 1 : 0.5,
              }}
            >
              <Icon className="h-3 w-3" />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Brand Kit */}
      {section === "brand" && brandKit && (
        <div className="flex flex-col gap-4">
          {/* Logos */}
          {brandKit.logos?.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-[10px] font-bold uppercase tracking-wider opacity-45">
                {t("assets.logos", lang, translations) || "Logo Files"}
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {brandKit.logos.map((logo, i) => (
                  <LogoCard key={logo.id || i} file={logo} onPreview={setLightbox} />
                ))}
              </div>
            </div>
          )}

          {/* Colors */}
          {brandKit.colors?.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-[10px] font-bold uppercase tracking-wider opacity-45">
                {t("assets.colors", lang, translations) || "Brand Colors"}
              </h3>
              <div className="flex flex-wrap gap-2">
                {brandKit.colors.map((color, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg px-3 py-2"
                    style={{ backgroundColor: "var(--surface-2)" }}
                  >
                    <div
                      className="h-6 w-6 rounded-md"
                      style={{
                        backgroundColor: color.hex,
                        border: "1px solid var(--border-1)",
                      }}
                    />
                    <div className="flex flex-col">
                      <span className="text-[11px] font-medium">{color.label}</span>
                      <span className="font-mono text-[10px] opacity-50">{color.hex}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fonts */}
          {brandKit.fonts?.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-[10px] font-bold uppercase tracking-wider opacity-45">
                {t("assets.fonts", lang, translations) || "Brand Fonts"}
              </h3>
              <div className="flex flex-col gap-1.5">
                {brandKit.fonts.map((font, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg px-3 py-2"
                    style={{ backgroundColor: "var(--surface-2)" }}
                  >
                    <div className="flex items-center gap-2">
                      <Type className="h-3.5 w-3.5 opacity-40" />
                      <span className="text-xs font-medium">{font.label}</span>
                      <span className="text-[11px] opacity-50">{font.family}</span>
                    </div>
                    {font.url && (
                      <a
                        href={font.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] font-medium hover:underline"
                        style={{ color: "var(--client-primary, #3b82f6)" }}
                      >
                        <Download className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Guidelines */}
          {brandKit.guidelines?.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-[10px] font-bold uppercase tracking-wider opacity-45">
                {t("assets.guidelines", lang, translations) || "Brand Guidelines"}
              </h3>
              <div className="flex flex-col gap-1.5">
                {brandKit.guidelines.map((g, i) => (
                  <a
                    key={g.id || i}
                    href={g.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 transition-colors hover:opacity-80"
                    style={{ backgroundColor: "var(--surface-2)" }}
                  >
                    <FileText className="h-3.5 w-3.5 opacity-40" />
                    <span className="flex-1 text-xs font-medium">{g.name}</span>
                    <Download className="h-3 w-3 opacity-40" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content Library */}
      {section === "content" && (
        <div className="flex flex-col gap-3">
          {content?.items?.length ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {content.items
                .filter((it) => it.status === "approved" || it.status === "delivered")
                .map((item, i) => {
                  const isImg = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(item.name);
                  const isVid = /\.(mp4|mov|webm)$/i.test(item.name);
                  return (
                    <div
                      key={item.id || i}
                      className="group cursor-pointer overflow-hidden"
                      style={{
                        backgroundColor: "var(--surface-2)",
                        borderRadius: "var(--client-radius, 0.75rem)",
                      }}
                      onClick={() => isImg && setLightbox(item.file_url)}
                    >
                      <div
                        className="flex h-28 items-center justify-center overflow-hidden"
                        style={{ backgroundColor: "var(--surface-1)" }}
                      >
                        {isImg ? (
                          <img
                            src={item.file_url}
                            alt={item.name}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                            crossOrigin="anonymous"
                          />
                        ) : isVid ? (
                          <Video className="h-6 w-6 opacity-30" />
                        ) : (
                          <FileText className="h-6 w-6 opacity-30" />
                        )}
                      </div>
                      <div className="flex items-center justify-between px-2.5 py-2">
                        <span className="truncate text-[11px] font-medium">{item.name}</span>
                        <a
                          href={item.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-5 w-5 shrink-0 items-center justify-center"
                          style={{ color: "var(--client-primary, #3b82f6)" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-10 opacity-40">
              <Camera className="h-6 w-6" />
              <p className="text-xs">No content available yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Website */}
      {section === "website" && website && (
        <div className="flex flex-col gap-3">
          {/* Status */}
          {website.status && website.status !== "not_started" && (
            <div
              className="rounded-lg px-4 py-3"
              style={{ backgroundColor: "var(--surface-2)" }}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-45">
                Status
              </span>
              <div className="mt-2 flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor:
                      website.status === "live"
                        ? "var(--client-primary, #22c55e)"
                        : "var(--client-primary, #3b82f6)",
                  }}
                />
                <span className="text-xs font-semibold capitalize">
                  {website.status.replace(/_/g, " ")}
                </span>
              </div>
            </div>
          )}

          {/* Links */}
          {(website.live_url || website.staging_url) && (
            <div className="flex flex-col gap-1.5">
              {website.live_url && (
                <a
                  href={website.live_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg px-4 py-3 transition-colors hover:opacity-80"
                  style={{ backgroundColor: "var(--surface-2)" }}
                >
                  <Globe className="h-4 w-4" style={{ color: "var(--client-primary, #3b82f6)" }} />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold">Live Website</span>
                    <span className="text-[10px] opacity-50">{website.live_url}</span>
                  </div>
                  <ExternalLink className="ml-auto h-3 w-3 opacity-40" />
                </a>
              )}
              {website.staging_url && (
                <a
                  href={website.staging_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg px-4 py-3 transition-colors hover:opacity-80"
                  style={{ backgroundColor: "var(--surface-2)" }}
                >
                  <Globe className="h-4 w-4 opacity-50" />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold">Staging Preview</span>
                    <span className="text-[10px] opacity-50">{website.staging_url}</span>
                  </div>
                  <ExternalLink className="ml-auto h-3 w-3 opacity-40" />
                </a>
              )}
            </div>
          )}

          {/* Figma links */}
          {website.figma_links?.filter((l) => l.url).length > 0 && (
            <div className="flex flex-col gap-1.5">
              <h3 className="text-[10px] font-bold uppercase tracking-wider opacity-45">
                Design Files
              </h3>
              {website.figma_links
                .filter((l) => l.url)
                .map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg px-4 py-2.5 transition-colors hover:opacity-80"
                    style={{ backgroundColor: "var(--surface-2)" }}
                  >
                    <ImageIcon className="h-3.5 w-3.5 opacity-40" />
                    <span className="flex-1 text-xs font-medium">
                      {link.label || "Design File"}
                    </span>
                    <ExternalLink className="h-3 w-3 opacity-40" />
                  </a>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
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

/* ------------------------------------------------------------------ */
/*  Logo card (client-facing)                                          */
/* ------------------------------------------------------------------ */

function LogoCard({
  file,
  onPreview,
}: {
  file: AssetFile;
  onPreview: (url: string) => void;
}) {
  const isImage = /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(file.name);

  return (
    <div
      className="group flex flex-col overflow-hidden"
      style={{
        backgroundColor: "var(--surface-2)",
        borderRadius: "var(--client-radius, 0.75rem)",
      }}
    >
      <div
        className="flex h-20 cursor-pointer items-center justify-center overflow-hidden p-3"
        style={{ backgroundColor: "var(--surface-1)" }}
        onClick={() => isImage && onPreview(file.file_url)}
      >
        {isImage ? (
          <img
            src={file.file_url}
            alt={file.name}
            className="h-full max-w-full object-contain"
            crossOrigin="anonymous"
          />
        ) : (
          <FileText className="h-6 w-6 opacity-30" />
        )}
      </div>
      <div className="flex items-center justify-between px-2.5 py-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[11px] font-medium">{file.name}</span>
          <span className="text-[9px] font-semibold uppercase opacity-40">{file.file_type}</span>
        </div>
        <a
          href={file.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded"
          style={{ color: "var(--client-primary, #3b82f6)" }}
          title="Download"
        >
          <Download className="h-3 w-3" />
        </a>
      </div>
      {file.notes && (
        <div className="px-2.5 pb-2">
          <span className="text-[10px] opacity-40">{file.notes}</span>
        </div>
      )}
    </div>
  );
}
