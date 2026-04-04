"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function ActivatePage() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  // Token Validation States
  const [validating, setValidating] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [companyName, setCompanyName] = useState("");

  // Form States
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [language, setLanguage] = useState("es");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Validate token on load
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenError(t("activate.invalidToken"));
        setValidating(false);
        return;
      }

      try {
        const res = await fetch(`/api/activate?token=${token}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || t("activate.invalidToken"));
        }

        setUserEmail(data.email);
        setCompanyName(data.companyName);
        if (data.name) setFullName(data.name);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setTokenError(message);
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError(t("activate.passwordMismatch"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          fullName,
          language,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to activate account");
      }

      setSuccess(t("activate.success"));
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px" }}>
          <Loader2 size={32} className="animate-spin" color="#E8590C" style={{ marginBottom: "12px" }} />
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#475569" }}>
            {t("common.loading")}
          </p>
        </div>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <div className="auth-logo-mark">
              <span>F</span>
            </div>
            <span className="auth-logo-name">Fielum</span>
          </div>
          <div className="alert-error" style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "20px" }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <strong style={{ display: "block", marginBottom: "2px" }}>Enlace de invitación no válido</strong>
              {tokenError}
            </div>
          </div>
          <button
            onClick={() => router.push("/login")}
            className="btn-secondary-white"
            style={{ width: "100%", justifyContent: "center", padding: "10px" }}
          >
            Volver a Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-mark">
            <span>F</span>
          </div>
          <span className="auth-logo-name">Fielum</span>
        </div>

        {success ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <CheckCircle size={44} color="#15803D" style={{ margin: "0 auto 12px auto" }} />
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#0F172A", marginBottom: "4px" }}>
              {t("activate.success")}
            </h2>
            <p style={{ fontSize: "13px", color: "#475569" }}>
              Redirigiendo a la pantalla de acceso...
            </p>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A", marginBottom: "4px" }}>
              {t("activate.title")}
            </h1>
            <p style={{ fontSize: "13px", color: "#475569", marginBottom: "20px" }}>
              Bienvenido a <strong style={{ color: "#0F172A" }}>{companyName}</strong>. Completa tu perfil.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {error && (
                <div className="alert-error">{error}</div>
              )}

              <div className="form-group">
                <label className="form-label">Correo electrónico</label>
                <input
                  type="email"
                  readOnly
                  className="form-input"
                  style={{ backgroundColor: "#F8FAFC", color: "#64748B", cursor: "not-allowed" }}
                  value={userEmail}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t("activate.fullName")} *</label>
                <input
                  type="text"
                  required
                  placeholder="Tu nombre completo"
                  className="form-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t("activate.password")} *</label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 8 caracteres"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  {t("activate.confirmPassword")} *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Repite la contraseña"
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t("activate.language")}</label>
                <select
                  className="form-select"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  disabled={loading}
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                  <option value="nl">Nederlands</option>
                </select>
              </div>

              <button
                type="submit"
                className="btn-auth-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {t("activate.activating")}
                  </>
                ) : (
                  t("activate.activateButton")
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
