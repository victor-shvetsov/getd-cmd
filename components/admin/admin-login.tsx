"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { AdminThemeToggle } from "./admin-theme-toggle";

interface AdminLoginProps {
  onLogin: (password: string) => Promise<boolean>;
  theme: "light" | "dark";
  toggleTheme: () => void;
}

export function AdminLogin({ onLogin, theme, toggleTheme }: AdminLoginProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);
    const success = await onLogin(password);
    setLoading(false);
    if (!success) {
      setError(true);
      setPassword("");
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center p-4" style={{ backgroundColor: "var(--adm-bg)" }}>
      <div className="absolute right-4 top-4">
        <AdminThemeToggle theme={theme} toggle={toggleTheme} />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: "var(--adm-accent-10)", color: "var(--adm-accent)" }}
          >
            <Lock className="h-5 w-5" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold" style={{ color: "var(--adm-text)" }}>Admin Dashboard</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--adm-text-muted)" }}>Enter your password to continue</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              placeholder="Password"
              className="h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-1"
              style={{
                borderColor: "var(--adm-border)",
                backgroundColor: "var(--adm-surface)",
                color: "var(--adm-text)",
                "--tw-ring-color": "var(--adm-accent)",
              } as React.CSSProperties}
              autoComplete="current-password"
              autoFocus
            />
            {error && (
              <p className="mt-1.5 text-xs" style={{ color: "var(--adm-danger-text)" }}>Invalid password. Try again.</p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || !password}
            className="flex h-10 items-center justify-center rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: "var(--adm-accent)" }}
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              "Sign in"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
