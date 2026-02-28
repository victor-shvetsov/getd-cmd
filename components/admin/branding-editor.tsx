"use client";

import { useCallback, useEffect, useState } from "react";
import type { ClientRow } from "@/lib/types";
import { Save, Upload, X, Check, Pipette } from "lucide-react";
import Image from "next/image";

/* ── Types ── */
interface BrandColor {
  hex: string;
  label: string;
}
interface BrandLogo {
  id: string;
  name: string;
  file_url: string;
  file_type: string;
}
interface BrandFont {
  family: string;
  label: string;
  url?: string;
}
interface BrandKit {
  colors?: BrandColor[];
  logos?: BrandLogo[];
  fonts?: BrandFont[];
}

const GOOGLE_FONTS = [
  "Inter", "Onest", "Figtree", "Manrope", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins",
  "Raleway", "Nunito", "Playfair Display", "Merriweather", "DM Sans",
  "Space Grotesk", "Plus Jakarta Sans", "Outfit", "Unbounded", "IBM Plex Sans",
];

const RADIUS_PRESETS = [
  { value: "0rem", label: "Sharp", icon: "sharp" },
  { value: "0.25rem", label: "Subtle", icon: "subtle" },
  { value: "0.5rem", label: "Soft", icon: "soft" },
  { value: "0.75rem", label: "Rounded", icon: "rounded" },
  { value: "1rem", label: "Round", icon: "round" },
  { value: "1.5rem", label: "Pill", icon: "pill" },
  { value: "9999px", label: "Full", icon: "full" },
];

const COLOR_ROLES = [
  { key: "primary", label: "Primary", desc: "Main brand accent, buttons, active states" },
  { key: "secondary", label: "Secondary", desc: "Supporting color, secondary buttons" },
  { key: "accent", label: "Accent", desc: "Highlights, badges, call-to-action" },
  { key: "background", label: "Background", desc: "Page background" },
  { key: "header", label: "Header", desc: "Top bar / header background" },
  { key: "text", label: "Text", desc: "Main body text color" },
  { key: "nav", label: "Nav Bar BG", desc: "Bottom navigation background" },
  { key: "navText", label: "Nav Bar Text", desc: "Icons & labels on the nav bar" },
] as const;

interface BrandingEditorProps {
  client: ClientRow;
  token: string;
  onSave: () => void;
}

export function BrandingEditor({ client, token, onSave }: BrandingEditorProps) {
  // State for each branding field
  const [primary, setPrimary] = useState(client.primary_color);
  const [secondary, setSecondary] = useState(client.secondary_color);
  const [accent, setAccent] = useState(client.accent_color);
  const [bg, setBg] = useState(client.background_color);
  const [headerColor, setHeaderColor] = useState(client.header_color ?? client.background_color);
  const [text, setText] = useState(client.text_color);
  const [nav, setNav] = useState(client.nav_color ?? client.text_color ?? "#1a1a1a");
  const [navText, setNavText] = useState(client.nav_text_color ?? "#ffffff");
  const [fontHeading, setFontHeading] = useState(client.font_heading);
  const [fontBody, setFontBody] = useState(client.font_body);
  const [radius, setRadius] = useState(client.border_radius);
  const [logoUrl, setLogoUrl] = useState(client.logo_url ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Brand kit from assets
  const [brandKit, setBrandKit] = useState<BrandKit>({});
  const [loadingKit, setLoadingKit] = useState(true);

  // Fetch brand kit from assets tab
  useEffect(() => {
    async function fetchBrandKit() {
      try {
        const res = await fetch(`/api/admin/clients/${client.id}/tabs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const tabs = await res.json();
          const assetsTab = tabs.find?.(
            (t: { tab_key: string }) => t.tab_key === "assets"
          );
          if (assetsTab?.data?.asset_library?.brand_kit) {
            setBrandKit(assetsTab.data.asset_library.brand_kit);
          }
        }
      } catch {
        // Silent fail - brand kit is optional
      } finally {
        setLoadingKit(false);
      }
    }
    fetchBrandKit();
  }, [client.id, token]);

  const colorMap: Record<string, { get: string; set: (v: string) => void }> = {
    primary: { get: primary, set: setPrimary },
    secondary: { get: secondary, set: setSecondary },
    accent: { get: accent, set: setAccent },
    background: { get: bg, set: setBg },
    header: { get: headerColor, set: setHeaderColor },
    text: { get: text, set: setText },
    nav: { get: nav, set: setNav },
    navText: { get: navText, set: setNavText },
  };

  const handleLogoUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (res.ok) {
        const { url } = await res.json();
        setLogoUrl(url);
      }
    } catch (e) {
      console.error("Upload failed", e);
    } finally {
      setUploading(false);
    }
  }, [token]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    await fetch(`/api/admin/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        primary_color: primary,
        secondary_color: secondary,
        accent_color: accent,
        background_color: bg,
        header_color: headerColor,
        text_color: text,
        nav_color: nav,
        nav_text_color: navText,
        font_heading: fontHeading,
        font_body: fontBody,
        border_radius: radius,
        logo_url: logoUrl || null,
      }),
    });
    setSaving(false);
    onSave();
  }, [client.id, primary, secondary, accent, bg, headerColor, text, nav, navText, fontHeading, fontBody, radius, logoUrl, onSave, token]);

  const brandColors = brandKit.colors ?? [];
  const brandLogos = brandKit.logos ?? [];
  const brandFonts = brandKit.fonts ?? [];
  const allFonts = [
    ...brandFonts.map((f) => f.family),
    ...GOOGLE_FONTS.filter((f) => !brandFonts.some((bf) => bf.family === f)),
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* ─── Section: Logo ─── */}
      <Section title="Logo" desc="Pick from brand assets or upload a new logo">
        {/* Brand kit logos */}
        {brandLogos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {brandLogos.map((logo) => {
              const isSelected = logoUrl === logo.file_url;
              return (
                <button
                  key={logo.id}
                  onClick={() => setLogoUrl(logo.file_url)}
                  className="relative flex h-16 w-28 items-center justify-center overflow-hidden rounded-lg border-2 p-2 transition-all"
                  style={{
                    borderColor: isSelected ? "var(--adm-accent)" : "var(--adm-border)",
                    backgroundColor: isSelected ? "var(--adm-accent-bg)" : "var(--adm-surface)",
                  }}
                  title={logo.name}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logo.file_url}
                    alt={logo.name}
                    className="h-full w-full object-contain"
                  />
                  {isSelected && (
                    <div
                      className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full"
                      style={{ backgroundColor: "var(--adm-accent)" }}
                    >
                      <Check className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Current logo preview if set but not from brand kit */}
        {logoUrl && !brandLogos.some((l) => l.file_url === logoUrl) && (
          <div className="flex items-center gap-3">
            <div
              className="flex h-14 w-28 items-center justify-center rounded-lg border p-2"
              style={{ borderColor: "var(--adm-accent)", backgroundColor: "var(--adm-surface)" }}
            >
              <Image src={logoUrl} alt="Logo" width={100} height={40} className="h-full w-full object-contain" />
            </div>
            <button onClick={() => setLogoUrl("")} className="text-xs" style={{ color: "var(--adm-text-muted)" }}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Upload fallback */}
        <label
          className="group flex cursor-pointer items-center gap-3 rounded-lg border border-dashed px-4 py-2.5 transition-colors"
          style={{ borderColor: "var(--adm-border)" }}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: "var(--adm-surface-2)" }}>
            {uploading ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--adm-accent)", borderTopColor: "transparent" }} />
            ) : (
              <Upload className="h-3.5 w-3.5" style={{ color: "var(--adm-text-muted)" }} />
            )}
          </div>
          <span className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>
            {uploading ? "Uploading..." : "Upload new logo"}
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleLogoUpload(f);
              e.target.value = "";
            }}
          />
        </label>

        {!showUrlInput ? (
          <button onClick={() => setShowUrlInput(true)} className="self-start text-[10px] underline decoration-dotted" style={{ color: "var(--adm-text-muted)" }}>
            Or enter URL manually
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="h-8 flex-1 rounded-lg border px-3 text-xs outline-none"
              style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)", color: "var(--adm-text)" }}
            />
            <button onClick={() => setShowUrlInput(false)} className="text-[10px]" style={{ color: "var(--adm-text-secondary)" }}>Done</button>
          </div>
        )}
      </Section>

      {/* ─── Section: Colors ─── */}
      <Section
        title="Colors"
        desc={
          brandColors.length > 0
            ? `Pick from ${brandColors.length} brand colors or enter custom hex`
            : "Enter hex colors for the client dashboard"
        }
      >
        {loadingKit ? (
          <div className="flex items-center gap-2 py-2 text-xs" style={{ color: "var(--adm-text-muted)" }}>
            <div className="h-3 w-3 animate-spin rounded-full border border-t-transparent" style={{ borderColor: "var(--adm-accent)", borderTopColor: "transparent" }} />
            Loading brand kit...
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {COLOR_ROLES.map((role) => {
              const current = colorMap[role.key];
              return (
                <div key={role.key} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-semibold" style={{ color: "var(--adm-text)" }}>{role.label}</label>
                    <span className="text-[10px]" style={{ color: "var(--adm-text-muted)" }}>{role.desc}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Brand color swatches */}
                    {brandColors.map((bc, i) => {
                      const isSelected = current.get.toLowerCase() === bc.hex.toLowerCase();
                      return (
                        <button
                          key={i}
                          onClick={() => current.set(bc.hex)}
                          className="group relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 transition-all"
                          style={{
                            backgroundColor: bc.hex,
                            borderColor: isSelected ? "var(--adm-accent)" : "transparent",
                            outline: isSelected ? "2px solid var(--adm-accent)" : "none",
                            outlineOffset: "1px",
                          }}
                          title={`${bc.label}: ${bc.hex}`}
                        >
                          {isSelected && (
                            <Check className="h-3 w-3" style={{ color: isLightColor(bc.hex) ? "#000" : "#fff" }} />
                          )}
                          <span className="pointer-events-none absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] opacity-0 transition-opacity group-hover:opacity-70">
                            {bc.label}
                          </span>
                        </button>
                      );
                    })}

                    {/* Separator if we have brand colors */}
                    {brandColors.length > 0 && (
                      <div className="mx-1 h-6 w-px" style={{ backgroundColor: "var(--adm-border)" }} />
                    )}

                    {/* Custom color picker */}
                    <div className="relative flex items-center">
                      <Pipette className="absolute left-2 h-3 w-3 pointer-events-none" style={{ color: "var(--adm-text-muted)" }} />
                      <input
                        type="color"
                        value={current.get}
                        onChange={(e) => current.set(e.target.value)}
                        className="h-8 w-8 cursor-pointer rounded-lg border bg-transparent"
                        style={{ borderColor: "var(--adm-border)" }}
                      />
                    </div>

                    {/* Hex input */}
                    <input
                      type="text"
                      value={current.get}
                      onChange={(e) => current.set(e.target.value)}
                      className="h-8 w-24 rounded-md border px-2 text-xs font-mono outline-none"
                      style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)", color: "var(--adm-text)" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* ─── Section: Typography ─── */}
      <Section title="Typography" desc="Map dashboard fonts from brand kit or Google Fonts">
        <div className="grid gap-4 sm:grid-cols-2">
          <FontPicker
            label="Heading Font"
            value={fontHeading}
            onChange={setFontHeading}
            brandFonts={brandFonts}
            allFonts={allFonts}
          />
          <FontPicker
            label="Body Font"
            value={fontBody}
            onChange={setFontBody}
            brandFonts={brandFonts}
            allFonts={allFonts}
          />
        </div>
      </Section>

      {/* ─── Section: Corner Shapes ─── */}
      <Section title="Corner Shape" desc="Controls border radius on all cards and UI elements">
        <div className="flex flex-wrap gap-2">
          {RADIUS_PRESETS.map((r) => {
            const isSelected = radius === r.value;
            return (
              <button
                key={r.value}
                onClick={() => setRadius(r.value)}
                className="flex flex-col items-center gap-1.5 rounded-lg border-2 px-3 py-2.5 transition-all"
                style={{
                  borderColor: isSelected ? "var(--adm-accent)" : "var(--adm-border)",
                  backgroundColor: isSelected ? "var(--adm-accent-bg)" : "transparent",
                }}
              >
                {/* Mini card preview with actual radius */}
                <div
                  className="h-8 w-12 border-2"
                  style={{
                    borderRadius: r.value,
                    borderColor: isSelected ? "var(--adm-accent)" : "var(--adm-text-muted)",
                    backgroundColor: isSelected ? "var(--adm-accent)15" : "transparent",
                  }}
                />
                <span
                  className="text-[10px] font-medium"
                  style={{ color: isSelected ? "var(--adm-accent-text)" : "var(--adm-text-secondary)" }}
                >
                  {r.label}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* ─── Live Preview ─── */}
      <Section title="Live Preview" desc="How the client dashboard will look">
        <div
          className="overflow-hidden border"
          style={{ borderColor: "var(--adm-border)", borderRadius: "12px" }}
        >
          {/* Mini header */}
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{ backgroundColor: headerColor }}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo" className="h-6 w-auto object-contain" style={{ maxWidth: "80px" }} />
            ) : (
              <div className="h-6 w-6 rounded" style={{ backgroundColor: primary }} />
            )}
            <span
              className="text-sm font-semibold"
              style={{ fontFamily: `'${fontHeading}', sans-serif`, color: isLightColor(headerColor) ? text : "#ffffff" }}
            >
              {client.name}
            </span>
          </div>

          {/* Mini body */}
          <div className="flex flex-col gap-3 p-4" style={{ backgroundColor: bg }}>
            {/* Sample card */}
            <div
              className="border p-3"
              style={{
                borderRadius: radius,
                borderColor: `${text}15`,
                backgroundColor: `${bg === "#ffffff" ? "#f8f9fa" : adjustBrightness(bg, 5)}`,
              }}
            >
              <h3
                className="mb-1 text-sm font-bold"
                style={{ fontFamily: `'${fontHeading}', sans-serif`, color: text }}
              >
                Sample Section Title
              </h3>
              <p
                className="mb-2 text-xs leading-relaxed"
                style={{ fontFamily: `'${fontBody}', sans-serif`, color: text, opacity: 0.6 }}
              >
                This shows how body text will appear with your selected fonts and colors.
              </p>
              <div className="flex gap-1.5">
                <span className="px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: primary, borderRadius: radius }}>Primary</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: secondary, borderRadius: radius }}>Secondary</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: accent, borderRadius: radius }}>Accent</span>
              </div>
            </div>

            {/* Sample stat mini-cards */}
            <div className="grid grid-cols-3 gap-2">
              {["4,980", "85", "13"].map((val, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center py-2"
                  style={{
                    borderRadius: radius,
                    backgroundColor: `${bg === "#ffffff" ? "#f8f9fa" : adjustBrightness(bg, 5)}`,
                  }}
                >
                  <span className="text-sm font-bold" style={{ color: text, fontFamily: `'${fontHeading}', sans-serif` }}>{val}</span>
                  <span className="text-[8px] uppercase opacity-40" style={{ color: text }}>Label</span>
                </div>
              ))}
            </div>

            {/* Mini bottom nav */}
            <div
              className="flex justify-around rounded-b-lg border-t px-2 py-2"
              style={{ backgroundColor: nav, borderColor: `${nav}dd` }}
            >
              {["Brief", "Channels", "Demand"].map((tab, i) => (
                <span
                  key={tab}
                  className="text-[9px] font-medium"
                  style={{ color: i === 0 ? navText : `${navText}66` }}
                >
                  {tab}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ─── Save ─── */}
      <div className="flex justify-end pt-2" style={{ borderTop: "1px solid var(--adm-border)" }}>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex h-9 items-center gap-1.5 rounded-lg px-5 text-xs font-medium text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: "var(--adm-accent)" }}
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? "Saving..." : "Save Branding"}
        </button>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col gap-3 rounded-lg border p-4"
      style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}
    >
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--adm-text)" }}>{title}</h3>
        {desc && <p className="mt-0.5 text-[10px]" style={{ color: "var(--adm-text-muted)" }}>{desc}</p>}
      </div>
      {children}
    </div>
  );
}

function FontPicker({
  label,
  value,
  onChange,
  brandFonts,
  allFonts,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  brandFonts: BrandFont[];
  allFonts: string[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[11px] font-semibold" style={{ color: "var(--adm-text)" }}>{label}</label>

      {/* Brand font quick picks */}
      {brandFonts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {brandFonts.map((bf) => {
            const isSelected = value === bf.family;
            return (
              <button
                key={bf.family}
                onClick={() => onChange(bf.family)}
                className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-all"
                style={{
                  borderColor: isSelected ? "var(--adm-accent)" : "var(--adm-border)",
                  backgroundColor: isSelected ? "var(--adm-accent-bg)" : "transparent",
                  color: isSelected ? "var(--adm-accent-text)" : "var(--adm-text-secondary)",
                }}
              >
                {isSelected && <Check className="h-3 w-3" />}
                <span style={{ fontFamily: `'${bf.family}', sans-serif` }}>{bf.family}</span>
                <span className="text-[9px] opacity-50">({bf.label})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Full dropdown fallback */}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-lg border px-3 text-xs outline-none"
        style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-bg)", color: "var(--adm-text)" }}
      >
        {allFonts.map((f) => (
          <option key={f} value={f}>{f}</option>
        ))}
      </select>
    </div>
  );
}

/* ── Utility functions ── */

function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  if (c.length < 6) return true;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

function adjustBrightness(hex: string, percent: number): string {
  const c = hex.replace("#", "");
  if (c.length < 6) return hex;
  const r = Math.min(255, parseInt(c.slice(0, 2), 16) + percent);
  const g = Math.min(255, parseInt(c.slice(2, 4), 16) + percent);
  const b = Math.min(255, parseInt(c.slice(4, 6), 16) + percent);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
