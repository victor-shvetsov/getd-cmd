"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import type { ClientRow } from "@/lib/types";
import {
  Plus,
  LogOut,
  ExternalLink,
  Copy,
  Check,
  ImageIcon,
  Activity,
  Database,
  Search,
  Workflow,
} from "lucide-react";
import Image from "next/image";
import { HealthCheck } from "@/components/admin/health-check";
import { AdminThemeToggle } from "./admin-theme-toggle";

function getSupabaseTableUrl(table: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  const match = base.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!match) return null;
  return `https://supabase.com/dashboard/project/${match[1]}/editor/${table}`;
}

interface AdminDashboardProps {
  onLogout: () => void;
  token: string;
  theme: "light" | "dark";
  toggleTheme: () => void;
}

export function AdminDashboard({ onLogout, token, theme, toggleTheme }: AdminDashboardProps) {
  const router = useRouter();
  const authFetcher = useCallback(
    (url: string) =>
      fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then((r) => {
        if (!r.ok) throw new Error("Unauthorized");
        return r.json();
      }),
    [token]
  );

  const { data: clients, mutate } = useSWR<ClientRow[]>("/api/admin/clients", authFetcher);
  const [showHealth, setShowHealth] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    if (!searchQuery.trim()) return clients;
    const q = searchQuery.toLowerCase();
    return clients.filter(
      (c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)
    );
  }, [clients, searchQuery]);

  const handleCopyLink = useCallback((slug: string) => {
    const url = `${window.location.origin}/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  }, []);

  const handleCreateNew = useCallback(async () => {
    setCreating(true);
    const res = await fetch("/api/admin/clients", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        slug: `client-${Date.now().toString(36)}`,
        name: "New Client",
        pin: "000000",
      }),
    });
    if (res.ok) {
      const newClient = await res.json();
      router.push(`/admin/${newClient.id}/general`);
    }
    setCreating(false);
  }, [router, token]);

  if (showHealth) {
    return (
      <HealthCheck
        token={token}
        onBack={() => setShowHealth(false)}
        theme={theme}
        toggleTheme={toggleTheme}
      />
    );
  }

  const sbUrl = getSupabaseTableUrl("sales_entries");

  return (
    <div className="min-h-dvh" style={{ backgroundColor: "var(--adm-bg)", color: "var(--adm-text)" }}>
      {/* -- Header -- */}
      <header
        className="border-b"
        style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Client Reports</h1>
            <p className="mt-0.5 text-xs" style={{ color: "var(--adm-text-muted)" }}>
              {clients?.length ?? 0} project{clients?.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AdminThemeToggle theme={theme} toggle={toggleTheme} />
            <button
              onClick={() => router.push("/admin/map")}
              className="flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors hover:opacity-80"
              style={{ borderColor: "var(--adm-border)", color: "var(--adm-text-secondary)" }}
            >
              <Workflow className="h-3.5 w-3.5" />
              Map
            </button>
            <button
              onClick={() => setShowHealth(true)}
              className="flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors hover:opacity-80"
              style={{ borderColor: "var(--adm-border)", color: "var(--adm-text-secondary)" }}
            >
              <Activity className="h-3.5 w-3.5" />
              Health
            </button>
            <button
              onClick={handleCreateNew}
              disabled={creating}
              className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: "var(--adm-accent)" }}
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </button>
            <button
              onClick={onLogout}
              className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:opacity-80"
              style={{ borderColor: "var(--adm-border)", color: "var(--adm-text-muted)" }}
              title="Logout"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-6">
        {/* -- Search bar -- */}
        {clients && clients.length > 0 && (
          <div className="mb-5 flex items-center gap-2">
            <div
              className="flex flex-1 items-center gap-2 rounded-lg border px-3 py-2"
              style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}
            >
              <Search className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--adm-text-muted)" }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search clients..."
                className="w-full bg-transparent text-sm outline-none"
                style={{ color: "var(--adm-text)" }}
              />
            </div>
          </div>
        )}

        {!clients ? (
          <div className="flex justify-center py-12">
            <div
              className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
              style={{ borderColor: "var(--adm-accent)", borderTopColor: "transparent" }}
            />
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <p className="text-sm" style={{ color: "var(--adm-text-muted)" }}>
              No clients yet
            </p>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: "var(--adm-accent)" }}
            >
              <Plus className="h-4 w-4" />
              Create your first client
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredClients.map((client) => (
              <button
                key={client.id}
                onClick={() => router.push(`/admin/${client.id}/general`)}
                className="group relative flex flex-col overflow-hidden rounded-xl border text-left transition-all hover:shadow-md"
                style={{
                  borderColor: "var(--adm-border)",
                  backgroundColor: "var(--adm-surface)",
                }}
              >
                {/* Color accent strip */}
                <div className="h-1 w-full" style={{ backgroundColor: client.primary_color }} />

                {/* Logo area */}
                <div
                  className="flex h-20 items-center justify-center px-6"
                  style={{ backgroundColor: "var(--adm-surface-2)" }}
                >
                  {client.logo_url ? (
                    <Image
                      src={client.logo_url}
                      alt={`${client.name} logo`}
                      width={160}
                      height={56}
                      className="h-12 w-auto object-contain"
                    />
                  ) : (
                    <div
                      className="flex items-center gap-1.5"
                      style={{ color: "var(--adm-text-placeholder)" }}
                    >
                      <ImageIcon className="h-5 w-5" />
                      <span className="text-xs">No logo</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col gap-2.5 p-4">
                  <div>
                    <h3 className="text-sm font-bold">{client.name}</h3>
                    <p className="text-[11px]" style={{ color: "var(--adm-text-muted)" }}>
                      /{client.slug}
                    </p>
                  </div>

                  {/* Color swatches */}
                  <div className="flex gap-1">
                    {[
                      client.primary_color,
                      client.secondary_color,
                      client.accent_color,
                      client.background_color,
                      client.text_color,
                    ].map((c, i) => (
                      <div
                        key={i}
                        className="h-3.5 w-3.5 rounded-sm border"
                        style={{
                          backgroundColor: c,
                          borderColor: "var(--adm-border)",
                        }}
                      />
                    ))}
                  </div>

                  {/* Meta */}
                  <div
                    className="flex items-center gap-3 text-[10px]"
                    style={{ color: "var(--adm-text-muted)" }}
                  >
                    <span>{client.font_heading}</span>
                    <span>{client.available_languages.join(", ").toUpperCase()}</span>
                  </div>
                </div>

                {/* Action bar */}
                <div
                  className="flex items-center gap-1.5 border-t px-4 py-2.5"
                  style={{ borderColor: "var(--adm-border)" }}
                >
                  <span
                    className="flex-1 text-[11px] font-semibold"
                    style={{ color: "var(--adm-accent-text)" }}
                  >
                    Edit
                  </span>
                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyLink(client.slug);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-[var(--adm-surface-2)]"
                      style={{ color: "var(--adm-text-muted)" }}
                      title="Copy link"
                    >
                      {copiedSlug === client.slug ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                    <a
                      href={`/${client.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-[var(--adm-surface-2)]"
                      style={{ color: "var(--adm-text-muted)" }}
                      title="Open report"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    {sbUrl && (
                      <a
                        href={sbUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-[var(--adm-surface-2)]"
                        style={{ color: "var(--adm-text-muted)" }}
                        title="Supabase"
                      >
                        <Database className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
