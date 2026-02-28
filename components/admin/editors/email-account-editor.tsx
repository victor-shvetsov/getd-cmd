"use client";

import { useState } from "react";
import { Mail, Check, Eye, EyeOff } from "lucide-react";

interface EmailAccountEditorProps {
  clientId: string;
  token: string;
  emailAccount: Record<string, unknown> | null;
  onSaved: () => void;
}

/**
 * EmailAccountEditor
 *
 * Configures the client-level IMAP + SMTP email connection stored in
 * clients.email_account JSONB. Shared across all automations for this client.
 *
 * Credentials are saved via PATCH /api/admin/clients/[id].
 */
export function EmailAccountEditor({ clientId, token, emailAccount, onSaved }: EmailAccountEditorProps) {
  const ea = emailAccount ?? {};

  const [emailUser, setEmailUser] = useState((ea.email_user as string) ?? "");
  const [emailPass, setEmailPass] = useState((ea.email_pass as string) ?? "");
  const [imapHost, setImapHost] = useState((ea.imap_host as string) ?? "");
  const [imapPort, setImapPort] = useState((ea.imap_port as number) ?? 993);
  const [smtpHost, setSmtpHost] = useState((ea.smtp_host as string) ?? "");
  const [smtpPort, setSmtpPort] = useState((ea.smtp_port as number) ?? 465);
  const [showPass, setShowPass] = useState(false);

  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfigured = !!(ea.imap_host && ea.email_user && ea.email_pass);

  async function handleSave() {
    if (!emailUser.trim() || !emailPass.trim() || !imapHost.trim() || !smtpHost.trim()) {
      setError("Email, password, IMAP host, and SMTP host are all required.");
      return;
    }
    setBusy(true);
    setError(null);

    const res = await fetch(`/api/admin/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        email_account: {
          email_user: emailUser.trim(),
          email_pass: emailPass.trim(),
          imap_host: imapHost.trim(),
          imap_port: imapPort,
          smtp_host: smtpHost.trim(),
          smtp_port: smtpPort,
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
    setEmailUser(""); setEmailPass(""); setImapHost(""); setSmtpHost("");
    setImapPort(993); setSmtpPort(465);
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
                ? `Connected: ${ea.email_user as string}`
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

      {/* Info box */}
      <div
        className="mb-4 rounded-lg p-3 text-[10px] leading-relaxed"
        style={{ backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text-secondary)" }}
      >
        <span className="font-semibold" style={{ color: "var(--adm-text)" }}>How it works: </span>
        The cron job polls this inbox every 5 minutes, reads unread emails, generates a reply with Claude, and sends it
        from this same address via SMTP — so the client&apos;s leads see a reply from their real email.
        IMAP and SMTP typically use the same credentials on most mail providers.
      </div>

      {/* Form */}
      <div className="flex flex-col gap-3">
        {/* Email + password */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-[10px] font-semibold" style={{ color: "var(--adm-text-muted)" }}>Email Address</label>
            <input
              type="email"
              value={emailUser}
              onChange={(e) => setEmailUser(e.target.value)}
              placeholder="victor@autoclicks.io"
              className="w-full rounded-md border px-2.5 py-1.5 text-xs outline-none"
              style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text)" }}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold" style={{ color: "var(--adm-text-muted)" }}>Password</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={emailPass}
                onChange={(e) => setEmailPass(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md border px-2.5 py-1.5 pr-7 text-xs outline-none"
                style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text)" }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-2 top-1/2 -translate-y-1/2"
                style={{ color: "var(--adm-text-muted)" }}
              >
                {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* IMAP */}
        <div>
          <label className="mb-1 block text-[10px] font-semibold" style={{ color: "var(--adm-text-muted)" }}>
            IMAP Server <span className="font-normal">(reads incoming email)</span>
          </label>
          <div className="grid grid-cols-[1fr_80px] gap-2">
            <input
              type="text"
              value={imapHost}
              onChange={(e) => setImapHost(e.target.value)}
              placeholder="mail.example.com"
              className="rounded-md border px-2.5 py-1.5 text-xs outline-none"
              style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text)" }}
            />
            <input
              type="number"
              value={imapPort}
              onChange={(e) => setImapPort(parseInt(e.target.value, 10) || 993)}
              className="rounded-md border px-2.5 py-1.5 text-xs outline-none text-center"
              style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text)" }}
            />
          </div>
          <p className="mt-1 text-[10px]" style={{ color: "var(--adm-text-muted)" }}>
            Default port: 993 (SSL). Siteground: gnldm1093.siteground.biz
          </p>
        </div>

        {/* SMTP */}
        <div>
          <label className="mb-1 block text-[10px] font-semibold" style={{ color: "var(--adm-text-muted)" }}>
            SMTP Server <span className="font-normal">(sends replies)</span>
          </label>
          <div className="grid grid-cols-[1fr_80px] gap-2">
            <input
              type="text"
              value={smtpHost}
              onChange={(e) => setSmtpHost(e.target.value)}
              placeholder="mail.example.com"
              className="rounded-md border px-2.5 py-1.5 text-xs outline-none"
              style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text)" }}
            />
            <input
              type="number"
              value={smtpPort}
              onChange={(e) => setSmtpPort(parseInt(e.target.value, 10) || 465)}
              className="rounded-md border px-2.5 py-1.5 text-xs outline-none text-center"
              style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text)" }}
            />
          </div>
          <p className="mt-1 text-[10px]" style={{ color: "var(--adm-text-muted)" }}>
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
