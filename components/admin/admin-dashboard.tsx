"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import type { ClientRow } from "@/lib/types";
import { Plus, LogOut, ExternalLink, Copy, Check, ImageIcon, Activity, Database } from "lucide-react";
import Image from "next/image";
import { ClientEditor } from "@/components/admin/client-editor";
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
  const authFetcher = useCallback(
    (url: string) =>
      fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then((r) => {
        if (!r.ok) throw new Error("Unauthorized");
        return r.json();
      }),
    [token]
  );

  const { data: clients, mutate } = useSWR<ClientRow[]>(
    "/api/admin/clients",
    authFetcher
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showHealth, setShowHealth] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

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
      await mutate();
      setEditingId(newClient.id);
    }
    setCreating(false);
  }, [mutate, token]);

  const handleSave = useCallback(() => {
    mutate();
    setEditingId(null);
  }, [mutate]);

  const handleDelete = useCallback(
    async (id: string) => {
      await fetch(`/api/admin/clients/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      mutate();
      if (editingId === id) setEditingId(null);
    },
    [mutate, editingId, token]
  );

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

  if (editingId) {
    return (
      <ClientEditor
        clientId={editingId}
        token={token}
        onBack={() => {
          setEditingId(null);
          mutate();
        }}
        onSave={handleSave}
        onDelete={() => handleDelete(editingId)}
        theme={theme}
        toggleTheme={toggleTheme}
      />
    );
  }

  return (
    <div className="min-h-dvh" style={{ backgroundColor: "var(--adm-bg)", color: "var(--adm-text)" }}>
      <header style={{ borderBottom: "1px solid var(--adm-border)", backgroundColor: "var(--adm-surface)" }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-base font-semibold">Client Reports</h1>
            <p className="text-xs" style={{ color: "var(--adm-text-muted)" }}>
              {clients?.length ?? 0} client{clients?.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AdminThemeToggle theme={theme} toggle={toggleTheme} />
            <button
              onClick={() => setShowHealth(true)}
              className="flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors"
              style={{ borderColor: "var(--adm-border)", color: "var(--adm-text-secondary)" }}
            >
              <Activity className="h-3.5 w-3.5" />
              Health
            </button>
            <button
              onClick={handleCreateNew}
              disabled={creating}
              className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: "var(--adm-accent)" }}
            >
              <Plus className="h-3.5 w-3.5" />
              New Client
            </button>
            <button
              onClick={onLogout}
              className="flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors"
              style={{ borderColor: "var(--adm-border)", color: "var(--adm-text-secondary)" }}
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {!clients ? (
          <div className="flex justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--adm-accent)", borderTopColor: "transparent" }} />
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <p className="text-sm" style={{ color: "var(--adm-text-muted)" }}>No clients yet</p>
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {clients.map((client) => (
              <div
                key={client.id}
                className="group relative flex flex-col gap-3 rounded-xl border p-4 transition-colors"
                style={{
                  borderColor: "var(--adm-border)",
                  backgroundColor: "var(--adm-surface)",
                  boxShadow: "var(--adm-shadow)",
                }}
              >
                <div
                  className="flex h-14 items-center justify-center rounded-lg p-2"
                  style={{ backgroundColor: "var(--adm-surface-2)" }}
                >
                  {client.logo_url ? (
                    <Image
                      src={client.logo_url}
                      alt={`${client.name} logo`}
                      width={120}
                      height={40}
                      className="h-full w-auto object-contain"
                    />
                  ) : (
                    <div className="flex items-center gap-1.5" style={{ color: "var(--adm-border-hover)" }}>
                      <ImageIcon className="h-4 w-4" />
                      <span className="text-[10px]">No logo</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: client.primary_color }}
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold">{client.name}</h3>
                    <p className="truncate text-xs" style={{ color: "var(--adm-text-muted)" }}>/{client.slug}</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {[
                    client.primary_color,
                    client.secondary_color,
                    client.accent_color,
                    client.background_color,
                    client.text_color,
                  ].map((c, i) => (
                    <div
                      key={i}
                      className="h-4 w-4 rounded border"
                      style={{ backgroundColor: c, borderColor: "var(--adm-border)" }}
                      title={c}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3 text-[10px]" style={{ color: "var(--adm-text-muted)" }}>
                  <span>PIN: {client.pin}</span>
                  <span>Font: {client.font_heading}</span>
                  <span>
                    {client.available_languages.join(", ").toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setEditingId(client.id)}
                    className="flex h-7 flex-1 items-center justify-center rounded-md text-xs font-medium transition-colors"
                    style={{ backgroundColor: "var(--adm-accent-10)", color: "var(--adm-accent-text)" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleCopyLink(client.slug)}
                    className="flex h-7 items-center gap-1 rounded-md px-2.5 text-xs transition-colors"
                    style={{ backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text-secondary)" }}
                    title="Copy report link"
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
                    className="flex h-7 items-center gap-1 rounded-md px-2.5 text-xs transition-colors"
                    style={{ backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text-secondary)" }}
                    title="Open report"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  {getSupabaseTableUrl("sales_entries") && (
                    <a
                      href={getSupabaseTableUrl("sales_entries")!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-7 items-center gap-1 rounded-md px-2.5 text-xs transition-colors"
                      style={{ backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text-secondary)" }}
                      title="Open sales_entries in Supabase"
                    >
                      <Database className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
