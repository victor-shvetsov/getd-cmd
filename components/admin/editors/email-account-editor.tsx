"use client";

import { useState } from "react";
import { Mail, Check, Eye, EyeOff, ArrowRight } from "lucide-react";

interface EmailAccountEditorProps {
  clientId: string;
  token: string;
  emailAccount: Record<string, unknown> | null;
  onSaved: () => void;
}

/**
 * EmailAccountEditor
 *
 * Configures two separate email boxes stored in clients.email_account JSONB:
 *   - IMAP inbox  (leads@domain) — polled every 5 min for new leads
 *   - SMTP sender (owner@domain) — replies sent FROM here; client picks up conversation
 *
 * Saved as: { imap: { host, port, user, pass }, smtp: { host, port, user, pass } }
 *
 * Backward compat: reads old flat format (imap_host / email_user / email_pass)
 * and migrates to new nested format on next save.
 */
export function EmailAccountEditor({ clientId, token, emailAccount, onSaved }: EmailAccountEditorProps) {
  const ea = emailAccount ?? {};

  // Detect new nested vs old flat format
  const imapObj = (typeof ea.imap === "object" && ea.imap ? ea.imap : {}) as Record<string, unknown>;
  const smtpObj = (typeof ea.smtp === "object" && ea.smtp ? ea.smtp : {}) as Record<string, unknown>;

  // IMAP state — pre-fill from new format, fall back to legacy flat fields
  const [imapUser, setImapUser] = useState((imapObj.user ?? ea.email_user ?? "") as string);
  const [imapPass, setImapPass] = useState((imapObj.pass ?? ea.email_pass ?? "") as string);
  const [imapHost, setImapHost] = useState((imapObj.host ?? ea.imap_host ?? "") as string);
  const [imapPort, setImapPort] = useState(((imapObj.port ?? ea.imap_port ?? 993) as number));
  const [showImapPass, setShowImapPass] = useState(false);

  // SMTP state — pre-fill from new format, fall back to legacy flat fields
  const [smtpUser, setSmtpUser] = useState((smtpObj.user ?? ea.email_user ?? "") as string);
  const [smtpPass, setSmtpPass] = useState((smtpObj.pass ?? ea.email_pass ?? "") as string);
  const [smtpHost, setSmtpHost] = useState((smtpObj.host ?? ea.smtp_host ?? ea.imap_host ?? "") as string);
  const [smtpPort, setSmtpPort] = useState(((smtpObj.port ?? ea.smtp_port ?? 465) as number));
  const [showSmtpPass, setShowSmtpPass] = useState(false);

  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfigured = !!(imapObj.host || ea.imap_host);
  const connectedImapEmail = (imapObj.user ?? ea.email_user ?? "") as string;
  const connectedSmtpEmail = (smtpObj.user ?? ea.email_user ?? "") as string;

  async function handleSave() {
    if (!imapUser.trim() || !imapPass.trim() || !imapHost.trim()) {
      setError("Leads inbox: email, password, and IMAP host are required.");
      return;
    }
    if (!smtpUser.trim() || !smtpPass.trim() || !smtpHost.trim()) {
      setError("Reply sender: email, password, and SMTP host are required.");
      return;
    }
    setBusy(true);
    setError(null);

    const res = await fetch(`/api/admin/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        email_account: {
          imap: { user: imapUser.trim(), pass: imapPass.trim(), host: imapHost.trim(), port: imapPort },
          smtp: { user: smtpUser.trim(), pass: smtpPass.trim(), host: smtpHost.trim(), port: smtpPort },
        },
      }),
    });

    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setError(data.error ?? "Save failed");
      return;
    }
    setSaved(true);
    onSaved();
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleDisconnect() {
    if (!confirm("Remove the email account? Automations using IMAP polling will stop working.")) return;
    setBusy(true);
    await fetch(`/api/admin/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email_account: null }),
    });
    setBusy(false);
    setImapUser(""); setImapPass(""); setImapHost(""); setImapPort(993);
    setSmtpUser(""); setSmtpPass(""); setSmtpHost(""); setSmtpPort(465);
    onSaved();
  }

  return (
    <div
      className="rounded-xl border p-5"
      style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ backgroundColor: isConfigured ? "color-mix(in srgb, var(--adm-accent) 12%, transparent)" : "var(--adm-surface-2)" }}
          >
            <Mail className="h-3.5 w-3.5" style={{ color: isConfigured ? "var(--adm-accent)" : "var(--adm-text-muted)" }} />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: "var(--adm-text)" }}>Email Account</h3>
            <p className="text-[10px]" style={{ color: "var(--adm-text-muted)" }}>
              {isConfigured
                ? `${connectedImapEmail} → ${connectedSmtpEmail}`
                : "Not connected — automations cannot poll this client's inbox"}
            </p>
          </div>
        </div>
        {isConfigured && (
          <span
            className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: "color-mix(in srgb, var(--adm-accent) 12%, transparent)", color: "var(--adm-accent)" }}
          >
            Connected
          </span>
        )}
      </div>

      {/* Flow explanation */}
      <div
        className="mb-4 flex items-center gap-2 rounded-lg p-3 text-[10px]"
        style={{ backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text-secondary)" }}
      >
        <div className="flex flex-col items-center gap-0.5 text-center">
          <span className="font-semibold" style={{ color: "var(--adm-text)" }}>Leads Inbox</span>
          <span className="opacity-70">leads@domain</span>
          <span className="opacity-50">IMAP — receives</span>
        </div>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-40" />
        <div className="flex-1 text-center leading-relaxed opacity-70">
          Cron polls every 5 min → Claude generates reply
        </div>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-40" />
        <div className="flex flex-col items-center gap-0.5 text-center">
          <span className="font-semibold" style={{ color: "var(--adm-text)" }}>Reply Sender</span>
          <span className="opacity-70">owner@domain</span>
          <span className="opacity-50">SMTP — sends</span>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {/* ── IMAP section ── */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--adm-text-muted)" }}>
            Leads Inbox (IMAP)
          </label>
          <p className="text-[10px]" style={{ color: "var(--adm-text-muted)" }}>
            Dedicated inbox where leads land. New emails are polled every 5 minutes.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold" style={{ color: "var(--adm-text-muted)" }}>Email Address</label>
              <input
                type="email"
                value={imapUser}
                onChange={(e) => setImapUser(e.target.value)}
                placeholder="leads@business.com"
                className="w-full rounded-md border px-2.5 py-1.5 text-xs outline-none"
                style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text)" }}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold" style={{ color: "var(--adm-text-muted)" }}>Password</label>
              <div className="relative">
                <input
                  type={showImapPass ? "text" : "password"}
                  value={imapPass}
                  onChange={(e) => setImapPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-md border px-2.5 py-1.5 pr-7 text-xs outline-none"
                  style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text)" }}
                />
                <button type="button" onClick={() => setShowImapPass(!showImapPass)} className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color: "var(--adm-text-muted)" }}>
                  {showImapPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-[1fr_80px] gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold" style={{ color: "var(--adm-text-muted)" }}>IMAP Host</label>
              <input
                type="text"
                value={imapHost}
                onChange={(e) => setImapHost(e.target.value)}
                placeholder="mail.example.com"
                className="w-full rounded-md border px-2.5 py-1.5 text-xs outline-none"
                style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text)" }}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold" style={{ color: "var(--adm-text-muted)" }}>Port</label>
              <input
                type="number"
                value={imapPort}
                onChange={(e) => setImapPort(parseInt(e.target.value, 10) || 993)}
                className="w-full rounded-md border px-2.5 py-1.5 text-xs outline-none text-center"
                style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text)" }}
              />
            </div>
          </div>
          <p className="text-[10px]" style={{ color: "var(--adm-text-muted)" }}>
            Default port: 993 (SSL).
          </p>
        </div>

        {/* Divider with arrow */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1" style={{ backgroundColor: "var(--adm-border)" }} />
          <ArrowRight className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--adm-text-muted)" }} />
          <div className="h-px flex-1" style={{ backgroundColor: "var(--adm-border)" }} />
        </div>

        {/* ── SMTP section ── */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--adm-text-muted)" }}>
            Reply Sender (SMTP)
          </label>
          <p className="text-[10px]" style={{ color: "var(--adm-text-muted)" }}>
            Replies are sent FROM this address. The lead sees it and continues the conversation here — so use the client&apos;s real personal email.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold" style={{ color: "var(--adm-text-muted)" }}>Email Address</label>
              <input
                type="email"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="owner@business.com"
                className="w-full rounded-md border px-2.5 py-1.5 text-xs outline-none"
                style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text)" }}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold" style={{ color: "var(--adm-text-muted)" }}>Password</label>
              <div className="relative">
                <input
                  type={showSmtpPass ? "text" : "password"}
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-md border px-2.5 py-1.5 pr-7 text-xs outline-none"
                  style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text)" }}
                />
                <button type="button" onClick={() => setShowSmtpPass(!showSmtpPass)} className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color: "var(--adm-text-muted)" }}>
                  {showSmtpPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-[1fr_80px] gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold" style={{ color: "var(--adm-text-muted)" }}>SMTP Host</label>
              <input
                type="text"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="mail.example.com"
                className="w-full rounded-md border px-2.5 py-1.5 text-xs outline-none"
                style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text)" }}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold" style={{ color: "var(--adm-text-muted)" }}>Port</label>
              <input
                type="number"
                value={smtpPort}
                onChange={(e) => setSmtpPort(parseInt(e.target.value, 10) || 465)}
                className="w-full rounded-md border px-2.5 py-1.5 text-xs outline-none text-center"
                style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text)" }}
              />
            </div>
          </div>
          <p className="text-[10px]" style={{ color: "var(--adm-text-muted)" }}>
            Default port: 465 (SSL). Usually the same server as IMAP.
          </p>
        </div>

        {/* Error */}
        {error && (
          <p className="rounded-md px-3 py-2 text-[11px]" style={{ backgroundColor: "color-mix(in srgb, red 8%, transparent)", color: "var(--adm-danger-text)" }}>
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          {isConfigured ? (
            <button
              onClick={handleDisconnect}
              disabled={busy}
              className="text-[10px] font-medium transition-colors hover:underline"
              style={{ color: "var(--adm-danger-text)" }}
            >
              Disconnect
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={handleSave}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-md px-4 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50 transition-colors"
            style={{ backgroundColor: saved ? "#22c55e" : "var(--adm-accent)" }}
          >
            <Check className="h-3 w-3" />
            {saved ? "Saved" : "Save Email Account"}
          </button>
        </div>
      </div>
    </div>
  );
}
