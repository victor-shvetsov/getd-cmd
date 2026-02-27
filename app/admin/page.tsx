"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminLogin } from "@/components/admin/admin-login";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { useAdminTheme } from "@/components/admin/admin-theme-toggle";

const TOKEN_KEY = "admin_token";

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [token, setToken] = useState("");
  const { theme, toggle } = useAdminTheme();

  useEffect(() => {
    const saved = sessionStorage.getItem(TOKEN_KEY);
    if (!saved) {
      setChecking(false);
      return;
    }
    fetch("/api/admin/auth", {
      headers: { Authorization: `Bearer ${saved}` },
    })
      .then((res) => {
        if (res.ok) {
          setToken(saved);
          setAuthenticated(true);
        } else {
          sessionStorage.removeItem(TOKEN_KEY);
        }
      })
      .finally(() => setChecking(false));
  }, []);

  const handleLogin = useCallback(async (password: string): Promise<boolean> => {
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      const data = await res.json();
      setToken(data.token);
      sessionStorage.setItem(TOKEN_KEY, data.token);
      setAuthenticated(true);
      return true;
    }
    return false;
  }, []);

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken("");
    setAuthenticated(false);
  }, []);

  if (checking) {
    return (
      <div className={`admin-${theme}`}>
        <div className="flex min-h-dvh items-center justify-center" style={{ backgroundColor: "var(--adm-bg)" }}>
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--adm-accent)", borderTopColor: "transparent" }} />
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className={`admin-${theme}`}>
        <AdminLogin onLogin={handleLogin} theme={theme} toggleTheme={toggle} />
      </div>
    );
  }

  return (
    <div className={`admin-${theme}`}>
      <AdminDashboard onLogout={handleLogout} token={token} theme={theme} toggleTheme={toggle} />
    </div>
  );
}
