"use client";

import { useCallback, useRef, useState } from "react";
import type {
  AssetFile,
  BrandColor,
  BrandFont,
  ContentAsset,
  WebLink,
  BriefEntry,
} from "@/lib/types";
import {
  Upload,
  Plus,
  Trash2,
  FileText,
  Image as ImageIcon,
  Video,
  Link2,
  Palette,
  Type,
  Camera,
  Globe,
  Wand2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  Briefcase,
  Download,
  X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Section tab types                                                  */
/* ------------------------------------------------------------------ */
type HubSection = "brand_kit" | "content" | "website" | "briefs";

const HUB_SECTIONS: { key: HubSection; label: string; icon: typeof Palette }[] = [
  { key: "brand_kit", label: "Brand Kit", icon: Palette },
  { key: "content", label: "Content", icon: Camera },
  { key: "website", label: "Website", icon: Globe },
  { key: "briefs", label: "Briefs", icon: Briefcase },
];

/* ------------------------------------------------------------------ */
/*  Main export                                                        */
/* ------------------------------------------------------------------ */
export function AssetsHubEditor({
  data,
  onChange,
  clientId,
  token,
}: {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
  clientId: string;
  token: string;
}) {
  const [section, setSection] = useState<HubSection>("brand_kit");

  /* Typed sub-data accessors */
  const brandKit = (data.brand_kit ?? {
    logos: [],
    colors: [{ label: "Primary", hex: "#000000" }],
    fonts: [{ label: "Heading", family: "", url: "" }],
    guidelines: [],
  }) as {
    logos: AssetFile[];
    colors: BrandColor[];
    fonts: BrandFont[];
    guidelines: AssetFile[];
  };

  const content = (data.content ?? { items: [] }) as {
    items: ContentAsset[];
  };

  const website = (data.website ?? {
    figma_links: [],
    copy_docs: [],
    staging_url: "",
    live_url: "",
    status: "not_started",
  }) as {
    figma_links: WebLink[];
    copy_docs: AssetFile[];
    staging_url: string;
    live_url: string;
    status: string;
  };

  const briefs = (data.briefs ?? {
    designer: null,
    photographer: null,
    developer: null,
  }) as {
    designer: BriefEntry | null;
    photographer: BriefEntry | null;
    developer: BriefEntry | null;
  };

  const updateBrandKit = (bk: typeof brandKit) => onChange({ ...data, brand_kit: bk });
  const updateContent = (c: typeof content) => onChange({ ...data, content: c });
  const updateWebsite = (w: typeof website) => onChange({ ...data, website: w });
  const updateBriefs = (b: typeof briefs) => onChange({ ...data, briefs: b });

  return (
    <div className="flex flex-col gap-4">
      {/* Section tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto">
        {HUB_SECTIONS.map((s) => {
          const Icon = s.icon;
          const active = section === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors"
              style={{
                backgroundColor: active ? "var(--adm-accent-10)" : "transparent",
                color: active ? "var(--adm-accent-text)" : "var(--adm-text-muted)",
                borderBottom: active ? "2px solid var(--adm-accent)" : "2px solid transparent",
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Section content */}
      {section === "brand_kit" && (
        <BrandKitSection
          data={brandKit}
          onChange={updateBrandKit}
          clientId={clientId}
          token={token}
        />
      )}
      {section === "content" && (
        <ContentSection
          data={content}
          onChange={updateContent}
          clientId={clientId}
          token={token}
        />
      )}
      {section === "website" && (
        <WebsiteSection data={website} onChange={updateWebsite} clientId={clientId} token={token} />
      )}
      {section === "briefs" && (
        <BriefsSection
          data={briefs}
          onChange={updateBriefs}
          clientId={clientId}
          token={token}
        />
      )}
    </div>
  );
}

/* ================================================================== */
/*  SHARED: File uploader                                              */
/* ================================================================== */

function FileUploadButton({
  label,
  accept,
  onUpload,
  token,
  clientId,
  section,
}: {
  label: string;
  accept?: string;
  onUpload: (file: AssetFile) => void;
  token: string;
  clientId: string;
  section: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("clientId", clientId);
      form.append("section", section);
      const res = await fetch("/api/admin/assets/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (res.ok) {
        const { url } = await res.json();
        const assetFile: AssetFile = {
          id: crypto.randomUUID(),
          name: file.name,
          file_url: url,
          file_type: file.name.split(".").pop()?.toUpperCase() || "FILE",
          file_size: file.size,
          notes: "",
          uploaded_at: new Date().toISOString(),
        };
        onUpload(assetFile);
      }
    } finally {
      setUploading(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={handleFile} />
      <button
        onClick={() => ref.current?.click()}
        disabled={uploading}
        className="flex h-8 items-center gap-1.5 rounded-lg border border-dashed px-3 text-xs font-medium transition-colors disabled:opacity-50"
        style={{
          borderColor: "var(--adm-border)",
          color: "var(--adm-text-muted)",
        }}
      >
        {uploading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Upload className="h-3 w-3" />
        )}
        {uploading ? "Uploading..." : label}
      </button>
    </>
  );
}

function FileCard({
  file,
  onDelete,
  onNotesChange,
}: {
  file: AssetFile;
  onDelete: () => void;
  onNotesChange?: (notes: string) => void;
}) {
  const isImage = /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(file.name);
  const sizeLabel =
    file.file_size > 1_000_000
      ? `${(file.file_size / 1_000_000).toFixed(1)} MB`
      : `${(file.file_size / 1_000).toFixed(0)} KB`;

  return (
    <div
      className="group flex items-start gap-3 rounded-lg border p-3 transition-colors"
      style={{
        borderColor: "var(--adm-border)",
        backgroundColor: "var(--adm-surface-2)",
      }}
    >
      {/* Thumbnail / icon */}
      <div
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg"
        style={{ backgroundColor: "var(--adm-bg)" }}
      >
        {isImage ? (
          <img
            src={file.file_url}
            alt={file.name}
            className="h-full w-full object-cover"
            crossOrigin="anonymous"
          />
        ) : (
          <FileText className="h-4 w-4" style={{ color: "var(--adm-text-muted)" }} />
        )}
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="truncate text-xs font-medium" style={{ color: "var(--adm-text)" }}>
            {file.name}
          </span>
          <span
            className="flex-shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold uppercase"
            style={{
              backgroundColor: "var(--adm-accent-10)",
              color: "var(--adm-accent-text)",
            }}
          >
            {file.file_type}
          </span>
        </div>
        <span className="text-[10px]" style={{ color: "var(--adm-text-muted)" }}>
          {sizeLabel}
        </span>
        {onNotesChange && (
          <input
            className="mt-1 w-full rounded border bg-transparent px-2 py-1 text-[11px] outline-none"
            style={{
              borderColor: "var(--adm-border)",
              color: "var(--adm-text)",
            }}
            placeholder="Notes..."
            value={file.notes}
            onChange={(e) => onNotesChange(e.target.value)}
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-shrink-0 items-center gap-1">
        <a
          href={file.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-7 w-7 items-center justify-center rounded transition-colors"
          style={{ color: "var(--adm-text-muted)" }}
          title="Download"
        >
          <Download className="h-3 w-3" />
        </a>
        <button
          onClick={onDelete}
          className="flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-[var(--adm-danger-bg)] hover:text-[var(--adm-danger-text)]"
          style={{ color: "var(--adm-text-muted)" }}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  1. BRAND KIT SECTION                                               */
/* ================================================================== */

function BrandKitSection({
  data,
  onChange,
  clientId,
  token,
}: {
  data: {
    logos: AssetFile[];
    colors: BrandColor[];
    fonts: BrandFont[];
    guidelines: AssetFile[];
  };
  onChange: (d: typeof data) => void;
  clientId: string;
  token: string;
}) {
  const [openSub, setOpenSub] = useState<string>("logos");

  return (
    <div className="flex flex-col gap-3">
      {/* Auto-sync banner */}
      <div
        className="flex items-start gap-2.5 rounded-lg border px-3 py-2.5"
        style={{
          borderColor: "color-mix(in srgb, var(--adm-accent) 25%, transparent)",
          backgroundColor: "var(--adm-accent-10)",
        }}
      >
        <Palette className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--adm-accent-text)" }} />
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-semibold" style={{ color: "var(--adm-accent-text)" }}>
            Brand Kit drives dashboard appearance
          </span>
          <span className="text-[10px] leading-relaxed" style={{ color: "var(--adm-text-muted)" }}>
            First logo = dashboard logo. Colors sync by label (Primary, Secondary, Accent, Background, Text, Header) or by order. Fonts sync by label (Heading, Body) or by order. Changes apply when you Save.
          </span>
        </div>
      </div>

      {/* Logos */}
      <SubSection
        title="Logo Files"
        icon={ImageIcon}
        open={openSub === "logos"}
        onToggle={() => setOpenSub(openSub === "logos" ? "" : "logos")}
        count={data.logos.length}
      >
        <div className="flex flex-col gap-2">
          {data.logos.map((logo, i) => (
            <FileCard
              key={logo.id}
              file={logo}
              onDelete={() => onChange({ ...data, logos: data.logos.filter((_, j) => j !== i) })}
              onNotesChange={(notes) => {
                const next = [...data.logos];
                next[i] = { ...next[i], notes };
                onChange({ ...data, logos: next });
              }}
            />
          ))}
 <FileUploadButton
  label="Upload Logo"
  accept=".svg,.png,.jpg,.jpeg,.pdf,.ai,.eps"
  token={token}
  clientId={clientId}
  section="brand_kit"
            onUpload={(f) => onChange({ ...data, logos: [...data.logos, f] })}
          />
        </div>
      </SubSection>

      {/* Colors */}
      <SubSection
        title="Brand Colors"
        icon={Palette}
        open={openSub === "colors"}
        onToggle={() => setOpenSub(openSub === "colors" ? "" : "colors")}
        count={data.colors.length}
      >
        <div className="flex flex-col gap-2">
          {data.colors.map((color, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg border p-2"
              style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)" }}
            >
              <div
                className="h-8 w-8 flex-shrink-0 rounded-md border"
                style={{ backgroundColor: color.hex, borderColor: "var(--adm-border)" }}
              />
              <input
                className="w-24 rounded border bg-transparent px-2 py-1 text-xs outline-none"
                style={{ borderColor: "var(--adm-border)", color: "var(--adm-text)" }}
                placeholder="Label"
                value={color.label}
                onChange={(e) => {
                  const next = [...data.colors];
                  next[i] = { ...next[i], label: e.target.value };
                  onChange({ ...data, colors: next });
                }}
              />
              <input
                className="w-24 rounded border bg-transparent px-2 py-1 font-mono text-xs outline-none"
                style={{ borderColor: "var(--adm-border)", color: "var(--adm-text)" }}
                placeholder="#000000"
                value={color.hex}
                onChange={(e) => {
                  const next = [...data.colors];
                  next[i] = { ...next[i], hex: e.target.value };
                  onChange({ ...data, colors: next });
                }}
              />
              <input
                type="color"
                value={color.hex}
                onChange={(e) => {
                  const next = [...data.colors];
                  next[i] = { ...next[i], hex: e.target.value };
                  onChange({ ...data, colors: next });
                }}
                className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
              />
              <button
                onClick={() => onChange({ ...data, colors: data.colors.filter((_, j) => j !== i) })}
                className="ml-auto flex h-6 w-6 items-center justify-center rounded text-[var(--adm-text-muted)] hover:bg-[var(--adm-danger-bg)] hover:text-[var(--adm-danger-text)]"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              onChange({
                ...data,
                colors: [...data.colors, { label: "", hex: "#000000" }],
              })
            }
            className="flex h-7 items-center gap-1 self-start rounded border border-dashed px-2 text-[10px] font-medium"
            style={{ borderColor: "var(--adm-border)", color: "var(--adm-text-muted)" }}
          >
            <Plus className="h-2.5 w-2.5" /> Add Color
          </button>
        </div>
      </SubSection>

      {/* Fonts */}
      <SubSection
        title="Brand Fonts"
        icon={Type}
        open={openSub === "fonts"}
        onToggle={() => setOpenSub(openSub === "fonts" ? "" : "fonts")}
        count={data.fonts.length}
      >
        <div className="flex flex-col gap-2">
          {data.fonts.map((font, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg border p-2"
              style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)" }}
            >
              <input
                className="w-24 rounded border bg-transparent px-2 py-1 text-xs outline-none"
                style={{ borderColor: "var(--adm-border)", color: "var(--adm-text)" }}
                placeholder="Label"
                value={font.label}
                onChange={(e) => {
                  const next = [...data.fonts];
                  next[i] = { ...next[i], label: e.target.value };
                  onChange({ ...data, fonts: next });
                }}
              />
              <input
                className="flex-1 rounded border bg-transparent px-2 py-1 text-xs outline-none"
                style={{ borderColor: "var(--adm-border)", color: "var(--adm-text)" }}
                placeholder="Font family"
                value={font.family}
                onChange={(e) => {
                  const next = [...data.fonts];
                  next[i] = { ...next[i], family: e.target.value };
                  onChange({ ...data, fonts: next });
                }}
              />
              <input
                className="w-40 rounded border bg-transparent px-2 py-1 text-xs outline-none"
                style={{ borderColor: "var(--adm-border)", color: "var(--adm-text)" }}
                placeholder="Download URL"
                value={font.url}
                onChange={(e) => {
                  const next = [...data.fonts];
                  next[i] = { ...next[i], url: e.target.value };
                  onChange({ ...data, fonts: next });
                }}
              />
              <button
                onClick={() => onChange({ ...data, fonts: data.fonts.filter((_, j) => j !== i) })}
                className="flex h-6 w-6 items-center justify-center rounded text-[var(--adm-text-muted)] hover:bg-[var(--adm-danger-bg)] hover:text-[var(--adm-danger-text)]"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              onChange({
                ...data,
                fonts: [...data.fonts, { label: "", family: "", url: "" }],
              })
            }
            className="flex h-7 items-center gap-1 self-start rounded border border-dashed px-2 text-[10px] font-medium"
            style={{ borderColor: "var(--adm-border)", color: "var(--adm-text-muted)" }}
          >
            <Plus className="h-2.5 w-2.5" /> Add Font
          </button>
        </div>
      </SubSection>

      {/* Guidelines */}
      <SubSection
        title="Brand Guidelines"
        icon={FileText}
        open={openSub === "guidelines"}
        onToggle={() => setOpenSub(openSub === "guidelines" ? "" : "guidelines")}
        count={data.guidelines.length}
      >
        <div className="flex flex-col gap-2">
          {data.guidelines.map((g, i) => (
            <FileCard
              key={g.id}
              file={g}
              onDelete={() =>
                onChange({ ...data, guidelines: data.guidelines.filter((_, j) => j !== i) })
              }
              onNotesChange={(notes) => {
                const next = [...data.guidelines];
                next[i] = { ...next[i], notes };
                onChange({ ...data, guidelines: next });
              }}
            />
          ))}
 <FileUploadButton
  label="Upload Guidelines"
  accept=".pdf,.doc,.docx,.png,.jpg"
  token={token}
  clientId={clientId}
  section="brand_kit"
            onUpload={(f) => onChange({ ...data, guidelines: [...data.guidelines, f] })}
          />
        </div>
      </SubSection>
    </div>
  );
}

/* ================================================================== */
/*  2. CONTENT SECTION                                                 */
/* ================================================================== */

const CONTENT_CATEGORIES = [
  { value: "team", label: "Team" },
  { value: "product", label: "Product" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "location", label: "Location" },
  { value: "other", label: "Other" },
] as const;

const CONTENT_STATUSES = [
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "delivered", label: "Delivered" },
  { value: "approved", label: "Approved" },
] as const;

function ContentSection({
  data,
  onChange,
  clientId,
  token,
}: {
  data: { items: ContentAsset[] };
  onChange: (d: typeof data) => void;
  clientId: string;
  token: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [filterCat, setFilterCat] = useState<string>("all");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      const newItems: ContentAsset[] = [];
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        form.append("clientId", clientId);
        form.append("section", "content");
        const res = await fetch("/api/admin/assets/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
        if (res.ok) {
          const { url } = await res.json();
          newItems.push({
            id: crypto.randomUUID(),
            name: file.name,
            file_url: url,
            thumbnail_url: url,
            category: "other",
            tags: [],
            notes: "",
            status: "delivered",
            uploaded_at: new Date().toISOString(),
          });
        }
      }
      onChange({ items: [...data.items, ...newItems] });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const filtered =
    filterCat === "all" ? data.items : data.items.filter((it) => it.category === filterCat);

  const updateItem = (idx: number, patch: Partial<ContentAsset>) => {
    const globalIdx = data.items.findIndex((it) => it.id === filtered[idx].id);
    if (globalIdx < 0) return;
    const next = [...data.items];
    next[globalIdx] = { ...next[globalIdx], ...patch };
    onChange({ items: next });
  };

  const deleteItem = (idx: number) => {
    const id = filtered[idx].id;
    onChange({ items: data.items.filter((it) => it.id !== id) });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Filter bar + upload */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="h-8 rounded-lg border bg-transparent px-2 text-xs outline-none"
          style={{ borderColor: "var(--adm-border)", color: "var(--adm-text)" }}
        >
          <option value="all">All Categories</option>
          {CONTENT_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <span className="text-[11px]" style={{ color: "var(--adm-text-muted)" }}>
          {filtered.length} asset{filtered.length !== 1 ? "s" : ""}
        </span>
        <div className="flex-1" />
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={handleUpload}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-dashed px-3 text-xs font-medium transition-colors disabled:opacity-50"
          style={{ borderColor: "var(--adm-border)", color: "var(--adm-text-muted)" }}
        >
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          {uploading ? "Uploading..." : "Upload Content"}
        </button>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-10"
          style={{ borderColor: "var(--adm-border)" }}
        >
          <Camera className="h-6 w-6" style={{ color: "var(--adm-text-muted)" }} />
          <p className="text-xs" style={{ color: "var(--adm-text-muted)" }}>
            No content yet. Upload photos and videos from shoots.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((item, i) => {
            const isImg = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(item.name);
            const isVid = /\.(mp4|mov|webm)$/i.test(item.name);
            return (
              <div
                key={item.id}
                className="group flex flex-col overflow-hidden rounded-lg border"
                style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)" }}
              >
                {/* Thumbnail */}
                <div
                  className="relative flex h-28 items-center justify-center overflow-hidden"
                  style={{ backgroundColor: "var(--adm-bg)" }}
                >
                  {isImg ? (
                    <img
                      src={item.file_url}
                      alt={item.name}
                      className="h-full w-full object-cover"
                      crossOrigin="anonymous"
                    />
                  ) : isVid ? (
                    <Video className="h-6 w-6" style={{ color: "var(--adm-text-muted)" }} />
                  ) : (
                    <FileText className="h-6 w-6" style={{ color: "var(--adm-text-muted)" }} />
                  )}
                  {/* Delete button on hover */}
                  <button
                    onClick={() => deleteItem(i)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-md opacity-0 transition-opacity group-hover:opacity-100"
                    style={{
                      backgroundColor: "var(--adm-danger-bg)",
                      color: "var(--adm-danger-text)",
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>

                {/* Meta */}
                <div className="flex flex-col gap-1.5 p-2">
                  <span
                    className="truncate text-[11px] font-medium"
                    style={{ color: "var(--adm-text)" }}
                  >
                    {item.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={item.category}
                      onChange={(e) =>
                        updateItem(i, {
                          category: e.target.value as ContentAsset["category"],
                        })
                      }
                      className="h-6 flex-1 rounded border bg-transparent px-1 text-[10px] outline-none"
                      style={{
                        borderColor: "var(--adm-border)",
                        color: "var(--adm-text-secondary)",
                      }}
                    >
                      {CONTENT_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={item.status}
                      onChange={(e) =>
                        updateItem(i, {
                          status: e.target.value as ContentAsset["status"],
                        })
                      }
                      className="h-6 flex-1 rounded border bg-transparent px-1 text-[10px] outline-none"
                      style={{
                        borderColor: "var(--adm-border)",
                        color: "var(--adm-text-secondary)",
                      }}
                    >
                      {CONTENT_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  3. WEBSITE SECTION                                                 */
/* ================================================================== */

const WEBSITE_STATUSES = [
  { value: "not_started", label: "Not Started" },
  { value: "copy_ready", label: "Copy Ready" },
  { value: "design_in_progress", label: "Design In Progress" },
  { value: "design_approved", label: "Design Approved" },
  { value: "dev_in_progress", label: "Dev In Progress" },
  { value: "live", label: "Live" },
] as const;

function WebsiteSection({
  data,
  onChange,
  clientId,
  token,
}: {
  data: {
    figma_links: WebLink[];
    copy_docs: AssetFile[];
    staging_url: string;
    live_url: string;
    status: string;
  };
  onChange: (d: typeof data) => void;
  clientId: string;
  token: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Status bar */}
      <div
        className="rounded-lg border p-4"
        style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)" }}
      >
        <label
          className="mb-2 block text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--adm-text-muted)" }}
        >
          Website Status
        </label>
        <div className="flex flex-wrap gap-1.5">
          {WEBSITE_STATUSES.map((s) => {
            const active = data.status === s.value;
            const idx = WEBSITE_STATUSES.findIndex((ws) => ws.value === s.value);
            const currentIdx = WEBSITE_STATUSES.findIndex((ws) => ws.value === data.status);
            const isPast = idx < currentIdx;
            return (
              <button
                key={s.value}
                onClick={() => onChange({ ...data, status: s.value })}
                className="rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors"
                style={{
                  backgroundColor: active
                    ? "var(--adm-accent)"
                    : isPast
                      ? "var(--adm-accent-10)"
                      : "var(--adm-bg)",
                  color: active
                    ? "white"
                    : isPast
                      ? "var(--adm-accent-text)"
                      : "var(--adm-text-muted)",
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* URLs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--adm-text-muted)" }}
          >
            Staging URL
          </label>
          <div className="flex items-center gap-1.5">
            <input
              className="flex-1 rounded-lg border bg-transparent px-3 py-2 text-xs outline-none"
              style={{ borderColor: "var(--adm-border)", color: "var(--adm-text)" }}
              placeholder="https://staging.example.com"
              value={data.staging_url}
              onChange={(e) => onChange({ ...data, staging_url: e.target.value })}
            />
            {data.staging_url && (
              <a
                href={data.staging_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ color: "var(--adm-accent-text)" }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--adm-text-muted)" }}
          >
            Live URL
          </label>
          <div className="flex items-center gap-1.5">
            <input
              className="flex-1 rounded-lg border bg-transparent px-3 py-2 text-xs outline-none"
              style={{ borderColor: "var(--adm-border)", color: "var(--adm-text)" }}
              placeholder="https://www.example.com"
              value={data.live_url}
              onChange={(e) => onChange({ ...data, live_url: e.target.value })}
            />
            {data.live_url && (
              <a
                href={data.live_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ color: "var(--adm-accent-text)" }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Figma links */}
      <div className="flex flex-col gap-2">
        <label
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--adm-text-muted)" }}
        >
          Design Files (Figma)
        </label>
        {data.figma_links.map((link, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-lg border p-2"
            style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)" }}
          >
            <Link2 className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--adm-text-muted)" }} />
            <input
              className="w-28 rounded border bg-transparent px-2 py-1 text-xs outline-none"
              style={{ borderColor: "var(--adm-border)", color: "var(--adm-text)" }}
              placeholder="Label"
              value={link.label}
              onChange={(e) => {
                const next = [...data.figma_links];
                next[i] = { ...next[i], label: e.target.value };
                onChange({ ...data, figma_links: next });
              }}
            />
            <input
              className="flex-1 rounded border bg-transparent px-2 py-1 text-xs outline-none"
              style={{ borderColor: "var(--adm-border)", color: "var(--adm-text)" }}
              placeholder="https://figma.com/..."
              value={link.url}
              onChange={(e) => {
                const next = [...data.figma_links];
                next[i] = { ...next[i], url: e.target.value };
                onChange({ ...data, figma_links: next });
              }}
            />
            {link.url && (
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-6 w-6 items-center justify-center rounded"
                style={{ color: "var(--adm-accent-text)" }}
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <button
              onClick={() =>
                onChange({ ...data, figma_links: data.figma_links.filter((_, j) => j !== i) })
              }
              className="flex h-6 w-6 items-center justify-center rounded text-[var(--adm-text-muted)] hover:bg-[var(--adm-danger-bg)] hover:text-[var(--adm-danger-text)]"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button
          onClick={() =>
            onChange({
              ...data,
              figma_links: [...data.figma_links, { label: "", url: "", notes: "" }],
            })
          }
          className="flex h-7 items-center gap-1 self-start rounded border border-dashed px-2 text-[10px] font-medium"
          style={{ borderColor: "var(--adm-border)", color: "var(--adm-text-muted)" }}
        >
          <Plus className="h-2.5 w-2.5" /> Add Link
        </button>
      </div>

      {/* Copy docs */}
      <div className="flex flex-col gap-2">
        <label
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--adm-text-muted)" }}
        >
          Copy Documents
        </label>
        {data.copy_docs.map((doc, i) => (
          <FileCard
            key={doc.id}
            file={doc}
            onDelete={() =>
              onChange({ ...data, copy_docs: data.copy_docs.filter((_, j) => j !== i) })
            }
            onNotesChange={(notes) => {
              const next = [...data.copy_docs];
              next[i] = { ...next[i], notes };
              onChange({ ...data, copy_docs: next });
            }}
          />
        ))}
 <FileUploadButton
  label="Upload Copy Doc"
  accept=".pdf,.doc,.docx,.txt"
  token={token}
  clientId={clientId}
  section="website"
          onUpload={(f) => onChange({ ...data, copy_docs: [...data.copy_docs, f] })}
        />
      </div>
    </div>
  );
}

/* ================================================================== */
/*  4. BRIEFS SECTION (AI-generated, admin-only)                       */
/* ================================================================== */

const BRIEF_ROLES = [
  {
    key: "designer" as const,
    label: "Designer Brief",
    desc: "Brand identity, visual direction, and design requirements for your designer.",
  },
  {
    key: "photographer" as const,
    label: "Photographer Shot List",
    desc: "What to capture, mood references, wardrobe notes based on brand.",
  },
  {
    key: "developer" as const,
    label: "Developer Spec Sheet",
    desc: "Tech requirements, integrations, CMS needs, and SEO requirements.",
  },
];

function BriefsSection({
  data,
  onChange,
  clientId,
  token,
}: {
  data: {
    designer: BriefEntry | null;
    photographer: BriefEntry | null;
    developer: BriefEntry | null;
  };
  onChange: (d: typeof data) => void;
  clientId: string;
  token: string;
}) {
  const [generating, setGenerating] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleGenerate = useCallback(
    async (role: "designer" | "photographer" | "developer") => {
      setGenerating(role);
      try {
        const res = await fetch(`/api/admin/clients/${clientId}/knowledge/briefs`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role }),
        });
        if (res.ok) {
          const result = await res.json();
          onChange({
            ...data,
            [role]: {
              content: result.brief,
              generated_at: new Date().toISOString(),
            },
          });
          setExpanded(role);
        }
      } finally {
        setGenerating(null);
      }
    },
    [clientId, token, data, onChange]
  );

  const handleCopy = (role: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(role);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2"
        style={{
          backgroundColor: "var(--adm-accent-bg)",
          borderLeft: "3px solid var(--adm-accent)",
        }}
      >
        <Wand2 className="h-3.5 w-3.5" style={{ color: "var(--adm-accent-text)" }} />
        <span className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>
          Briefs are generated from your Knowledge Bank. The more info you add about the client,
          the better the briefs.
        </span>
      </div>

      {BRIEF_ROLES.map((role) => {
        const brief = data[role.key];
        const isGenerating = generating === role.key;
        const isExpanded = expanded === role.key;
        const isCopied = copied === role.key;

        return (
          <div
            key={role.key}
            className="rounded-lg border"
            style={{
              borderColor: brief ? "var(--adm-border)" : "var(--adm-border)",
              backgroundColor: "var(--adm-surface-2)",
            }}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold" style={{ color: "var(--adm-text)" }}>
                  {role.label}
                </span>
                <span className="text-[10px]" style={{ color: "var(--adm-text-muted)" }}>
                  {role.desc}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {brief && (
                  <>
                    <button
                      onClick={() => handleCopy(role.key, brief.content)}
                      className="flex h-7 items-center gap-1 rounded-md px-2 text-[10px] font-medium transition-colors"
                      style={{
                        color: isCopied ? "var(--adm-accent-text)" : "var(--adm-text-muted)",
                      }}
                    >
                      {isCopied ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      {isCopied ? "Copied" : "Copy"}
                    </button>
                    <button
                      onClick={() => setExpanded(isExpanded ? null : role.key)}
                      className="flex h-7 w-7 items-center justify-center rounded-md"
                      style={{ color: "var(--adm-text-muted)" }}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleGenerate(role.key)}
                  disabled={isGenerating}
                  className="flex h-7 items-center gap-1 rounded-md px-2.5 text-[10px] font-medium transition-colors disabled:opacity-50"
                  style={{
                    backgroundColor: brief ? "var(--adm-accent-10)" : "var(--adm-accent)",
                    color: brief ? "var(--adm-accent-text)" : "white",
                  }}
                >
                  {isGenerating ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Wand2 className="h-3 w-3" />
                  )}
                  {brief
                    ? isGenerating
                      ? "Regenerating..."
                      : "Regenerate"
                    : isGenerating
                      ? "Generating..."
                      : "Generate"}
                </button>
              </div>
            </div>

            {/* Brief content */}
            {brief && isExpanded && (
              <div
                className="border-t px-4 py-3"
                style={{ borderColor: "var(--adm-border)" }}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-[10px]" style={{ color: "var(--adm-text-muted)" }}>
                    Generated{" "}
                    {new Date(brief.generated_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div
                  className="whitespace-pre-wrap text-xs leading-relaxed"
                  style={{ color: "var(--adm-text-secondary)" }}
                >
                  {brief.content}
                </div>
              </div>
            )}

            {/* Collapsed brief preview */}
            {brief && !isExpanded && (
              <div
                className="border-t px-4 py-2"
                style={{ borderColor: "var(--adm-border)" }}
              >
                <span
                  className="line-clamp-2 text-[11px] leading-relaxed"
                  style={{ color: "var(--adm-text-muted)" }}
                >
                  {brief.content.slice(0, 200)}...
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ================================================================== */
/*  Shared sub-section accordion                                       */
/* ================================================================== */

function SubSection({
  title,
  icon: Icon,
  open,
  onToggle,
  count,
  children,
}: {
  title: string;
  icon: typeof Palette;
  open: boolean;
  onToggle: () => void;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg border"
      style={{
        borderColor: "var(--adm-border)",
        backgroundColor: "var(--adm-surface-2)",
      }}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-4 py-3"
      >
        <Icon className="h-3.5 w-3.5" style={{ color: "var(--adm-accent-text)" }} />
        <span className="text-xs font-semibold" style={{ color: "var(--adm-text)" }}>
          {title}
        </span>
        <span
          className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
          style={{
            backgroundColor: "var(--adm-accent-10)",
            color: "var(--adm-accent-text)",
          }}
        >
          {count}
        </span>
        <div className="flex-1" />
        {open ? (
          <ChevronUp className="h-3.5 w-3.5" style={{ color: "var(--adm-text-muted)" }} />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" style={{ color: "var(--adm-text-muted)" }} />
        )}
      </button>
      {open && (
        <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: "var(--adm-border)" }}>
          {children}
        </div>
      )}
    </div>
  );
}
