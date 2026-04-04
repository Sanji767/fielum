"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, ShieldAlert, X, Copy, Check, Loader2, Pencil, ArrowLeft, Building2 } from "lucide-react";

interface CompanyData {
  id: string;
  name: string;
  slug: string;
  status: string;
  industry: string;
  createdAt: string;
  users: { email: string }[];
  plan: string;
}

export default function SuperAdminClient({
  initialCompanies,
}: {
  initialCompanies: CompanyData[];
}) {
  const t = useTranslations();
  const [companies, setCompanies] = useState<CompanyData[]>(initialCompanies);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit Company State
  const [editingCompany, setEditingCompany] = useState<CompanyData | null>(null);
  const [editName, setEditName] = useState("");
  const [editIndustry, setEditIndustry] = useState("hvac");
  const [editStatus, setEditStatus] = useState("active");
  const [editPlan, setEditPlan] = useState("starter");

  // Form State
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("hvac");
  const [plan, setPlan] = useState("starter");
  const [ownerEmail, setOwnerEmail] = useState("");
  
  // Result State
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInvitationLink(null);

    try {
      const res = await fetch("/api/superadmin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, industry, plan, ownerEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create company");
      }

      const inviteLink = `${window.location.origin}/activate?token=${data.token}`;
      setInvitationLink(inviteLink);

      // Add to list
      const newCompany: CompanyData = {
        id: data.company.id,
        name: data.company.name,
        slug: data.company.slug,
        status: data.company.status,
        industry: data.company.industry,
        createdAt: new Date(data.company.createdAt).toISOString(),
        users: [{ email: ownerEmail }],
        plan,
      };
      setCompanies([newCompany, ...companies]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (company: CompanyData) => {
    setEditingCompany(company);
    setEditName(company.name);
    setEditIndustry(company.industry);
    setEditStatus(company.status);
    setEditPlan(company.plan);
    setError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/superadmin/companies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingCompany.id,
          name: editName,
          industry: editIndustry,
          status: editStatus,
          plan: editPlan,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update company");
      }

      setCompanies(
        companies.map((c) =>
          c.id === editingCompany.id
            ? {
                ...c,
                name: editName,
                industry: editIndustry,
                status: editStatus,
                plan: editPlan,
              }
            : c
        )
      );

      setEditingCompany(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!invitationLink) return;
    navigator.clipboard.writeText(invitationLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleClose = () => {
    setShowModal(false);
    setInvitationLink(null);
    setName("");
    setOwnerEmail("");
    setError(null);
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#FFFFFF", color: "#0F172A", fontFamily: "'Inter', sans-serif" }}>
      
      {/* ── Top Bar ── */}
      <header style={{ backgroundColor: "#0F172A", color: "#FFFFFF", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "#E8590C", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF" }}>
            <ShieldAlert size={18} />
          </div>
          <div>
            <h1 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#FFFFFF", lineHeight: 1.2 }}>Fielum Super Admin</h1>
            <span style={{ fontSize: "12px", color: "#94A3B8" }}>Tenant Provisioning & Global Control Center</span>
          </div>
        </div>

        <button
          onClick={() => { window.location.href = "/"; }}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "transparent", color: "#FFFFFF", border: "1px solid #334155", padding: "8px 14px", borderRadius: "10px", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}
        >
          <ArrowLeft size={14} /> Volver a la Consola
        </button>
      </header>

      {/* ── Main Viewport ── */}
      <main style={{ maxWidth: "1080px", margin: "0 auto", padding: "40px 24px" }}>
        
        {/* Header Section */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A", margin: 0 }}>Empresas Registradas</h2>
            <p style={{ fontSize: "13.5px", color: "#475569", marginTop: "4px" }}>
              Gestión global de inquilinos (tenants) y generación de invitaciones de propietarios
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="btn-new-job"
          >
            <Plus size={15} /> Dar de Alta Empresa
          </button>
        </div>

        {/* Table Container */}
        <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #E4E1D8", borderRadius: "16px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #E4E1D8" }}>
                <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>Empresa</th>
                <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>Slug</th>
                <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>Sector</th>
                <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>Plan</th>
                <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>Email Owner</th>
                <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>Alta</th>
                <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>Estado</th>
                <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: 700, color: "#475569", textTransform: "uppercase", textAlign: "right" }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <td style={{ padding: "16px 18px", fontSize: "13.5px", fontWeight: 600, color: "#0F172A" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Building2 size={16} color="#64748B" />
                      <span>{c.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "16px 18px", fontSize: "12px", fontFamily: "monospace", color: "#64748B" }}>
                    {c.slug}
                  </td>
                  <td style={{ padding: "16px 18px", fontSize: "13px", color: "#475569", textTransform: "capitalize" }}>
                    {c.industry}
                  </td>
                  <td style={{ padding: "16px 18px", fontSize: "12px", fontFamily: "monospace", fontWeight: 700, color: "#0F172A", textTransform: "uppercase" }}>
                    {c.plan}
                  </td>
                  <td style={{ padding: "16px 18px", fontSize: "13px", color: "#475569" }}>
                    {c.users[0]?.email || "—"}
                  </td>
                  <td style={{ padding: "16px 18px", fontSize: "12.5px", color: "#64748B" }}>
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "16px 18px" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: "9999px",
                        textTransform: "uppercase",
                        backgroundColor: c.status === "active" ? "#DCFCE7" : c.status === "trial" ? "#FEF3C7" : "#FEE2E2",
                        color: c.status === "active" ? "#15803D" : c.status === "trial" ? "#B45309" : "#991B1B",
                      }}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td style={{ padding: "16px 18px", textAlign: "right" }}>
                    <button
                      onClick={() => startEditing(c)}
                      style={{ padding: "6px 12px", backgroundColor: "#FFFFFF", border: "1px solid #E4E1D8", borderRadius: "8px", fontSize: "12px", fontWeight: 600, color: "#0F172A", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                    >
                      <Pencil size={11} /> Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* ── CREATE COMPANY MODAL ── */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <div style={{ padding: "20px", borderBottom: "1px solid #E4E1D8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontWeight: 700, color: "#0F172A", fontSize: "16px" }}>+ Alta de Nueva Empresa</h3>
              <button onClick={handleClose} style={{ background: "transparent", border: "none", color: "#475569", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {error && <div className="alert-error">{error}</div>}

              <div className="form-group">
                <label className="form-label">Nombre de la Empresa *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Servicios Clima S.L."
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading || !!invitationLink}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Sector / Industria</label>
                <select
                  className="form-select"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  disabled={loading || !!invitationLink}
                >
                  <option value="hvac">HVAC / Climatización</option>
                  <option value="plumbing">Plumbing / Fontanería</option>
                  <option value="electrical">Electrical / Electricidad</option>
                  <option value="cleaning">Cleaning / Limpieza</option>
                  <option value="locksmith">Locksmith / Cerrajería</option>
                  <option value="general">General Trades</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Plan de Suscripción</label>
                <select
                  className="form-select"
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  disabled={loading || !!invitationLink}
                >
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="business">Business</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Email del Propietario (Owner) *</label>
                <input
                  type="email"
                  required
                  placeholder="owner@empresa.com"
                  className="form-input"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  disabled={loading || !!invitationLink}
                />
              </div>

              {invitationLink && (
                <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E4E1D8", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                    Enlace de Activación (Válido por 7 días)
                  </span>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <input
                      type="text"
                      readOnly
                      className="form-input"
                      style={{ fontSize: "12px", fontFamily: "monospace", backgroundColor: "#FFFFFF" }}
                      value={invitationLink}
                    />
                    <button
                      type="button"
                      onClick={copyToClipboard}
                      className="btn-new-job"
                      style={{ flexShrink: 0, padding: "8px 12px" }}
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                  <span style={{ fontSize: "11px", color: "#64748B" }}>
                    Copia y envía este enlace al propietario para que configure su cuenta y contraseña.
                  </span>
                </div>
              )}

              <div style={{ paddingTop: "8px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button
                  type="button"
                  onClick={handleClose}
                  style={{ padding: "8px 16px", border: "1px solid #E4E1D8", borderRadius: "12px", color: "#475569", backgroundColor: "transparent", cursor: "pointer", fontSize: "13px" }}
                >
                  {invitationLink ? "Cerrar" : "Cancelar"}
                </button>
                {!invitationLink && (
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-new-job"
                  >
                    {loading ? "Creando..." : "Crear & Generar Invitación"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT COMPANY MODAL ── */}
      {editingCompany && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <div style={{ padding: "20px", borderBottom: "1px solid #E4E1D8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontWeight: 700, color: "#0F172A", fontSize: "16px" }}>Editar Empresa: {editingCompany.name}</h3>
              <button onClick={() => setEditingCompany(null)} style={{ background: "transparent", border: "none", color: "#475569", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {error && <div className="alert-error">{error}</div>}

              <div className="form-group">
                <label className="form-label">Nombre de la Empresa *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Sector / Industria</label>
                <select
                  className="form-select"
                  value={editIndustry}
                  onChange={(e) => setEditIndustry(e.target.value)}
                  disabled={loading}
                >
                  <option value="hvac">HVAC / Climatización</option>
                  <option value="plumbing">Plumbing / Fontanería</option>
                  <option value="electrical">Electrical / Electricidad</option>
                  <option value="cleaning">Cleaning / Limpieza</option>
                  <option value="locksmith">Locksmith / Cerrajería</option>
                  <option value="general">General Trades</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Plan de Suscripción</label>
                <select
                  className="form-select"
                  value={editPlan}
                  onChange={(e) => setEditPlan(e.target.value)}
                  disabled={loading}
                >
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="business">Business</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Estado de Cuenta</label>
                <select
                  className="form-select"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  disabled={loading}
                >
                  <option value="trial">Trial (Prueba)</option>
                  <option value="active">Active (Activa)</option>
                  <option value="suspended">Suspended (Suspendida)</option>
                  <option value="cancelled">Cancelled (Cancelada)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Email Propietario (No editable)</label>
                <input
                  type="email"
                  readOnly
                  className="form-input"
                  style={{ backgroundColor: "#F8FAFC", color: "#64748B", cursor: "not-allowed" }}
                  value={editingCompany.users[0]?.email || "—"}
                />
              </div>

              <div style={{ paddingTop: "8px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setEditingCompany(null)}
                  style={{ padding: "8px 16px", border: "1px solid #E4E1D8", borderRadius: "12px", color: "#475569", backgroundColor: "transparent", cursor: "pointer", fontSize: "13px" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-new-job"
                >
                  {loading ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
