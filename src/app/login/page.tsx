"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const t = useTranslations();
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError || !data.session) {
        setError(authError?.message || t("auth.invalidCredentials"));
        setLoading(false);
        return;
      }

      // Redirect to root using Next.js router for client-side navigation
      router.push("/");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al iniciar sesión";
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-mark">
            <span>F</span>
          </div>
          <span className="auth-logo-name">Fielum</span>
        </div>

        <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A", marginBottom: "4px" }}>
          {t("auth.signInTitle")}
        </h1>
        <p style={{ fontSize: "13px", color: "#475569", marginBottom: "24px" }}>
          {t("auth.signInSubtitle")}
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {error && (
            <div className="alert-error">
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">{t("auth.emailLabel")}</label>
            <input
              type="email"
              required
              placeholder="name@company.com"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label className="form-label">{t("auth.passwordLabel")}</label>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Please contact your company admin to reset your password.");
                }}
                style={{ fontSize: "11px", fontWeight: 600, color: "#475569", textDecoration: "none" }}
              >
                {t("auth.forgotPassword")}
              </a>
            </div>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn-auth-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {t("auth.signingIn")}
              </>
            ) : (
              t("auth.signIn")
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
