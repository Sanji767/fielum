"use client";

import React, { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  Wrench,
  Smartphone,
  Settings,
  ShieldCheck,
  LogOut,
  X,
  CheckSquare,
  Square,
  RotateCcw,
  Languages,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  UserCheck,
  Copy,
  Check,
} from "lucide-react";

export interface CustomerData {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
  jobCount: number;
}

export interface ChecklistItemData {
  id: string;
  label: string;
  checked: boolean;
}

export interface JobPhotoData {
  id: string;
  url: string;
  caption: string;
}

export interface JobData {
  id: string;
  identifier: string;
  status: "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "normal" | "high" | "urgent";
  serviceType: string;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number;
  address: string;
  notes: string;
  completionNotes: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  technicianId: string | null;
  technicianName: string | null;
  checklist: ChecklistItemData[];
  photos: JobPhotoData[];
  customerSignature: string | null;
  signedByName: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface TechnicianData {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isPending?: boolean;
  activationUrl?: string | null;
  active: boolean;
}

export interface SubscriptionData {
  plan: "starter" | "professional" | "business";
  status: string;
  currentPeriodEnd: string | null;
}

interface FielumConsoleProps {
  initialCustomers: CustomerData[];
  initialJobs: JobData[];
  initialTechnicians: TechnicianData[];
  companyName: string;
  companyIndustry: string;
  userId: string;
  userEmail: string;
  userName: string;
  userRole: string;
  isSuperAdmin: boolean;
  locale: string;
  subscription: SubscriptionData;
}

export default function FielumConsole({
  initialCustomers,
  initialJobs,
  initialTechnicians,
  companyName,
  userEmail,
  userName,
  userRole,
  isSuperAdmin,
  locale,
}: FielumConsoleProps) {
  const router = useRouter();
  const supabase = createClient();
  const [, startTransition] = useTransition();

  const isTechnicianRole = userRole === "TECHNICIAN";
  const isDispatcherRole = userRole === "DISPATCHER";
  const isOwnerOrAdmin = userRole === "OWNER" || userRole === "ADMIN";

  // Navigation: Technicians land directly on "techMode" ("Mis trabajos de hoy")
  const [currentView, setCurrentView] = useState<
    "dashboard" | "schedule" | "customers" | "invoices" | "technicians" | "techMode" | "settings"
  >(isTechnicianRole ? "techMode" : "dashboard");

  // Domain Lists
  const [customers] = useState<CustomerData[]>(initialCustomers);
  const [jobs, setJobs] = useState<JobData[]>(initialJobs);
  const [technicians, setTechnicians] = useState<TechnicianData[]>(initialTechnicians);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTechGroup, setSelectedTechGroup] = useState<string>("all");

  // Modals
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [showCreateTech, setShowCreateTech] = useState(false);
  const [createdTechLink, setCreatedTechLink] = useState<{ name: string; email: string; url: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobData | null>(null);

  // Form States - New Job
  const [newJobCustomerId, setNewJobCustomerId] = useState(customers[0]?.id || "");
  const [newJobTechId, setNewJobTechId] = useState(technicians[0]?.id || "");
  const [newJobServiceType, setNewJobServiceType] = useState("Boiler service");
  const [newJobTime, setNewJobTime] = useState("08:00");
  const [newJobDuration, setNewJobDuration] = useState("90");
  const [newJobAddress, setNewJobAddress] = useState("");
  const [newJobNotes, setNewJobNotes] = useState("");

  // Form States - New Customer
  const [newCustName, setNewCustName] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");

  // Form States - New Tech
  const [newTechName, setNewTechName] = useState("");
  const [newTechEmail, setNewTechEmail] = useState("");
  const [newTechPhone, setNewTechPhone] = useState("");

  // Tech Mode
  const [activeTechJobId, setActiveTechJobId] = useState<string>(
    jobs.find((j) => j.status !== "completed")?.id || jobs[0]?.id || ""
  );
  const activeTechJob = jobs.find((j) => j.id === activeTechJobId) || null;
  const [techCompletionNotes, setTechCompletionNotes] = useState("");
  const [techSignerName, setTechSignerName] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const displayName = userName ? userName.split(" ")[0] : "Mark";
  const formattedDate = "Friday, August 15";

  // Helpers
  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleLocaleChange = (newLocale: string) => {
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    startTransition(() => {
      router.refresh();
    });
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(url);
      setTimeout(() => setCopiedLink(null), 3000);
    } catch {
      prompt("Copia el siguiente enlace:", url);
    }
  };

  // Actions
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: newJobCustomerId,
          technicianId: newJobTechId || null,
          serviceType: newJobServiceType,
          priority: "normal",
          scheduledDate: new Date().toISOString().split("T")[0],
          scheduledTime: newJobTime,
          durationMinutes: parseInt(newJobDuration) || 60,
          address: newJobAddress || "Customer Address",
          notes: newJobNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create job");

      setShowCreateJob(false);
      setNewJobNotes("");
      setNewJobAddress("");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setFormError(message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCustName,
          email: newCustEmail,
          phone: newCustPhone,
          address: newCustAddress,
          city: "Amsterdam",
          notes: "",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create customer");

      setShowCreateCustomer(false);
      setNewCustName("");
      setNewCustEmail("");
      setNewCustPhone("");
      setNewCustAddress("");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setFormError(message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreateTech = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      const res = await fetch("/api/technicians", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTechName,
          email: newTechEmail,
          phone: newTechPhone,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register technician");

      setShowCreateTech(false);
      setNewTechName("");
      setNewTechEmail("");
      setNewTechPhone("");

      if (data.data?.activationUrl) {
        setCreatedTechLink({
          name: data.data.name,
          email: data.data.email,
          url: data.data.activationUrl,
        });
        setTechnicians((prev) => [
          {
            id: data.data.id,
            name: data.data.name,
            email: data.data.email,
            phone: data.data.phone || "",
            role: "TECHNICIAN",
            isPending: true,
            activationUrl: data.data.activationUrl,
            active: true,
          },
          ...prev,
        ]);
      }
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setFormError(message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleChecklist = async (jobId: string, itemId: string, currentVal: boolean) => {
    setJobs((prev) =>
      prev.map((job) => {
        if (job.id !== jobId) return job;
        return {
          ...job,
          checklist: job.checklist.map((item) =>
            item.id === itemId ? { ...item, checked: !currentVal } : item
          ),
        };
      })
    );

    try {
      const targetJob = jobs.find((j) => j.id === jobId);
      if (!targetJob) return;

      const updatedChecklist = targetJob.checklist.map((item) =>
        item.id === itemId ? { ...item, checked: !currentVal } : item
      );

      await fetch(`/api/jobs/${jobId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checklist: updatedChecklist,
          status: targetJob.status,
        }),
      });
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const handleUpdateJobStatus = async (jobId: string, newStatus: JobData["status"]) => {
    setJobs((prev) =>
      prev.map((job) => (job.id === jobId ? { ...job, status: newStatus } : job))
    );

    try {
      await fetch(`/api/jobs/${jobId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0F172A";
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleCompleteTechJob = async () => {
    if (!activeTechJob) return;
    if (!techSignerName.trim()) {
      alert("Por favor ingresa el nombre de quien firma.");
      return;
    }

    setFormLoading(true);
    const canvas = canvasRef.current;
    const signatureDataUrl = canvas ? canvas.toDataURL("image/png") : null;

    try {
      const res = await fetch(`/api/jobs/${activeTechJob.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          checklist: activeTechJob.checklist,
          completionNotes: techCompletionNotes || "Trabajo completado.",
          customerSignature: signatureDataUrl,
          signedByName: techSignerName,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al completar trabajo");

      alert("¡Trabajo completado y registrado!");
      clearSignature();
      setTechSignerName("");
      setTechCompletionNotes("");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error";
      alert(message);
    } finally {
      setFormLoading(false);
    }
  };

  // Filtered lists
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.serviceType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.address.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    const matchesTech = selectedTechGroup === "all" || job.technicianId === selectedTechGroup;

    return matchesSearch && matchesStatus && matchesTech;
  });

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fielum-layout">
      
      {/* ── SIDEBAR ── */}
      <aside className="fielum-sidebar">
        <div>
          {/* Logo */}
          <div className="fielum-logo-container">
            <div className="fielum-logo-squircle">
              <span>F</span>
            </div>
            <span className="fielum-logo-text">Fielum</span>
          </div>

          {/* Navigation Links — Strictly scoped by Role */}
          <nav className="fielum-nav-list">

            {/* Technician view: ONLY Mis Trabajos */}
            {isTechnicianRole ? (
              <button
                onClick={() => setCurrentView("techMode")}
                className={`fielum-nav-item ${currentView === "techMode" ? "active" : ""}`}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Smartphone size={17} color="#E8590C" />
                  <span style={{ color: "#E8590C", fontWeight: 700 }}>Mis Trabajos de Hoy</span>
                </div>
                <span className="fielum-nav-badge">{jobs.filter(j => j.status !== "completed").length}</span>
              </button>
            ) : (
              <>
                {/* Admin / Owner / Dispatcher navigation */}
                <button
                  onClick={() => { setCurrentView("dashboard"); setStatusFilter("all"); }}
                  className={`fielum-nav-item ${currentView === "dashboard" ? "active" : ""}`}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <LayoutDashboard size={17} />
                    <span>Dashboard</span>
                  </div>
                  <span className="fielum-nav-badge">{jobs.length}</span>
                </button>

                <button
                  onClick={() => setCurrentView("schedule")}
                  className={`fielum-nav-item ${currentView === "schedule" ? "active" : ""}`}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Calendar size={17} />
                    <span>Schedule</span>
                  </div>
                  <span className="fielum-nav-badge">{jobs.filter(j => j.status !== "completed").length}</span>
                </button>

                <button
                  onClick={() => setCurrentView("customers")}
                  className={`fielum-nav-item ${currentView === "customers" ? "active" : ""}`}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Users size={17} />
                    <span>Customers</span>
                  </div>
                  <span className="fielum-nav-badge">{customers.length}</span>
                </button>

                {isOwnerOrAdmin && (
                  <button
                    onClick={() => setCurrentView("invoices")}
                    className={`fielum-nav-item ${currentView === "invoices" ? "active" : ""}`}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <FileText size={17} />
                      <span>Invoices</span>
                    </div>
                    <span className="fielum-nav-badge">2</span>
                  </button>
                )}

                <div style={{ height: "8px" }} />

                <button
                  onClick={() => setCurrentView("techMode")}
                  className={`fielum-nav-item ${currentView === "techMode" ? "active" : ""}`}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Smartphone size={17} color={currentView === "techMode" ? "#E8590C" : undefined} />
                    <span style={{ color: currentView === "techMode" ? "#E8590C" : undefined }}>Tech Mode</span>
                  </div>
                </button>

                <button
                  onClick={() => setCurrentView("technicians")}
                  className={`fielum-nav-item ${currentView === "technicians" ? "active" : ""}`}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Wrench size={17} />
                    <span>Technicians</span>
                  </div>
                  <span className="fielum-nav-badge">{technicians.length}</span>
                </button>

                {isOwnerOrAdmin && (
                  <button
                    onClick={() => setCurrentView("settings")}
                    className={`fielum-nav-item ${currentView === "settings" ? "active" : ""}`}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <Settings size={17} />
                      <span>Settings</span>
                    </div>
                  </button>
                )}
              </>
            )}

            {/* Super Admin — ONLY visible if isSuperAdmin === true */}
            {isSuperAdmin && (
              <a
                href="/superadmin"
                className="fielum-nav-item"
                style={{ color: "#7C3AED", marginTop: "4px" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <ShieldCheck size={17} />
                  <span>Super Admin</span>
                </div>
              </a>
            )}
          </nav>
        </div>

        {/* Sidebar Bottom Controls */}
        <div style={{ paddingTop: "14px", borderTop: "1px solid #E4E1D8", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", color: "#475569", padding: "0 4px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Languages size={13} /> Lang:
            </span>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                onClick={() => handleLocaleChange("en")}
                style={{
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "none",
                  backgroundColor: locale === "en" ? "#0F172A" : "transparent",
                  color: locale === "en" ? "#FFFFFF" : "#475569",
                }}
              >
                EN
              </button>
              <button
                onClick={() => handleLocaleChange("es")}
                style={{
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "none",
                  backgroundColor: locale === "es" ? "#0F172A" : "transparent",
                  color: locale === "es" ? "#FFFFFF" : "#475569",
                }}
              >
                ES
              </button>
              <button
                onClick={() => handleLocaleChange("nl")}
                style={{
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "none",
                  backgroundColor: locale === "nl" ? "#0F172A" : "transparent",
                  color: locale === "nl" ? "#FFFFFF" : "#475569",
                }}
              >
                NL
              </button>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
            <div style={{ overflow: "hidden" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A", display: "block", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                {userName || "Mark"} <span style={{ fontSize: "10px", color: "#E8590C", fontWeight: 700 }}>({userRole})</span>
              </span>
              <span style={{ fontSize: "11px", color: "#475569", display: "block", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                {userEmail}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              style={{ background: "transparent", border: "none", color: "#475569", cursor: "pointer", padding: "4px" }}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN VIEWPORT ── */}
      <main className="fielum-main">
        <div className="fielum-container">

          {/* ══════════════════════════════════════════════
              VIEW: DASHBOARD (ADMIN / DISPATCHER ONLY)
             ══════════════════════════════════════════════ */}
          {currentView === "dashboard" && !isTechnicianRole && (
            <div>
              <div className="fielum-header">
                <div>
                  <h1 className="fielum-greeting">
                    Good morning, {displayName}
                  </h1>
                  <p className="fielum-date">
                    {formattedDate}
                  </p>
                </div>

                <div className="btn-group">
                  <button
                    onClick={() => setShowCreateCustomer(true)}
                    className="btn-secondary-white"
                  >
                    <Plus size={14} /> New Customer
                  </button>
                  <button
                    onClick={() => setShowCreateJob(true)}
                    className="btn-new-job"
                  >
                    + New job
                  </button>
                </div>
              </div>

              {/* 3 Metric Cards */}
              <div className="metrics-grid">
                <div
                  onClick={() => setStatusFilter("all")}
                  className="metric-card"
                  style={{ cursor: "pointer", borderColor: statusFilter === "all" ? "#0F172A" : "#E4E1D8" }}
                >
                  <span className="metric-label">Jobs today</span>
                  <span className="metric-value">{jobs.length}</span>
                </div>

                <div
                  onClick={() => setStatusFilter("in_progress")}
                  className="metric-card"
                  style={{ cursor: "pointer", borderColor: statusFilter === "in_progress" ? "#E8590C" : "#E4E1D8" }}
                >
                  <span className="metric-label">In progress</span>
                  <span className="metric-value">{jobs.filter(j => j.status === "in_progress").length}</span>
                </div>

                {isOwnerOrAdmin ? (
                  <div
                    onClick={() => setCurrentView("invoices")}
                    className="metric-card"
                    style={{ cursor: "pointer" }}
                  >
                    <span className="metric-label">Invoiced</span>
                    <span className="metric-value">€1,240</span>
                  </div>
                ) : (
                  <div className="metric-card">
                    <span className="metric-label">Completed</span>
                    <span className="metric-value">{jobs.filter(j => j.status === "completed").length}</span>
                  </div>
                )}
              </div>

              {/* Technician Group Tabs */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px", alignItems: "center", overflowX: "auto" }}>
                <span style={{ fontSize: "12px", color: "#475569", fontWeight: 600, marginRight: "4px" }}>Technician:</span>
                <button
                  onClick={() => setSelectedTechGroup("all")}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "9999px",
                    fontSize: "12px",
                    fontWeight: 500,
                    border: "1px solid #E4E1D8",
                    cursor: "pointer",
                    backgroundColor: selectedTechGroup === "all" ? "#0F172A" : "#FFFFFF",
                    color: selectedTechGroup === "all" ? "#FFFFFF" : "#475569",
                  }}
                >
                  All Team ({jobs.length})
                </button>
                {technicians.map((t) => {
                  const techJobCount = jobs.filter((j) => j.technicianId === t.id).length;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTechGroup(t.id)}
                      style={{
                        padding: "4px 12px",
                        borderRadius: "9999px",
                        fontSize: "12px",
                        fontWeight: 500,
                        border: "1px solid #E4E1D8",
                        cursor: "pointer",
                        backgroundColor: selectedTechGroup === t.id ? "#0F172A" : "#FFFFFF",
                        color: selectedTechGroup === t.id ? "#FFFFFF" : "#475569",
                      }}
                    >
                      {t.name} ({techJobCount})
                    </button>
                  );
                })}
              </div>

              {/* Today's Schedule */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h2 className="schedule-section-title" style={{ margin: 0 }}>Today&apos;s schedule</h2>
                  <span style={{ fontSize: "12px", color: "#475569" }}>{filteredJobs.length} jobs assigned</span>
                </div>

                <div className="schedule-list">
                  {filteredJobs.map((job) => (
                    <div
                      key={job.id}
                      onClick={() => setSelectedJob(job)}
                      className="schedule-item"
                    >
                      <div className="schedule-item-left">
                        <div className="avatar-circle">
                          {getInitials(job.customerName)}
                        </div>
                        <div>
                          <div className="schedule-title">
                            {job.serviceType} — {job.customerName}
                          </div>
                          <div className="schedule-time">
                            {job.scheduledTime} — {job.scheduledTime.startsWith("08") ? "09:30" : job.scheduledTime.startsWith("09") ? "10:00" : "13:00"} • Assigned: <span style={{ fontWeight: 600 }}>{job.technicianName || "Unassigned"}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <span
                          className={
                            job.status === "in_progress"
                              ? "status-in-progress"
                              : job.status === "completed"
                              ? "status-completed"
                              : "status-scheduled"
                          }
                        >
                          {job.status === "in_progress"
                            ? "In progress"
                            : job.status === "completed"
                            ? "Completed"
                            : "Scheduled"}
                        </span>
                        <ChevronRight size={14} color="#94A3B8" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              VIEW: SCHEDULE & JOBS (DISPATCH)
             ══════════════════════════════════════════════ */}
          {currentView === "schedule" && !isTechnicianRole && (
            <div>
              <div className="fielum-header">
                <div>
                  <h1 className="fielum-greeting">Schedule & Operations</h1>
                  <p className="fielum-date">Dispatched jobs by technician</p>
                </div>
                <div className="btn-group">
                  <button
                    onClick={() => setShowCreateJob(true)}
                    className="btn-new-job"
                  >
                    <Plus size={14} /> New Job
                  </button>
                </div>
              </div>

              <div className="filter-bar">
                <div className="search-input-wrapper">
                  <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search job, client or address..."
                    className="search-input"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All statuses</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {technicians.map((tech) => {
                  const techJobs = filteredJobs.filter((j) => j.technicianId === tech.id);
                  if (selectedTechGroup !== "all" && selectedTechGroup !== tech.id) return null;

                  return (
                    <div key={tech.id} style={{ border: "1px solid #E4E1D8", borderRadius: "16px", overflow: "hidden", backgroundColor: "#FFFFFF" }}>
                      <div style={{ padding: "14px 20px", backgroundColor: "#F8FAFC", borderBottom: "1px solid #E4E1D8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <UserCheck size={16} color="#0F172A" />
                          <span style={{ fontWeight: 700, fontSize: "14px", color: "#0F172A" }}>{tech.name}</span>
                          <span style={{ fontSize: "12px", color: "#64748B" }}>({tech.email})</span>
                        </div>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "#0F172A", backgroundColor: "#E2E8F0", padding: "2px 8px", borderRadius: "9999px" }}>
                          {techJobs.length} assigned
                        </span>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column" }}>
                        {techJobs.length === 0 ? (
                          <div style={{ padding: "20px", fontSize: "13px", color: "#64748B", textAlign: "center" }}>No active jobs assigned today.</div>
                        ) : (
                          techJobs.map((job) => (
                            <div
                              key={job.id}
                              onClick={() => setSelectedJob(job)}
                              style={{
                                padding: "16px 20px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                borderBottom: "1px solid #F1F5F9",
                                cursor: "pointer",
                              }}
                            >
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <span style={{ fontWeight: 600, fontSize: "14px", color: "#0F172A" }}>{job.serviceType} — {job.customerName}</span>
                                  <span style={{ fontSize: "11px", color: "#64748B", fontFamily: "monospace" }}>{job.identifier}</span>
                                </div>
                                <span style={{ fontSize: "12.5px", color: "#475569", display: "block", marginTop: "2px" }}>
                                  {job.scheduledTime} • {job.address}
                                </span>
                              </div>

                              <span
                                className={
                                  job.status === "in_progress"
                                    ? "status-in-progress"
                                    : job.status === "completed"
                                    ? "status-completed"
                                    : "status-scheduled"
                                }
                              >
                                {job.status === "in_progress" ? "In progress" : job.status === "completed" ? "Completed" : "Scheduled"}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              VIEW: CUSTOMERS (ADMIN / DISPATCHER ONLY)
             ══════════════════════════════════════════════ */}
          {currentView === "customers" && !isTechnicianRole && (
            <div>
              <div className="fielum-header">
                <div>
                  <h1 className="fielum-greeting">Customers</h1>
                  <p className="fielum-date">Client accounts and service addresses</p>
                </div>
                <button
                  onClick={() => setShowCreateCustomer(true)}
                  className="btn-new-job"
                >
                  <Plus size={14} /> New Customer
                </button>
              </div>

              <div className="filter-bar">
                <div className="search-input-wrapper">
                  <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search customer by name, city or phone..."
                    className="search-input"
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                {filteredCustomers.map((cust) => (
                  <div key={cust.id} style={{ backgroundColor: "#FFFFFF", border: "1px solid #E4E1D8", padding: "20px", borderRadius: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <span style={{ fontWeight: 700, color: "#0F172A", fontSize: "16px" }}>{cust.name}</span>
                        <span style={{ fontSize: "11px", fontWeight: 600, backgroundColor: "#F1F5F9", padding: "2px 8px", borderRadius: "9999px", color: "#475569" }}>
                          {cust.jobCount} jobs
                        </span>
                      </div>
                      <span style={{ fontSize: "13px", color: "#475569", display: "flex", alignItems: "center", gap: "6px", marginTop: "8px" }}>
                        <MapPin size={13} /> {cust.address}, {cust.city}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "8px", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #F1F5F9" }}>
                      {cust.phone && (
                        <a
                          href={`tel:${cust.phone}`}
                          style={{ flex: 1, padding: "6px", backgroundColor: "#F8FAFC", border: "1px solid #E4E1D8", borderRadius: "8px", textAlign: "center", fontSize: "12px", fontWeight: 600, color: "#0F172A", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
                        >
                          <Phone size={12} /> Call
                        </a>
                      )}
                      {cust.email && (
                        <a
                          href={`mailto:${cust.email}`}
                          style={{ flex: 1, padding: "6px", backgroundColor: "#F8FAFC", border: "1px solid #E4E1D8", borderRadius: "8px", textAlign: "center", fontSize: "12px", fontWeight: 600, color: "#0F172A", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
                        >
                          <Mail size={12} /> Email
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              VIEW: INVOICES (OWNER / ADMIN ONLY)
             ══════════════════════════════════════════════ */}
          {currentView === "invoices" && isOwnerOrAdmin && (
            <div>
              <div className="fielum-header">
                <div>
                  <h1 className="fielum-greeting">Invoices & Billing</h1>
                  <p className="fielum-date">Revenue collection and customer receipts</p>
                </div>
              </div>

              <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #E4E1D8", borderRadius: "16px", padding: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #E4E1D8" }}>
                  <div>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A", display: "block" }}>INV-001 — J. Bakker</span>
                    <span style={{ fontSize: "12px", color: "#475569" }}>Boiler service inspection</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "15px", fontWeight: 700, color: "#0F172A", display: "block" }}>€450.00</span>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#15803D" }}>Paid</span>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0" }}>
                  <div>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A", display: "block" }}>INV-002 — R. de Vries</span>
                    <span style={{ fontSize: "12px", color: "#475569" }}>Emergency pipe leak repair</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "15px", fontWeight: 700, color: "#0F172A", display: "block" }}>€790.00</span>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#B45309" }}>Pending</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              VIEW: TECHNICIANS (ADMIN / DISPATCHER ONLY)
             ══════════════════════════════════════════════ */}
          {currentView === "technicians" && !isTechnicianRole && (
            <div>
              <div className="fielum-header">
                <div>
                  <h1 className="fielum-greeting">Technicians</h1>
                  <p className="fielum-date">{technicians.length} field technicians registered</p>
                </div>
                <div className="btn-group">
                  <button
                    onClick={() => setShowCreateTech(true)}
                    className="btn-new-job"
                  >
                    <Plus size={14} /> New Technician
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
                {technicians.map((tech) => (
                  <div key={tech.id} style={{ backgroundColor: "#FFFFFF", border: "1px solid #E4E1D8", padding: "20px", borderRadius: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div className="avatar-circle">
                            {getInitials(tech.name)}
                          </div>
                          <div>
                            <span style={{ fontSize: "14.5px", fontWeight: 700, color: "#0F172A", display: "block" }}>{tech.name}</span>
                            <span style={{ fontSize: "12px", color: "#475569" }}>{tech.email}</span>
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: "9999px",
                            backgroundColor: tech.isPending ? "#FEF3C7" : "#DCFCE7",
                            color: tech.isPending ? "#B45309" : "#15803D",
                          }}
                        >
                          {tech.isPending ? "Pendiente" : "Activo"}
                        </span>
                      </div>

                      {tech.phone && (
                        <span style={{ fontSize: "12px", color: "#64748B", display: "block", marginTop: "8px" }}>
                          Tel: {tech.phone}
                        </span>
                      )}
                    </div>

                    <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #F1F5F9" }}>
                      {tech.activationUrl ? (
                        <button
                          onClick={() => copyToClipboard(tech.activationUrl!)}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            backgroundColor: copiedLink === tech.activationUrl ? "#DCFCE7" : "#F8FAFC",
                            border: "1px solid #E4E1D8",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: copiedLink === tech.activationUrl ? "#15803D" : "#0F172A",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {copiedLink === tech.activationUrl ? (
                            <>
                              <Check size={14} /> ¡Enlace Copiado!
                            </>
                          ) : (
                            <>
                              <Copy size={14} /> Copiar Enlace de Activación
                            </>
                          )}
                        </button>
                      ) : (
                        <div style={{ fontSize: "12px", color: "#15803D", display: "flex", alignItems: "center", gap: "6px", justifyContent: "center", padding: "4px 0" }}>
                          <Check size={14} /> Cuenta activada en Supabase
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              VIEW: TECH FIELD MODE (MIS TRABAJOS DE HOY)
             ══════════════════════════════════════════════ */}
          {currentView === "techMode" && (
            <div style={{ maxWidth: "560px", margin: "0 auto" }}>
              <div className="fielum-header">
                <div>
                  <h1 className="fielum-greeting">{isTechnicianRole ? "Mis Trabajos de Hoy" : "Field Mode"}</h1>
                  <p className="fielum-date">{isTechnicianRole ? `${jobs.length} trabajos asignados a tu nombre` : "Technician on-site execution"}</p>
                </div>
                {!isTechnicianRole && (
                  <button
                    onClick={() => setCurrentView("dashboard")}
                    className="btn-secondary-white"
                  >
                    Exit Mode
                  </button>
                )}
              </div>

              {/* Job Selector Chips */}
              <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "12px", marginBottom: "16px" }}>
                {jobs.length === 0 ? (
                  <div style={{ padding: "20px", fontSize: "13px", color: "#64748B", textAlign: "center", width: "100%" }}>
                    No tienes trabajos pendientes asignados para hoy.
                  </div>
                ) : (
                  jobs.map((j) => (
                    <button
                      key={j.id}
                      onClick={() => setActiveTechJobId(j.id)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "12px",
                        fontSize: "12.5px",
                        whiteSpace: "nowrap",
                        cursor: "pointer",
                        border: "1px solid #E4E1D8",
                        backgroundColor: activeTechJobId === j.id ? "#0F172A" : "#FFFFFF",
                        color: activeTechJobId === j.id ? "#FFFFFF" : "#475569",
                        fontWeight: activeTechJobId === j.id ? 700 : 500,
                      }}
                    >
                      {j.identifier} ({j.customerName.split(" ")[0]})
                    </button>
                  ))
                )}
              </div>

              {activeTechJob && (
                <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #E4E1D8", borderRadius: "16px", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div>
                    <span style={{ fontSize: "16px", fontWeight: 700, color: "#0F172A", display: "block" }}>
                      {activeTechJob.serviceType} — {activeTechJob.customerName}
                    </span>
                    <span style={{ fontSize: "13px", color: "#475569", display: "block", marginTop: "4px" }}>
                      {activeTechJob.address}
                    </span>
                    {activeTechJob.customerPhone && (
                      <a
                        href={`tel:${activeTechJob.customerPhone}`}
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#0F172A", marginTop: "8px", textDecoration: "none", backgroundColor: "#F8FAFC", padding: "4px 10px", borderRadius: "8px", border: "1px solid #E4E1D8" }}
                      >
                        <Phone size={12} /> {activeTechJob.customerPhone}
                      </a>
                    )}
                  </div>

                  {/* Status Toggle Buttons */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <button
                      onClick={() => handleUpdateJobStatus(activeTechJob.id, "in_progress")}
                      style={{
                        padding: "10px",
                        borderRadius: "12px",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                        backgroundColor: activeTechJob.status === "in_progress" ? "#FEF3C7" : "#FFFFFF",
                        color: activeTechJob.status === "in_progress" ? "#B45309" : "#475569",
                        border: `1px solid ${activeTechJob.status === "in_progress" ? "#F59E0B" : "#E4E1D8"}`,
                      }}
                    >
                      In progress
                    </button>
                    <button
                      onClick={() => handleUpdateJobStatus(activeTechJob.id, "completed")}
                      style={{
                        padding: "10px",
                        borderRadius: "12px",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                        backgroundColor: activeTechJob.status === "completed" ? "#DCFCE7" : "#FFFFFF",
                        color: activeTechJob.status === "completed" ? "#15803D" : "#475569",
                        border: `1px solid ${activeTechJob.status === "completed" ? "#22C55E" : "#E4E1D8"}`,
                      }}
                    >
                      Completed
                    </button>
                  </div>

                  {/* Checklist */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A", textTransform: "uppercase" }}>Checklist de Trabajo</span>
                    {activeTechJob.checklist.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleToggleChecklist(activeTechJob.id, item.id, item.checked)}
                        style={{
                          padding: "12px",
                          backgroundColor: "#F8FAFC",
                          border: "1px solid #E4E1D8",
                          borderRadius: "12px",
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          cursor: "pointer",
                          fontSize: "13px",
                        }}
                      >
                        {item.checked ? <CheckSquare size={16} color="#15803D" /> : <Square size={16} color="#94A3B8" />}
                        <span style={{ textDecoration: item.checked ? "line-through" : "none", color: item.checked ? "#64748B" : "#0F172A" }}>{item.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Notes */}
                  <div>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Notas de Resolución del Técnico</span>
                    <textarea
                      rows={2}
                      value={techCompletionNotes}
                      onChange={(e) => setTechCompletionNotes(e.target.value)}
                      placeholder="Indica las reparaciones o materiales empleados..."
                      style={{
                        width: "100%",
                        padding: "12px",
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #E4E1D8",
                        borderRadius: "12px",
                        fontSize: "13px",
                        color: "#0F172A",
                        outline: "none",
                      }}
                    />
                  </div>

                  {/* Signature */}
                  <div style={{ borderTop: "1px solid #E4E1D8", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A", textTransform: "uppercase" }}>Firma Digital del Cliente</span>
                      <button onClick={clearSignature} style={{ background: "transparent", border: "none", color: "#475569", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                        <RotateCcw size={12} /> Borrar Firma
                      </button>
                    </div>

                    <input
                      type="text"
                      value={techSignerName}
                      onChange={(e) => setTechSignerName(e.target.value)}
                      placeholder="Nombre completo de quien firma en obra..."
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #E4E1D8",
                        borderRadius: "12px",
                        fontSize: "13px",
                        color: "#0F172A",
                        outline: "none",
                      }}
                    />

                    <div style={{ border: "1px solid #E4E1D8", backgroundColor: "#F8FAFC", borderRadius: "12px", overflow: "hidden", display: "flex", justifyContent: "center" }}>
                      <canvas
                        ref={canvasRef}
                        width={450}
                        height={120}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        style={{ width: "100%", cursor: "crosshair" }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleCompleteTechJob}
                    disabled={formLoading}
                    className="btn-new-job"
                    style={{ justifyContent: "center", padding: "12px" }}
                  >
                    {formLoading ? "Guardando..." : "Guardar & Finalizar Trabajo"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════
              VIEW: SETTINGS (OWNER / ADMIN ONLY)
             ══════════════════════════════════════════════ */}
          {currentView === "settings" && isOwnerOrAdmin && (
            <div>
              <div className="fielum-header">
                <div>
                  <h1 className="fielum-greeting">Settings</h1>
                  <p className="fielum-date">Company account configuration</p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #E4E1D8", padding: "24px", borderRadius: "16px" }}>
                  <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#0F172A", marginBottom: "16px" }}>Company Profile</h2>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div>
                      <span style={{ fontSize: "12px", color: "#64748B", display: "block" }}>Company Name</span>
                      <span style={{ fontSize: "14.5px", color: "#0F172A", fontWeight: 600 }}>{companyName}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: "12px", color: "#64748B", display: "block" }}>Administrator Account</span>
                      <span style={{ fontSize: "14.5px", color: "#0F172A", fontWeight: 600 }}>{userEmail}</span>
                    </div>
                  </div>
                </div>

                <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #E4E1D8", padding: "24px", borderRadius: "16px" }}>
                  <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#0F172A", marginBottom: "8px" }}>Account Status</h2>
                  <p style={{ fontSize: "13.5px", color: "#475569", marginBottom: "16px" }}>
                    Piloto en Producción — Acceso completo sin límite de técnicos durante la fase de prueba.
                  </p>

                  <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: "#DCFCE7", color: "#15803D", padding: "6px 14px", borderRadius: "9999px", fontSize: "13px", fontWeight: 600 }}>
                    <Check size={14} /> Acceso Ilimitado Activo
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ── MODAL: CREATE TECHNICIAN ── */}
      {showCreateTech && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <div style={{ padding: "20px", borderBottom: "1px solid #E4E1D8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontWeight: 700, color: "#0F172A", fontSize: "16px" }}>+ New Technician</h3>
              <button onClick={() => setShowCreateTech(false)} style={{ background: "transparent", border: "none", color: "#475569", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTech} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {formError && <div style={{ padding: "12px", backgroundColor: "#FEF2F2", color: "#991B1B", border: "1px solid #FEE2E2", borderRadius: "12px", fontSize: "13px" }}>{formError}</div>}

              <div>
                <label style={{ fontSize: "13px", color: "#0F172A", fontWeight: 600, display: "block", marginBottom: "6px" }}>Technician Name *</label>
                <input
                  type="text"
                  required
                  value={newTechName}
                  onChange={(e) => setNewTechName(e.target.value)}
                  placeholder="e.g. Robin Jansen"
                  style={{ width: "100%", padding: "10px 12px", backgroundColor: "#FFFFFF", border: "1px solid #E4E1D8", borderRadius: "12px", color: "#0F172A", outline: "none", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "13px", color: "#0F172A", fontWeight: 600, display: "block", marginBottom: "6px" }}>Email Address *</label>
                <input
                  type="email"
                  required
                  value={newTechEmail}
                  onChange={(e) => setNewTechEmail(e.target.value)}
                  placeholder="tech@fielum.com"
                  style={{ width: "100%", padding: "10px 12px", backgroundColor: "#FFFFFF", border: "1px solid #E4E1D8", borderRadius: "12px", color: "#0F172A", outline: "none", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "13px", color: "#0F172A", fontWeight: 600, display: "block", marginBottom: "6px" }}>Phone Number</label>
                <input
                  type="text"
                  value={newTechPhone}
                  onChange={(e) => setNewTechPhone(e.target.value)}
                  placeholder="+31 6 12345678"
                  style={{ width: "100%", padding: "10px 12px", backgroundColor: "#FFFFFF", border: "1px solid #E4E1D8", borderRadius: "12px", color: "#0F172A", outline: "none", fontSize: "13px" }}
                />
              </div>

              <div style={{ paddingTop: "8px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateTech(false)}
                  style={{ padding: "8px 16px", border: "1px solid #E4E1D8", borderRadius: "12px", color: "#475569", backgroundColor: "transparent", cursor: "pointer", fontSize: "13px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="btn-new-job"
                >
                  {formLoading ? "Registering..." : "Generate Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATED TECH INVITATION SUCCESS ── */}
      {createdTechLink && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <div style={{ padding: "20px", borderBottom: "1px solid #E4E1D8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Check size={18} color="#15803D" />
                <h3 style={{ fontWeight: 700, color: "#0F172A", fontSize: "16px" }}>Technician Registered</h3>
              </div>
              <button onClick={() => setCreatedTechLink(null)} style={{ background: "transparent", border: "none", color: "#475569", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <p style={{ fontSize: "13.5px", color: "#475569" }}>
                An invitation token has been created for <strong style={{ color: "#0F172A" }}>{createdTechLink.name}</strong> ({createdTechLink.email}).
              </p>

              <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E4E1D8", borderRadius: "12px", padding: "14px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                  Activation Link (Valid for 7 days)
                </span>
                <input
                  readOnly
                  value={createdTechLink.url}
                  style={{ width: "100%", padding: "8px 10px", backgroundColor: "#FFFFFF", border: "1px solid #E4E1D8", borderRadius: "8px", fontSize: "12px", color: "#0F172A", fontFamily: "monospace", outline: "none" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button
                  onClick={() => copyToClipboard(createdTechLink.url)}
                  className="btn-new-job"
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  {copiedLink === createdTechLink.url ? (
                    <>
                      <Check size={15} /> ¡Enlace Copiado!
                    </>
                  ) : (
                    <>
                      <Copy size={15} /> Copiar Enlace
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE JOB ── */}
      {showCreateJob && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <div style={{ padding: "20px", borderBottom: "1px solid #E4E1D8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontWeight: 700, color: "#0F172A", fontSize: "16px" }}>+ New Job</h3>
              <button onClick={() => setShowCreateJob(false)} style={{ background: "transparent", border: "none", color: "#475569", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateJob} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {formError && <div style={{ padding: "12px", backgroundColor: "#FEF2F2", color: "#991B1B", border: "1px solid #FEE2E2", borderRadius: "12px", fontSize: "13px" }}>{formError}</div>}

              <div>
                <label style={{ fontSize: "13px", color: "#0F172A", fontWeight: 600, display: "block", marginBottom: "6px" }}>Customer *</label>
                <select
                  required
                  value={newJobCustomerId}
                  onChange={(e) => setNewJobCustomerId(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", backgroundColor: "#FFFFFF", border: "1px solid #E4E1D8", borderRadius: "12px", color: "#0F172A", outline: "none", fontSize: "13px" }}
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "13px", color: "#0F172A", fontWeight: 600, display: "block", marginBottom: "6px" }}>Technician</label>
                  <select
                    value={newJobTechId}
                    onChange={(e) => setNewJobTechId(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", backgroundColor: "#FFFFFF", border: "1px solid #E4E1D8", borderRadius: "12px", color: "#0F172A", outline: "none", fontSize: "13px" }}
                  >
                    <option value="">Unassigned</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "13px", color: "#0F172A", fontWeight: 600, display: "block", marginBottom: "6px" }}>Service Type</label>
                  <input
                    type="text"
                    required
                    value={newJobServiceType}
                    onChange={(e) => setNewJobServiceType(e.target.value)}
                    placeholder="e.g. Boiler service"
                    style={{ width: "100%", padding: "10px 12px", backgroundColor: "#FFFFFF", border: "1px solid #E4E1D8", borderRadius: "12px", color: "#0F172A", outline: "none", fontSize: "13px" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "13px", color: "#0F172A", fontWeight: 600, display: "block", marginBottom: "6px" }}>Time</label>
                  <input
                    type="time"
                    value={newJobTime}
                    onChange={(e) => setNewJobTime(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", backgroundColor: "#FFFFFF", border: "1px solid #E4E1D8", borderRadius: "12px", color: "#0F172A", outline: "none", fontSize: "13px" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "13px", color: "#0F172A", fontWeight: 600, display: "block", marginBottom: "6px" }}>Duration (min)</label>
                  <input
                    type="number"
                    value={newJobDuration}
                    onChange={(e) => setNewJobDuration(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", backgroundColor: "#FFFFFF", border: "1px solid #E4E1D8", borderRadius: "12px", color: "#0F172A", outline: "none", fontSize: "13px" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "13px", color: "#0F172A", fontWeight: 600, display: "block", marginBottom: "6px" }}>Address</label>
                <input
                  type="text"
                  value={newJobAddress}
                  onChange={(e) => setNewJobAddress(e.target.value)}
                  placeholder="Street and number"
                  style={{ width: "100%", padding: "10px 12px", backgroundColor: "#FFFFFF", border: "1px solid #E4E1D8", borderRadius: "12px", color: "#0F172A", outline: "none", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "13px", color: "#0F172A", fontWeight: 600, display: "block", marginBottom: "6px" }}>Notes</label>
                <textarea
                  rows={2}
                  value={newJobNotes}
                  onChange={(e) => setNewJobNotes(e.target.value)}
                  placeholder="Instructions for technician..."
                  style={{ width: "100%", padding: "10px 12px", backgroundColor: "#FFFFFF", border: "1px solid #E4E1D8", borderRadius: "12px", color: "#0F172A", outline: "none", fontSize: "13px" }}
                />
              </div>

              <div style={{ paddingTop: "8px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateJob(false)}
                  style={{ padding: "8px 16px", border: "1px solid #E4E1D8", borderRadius: "12px", color: "#475569", backgroundColor: "transparent", cursor: "pointer", fontSize: "13px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="btn-new-job"
                >
                  {formLoading ? "Creating..." : "Create Job"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE CUSTOMER ── */}
      {showCreateCustomer && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <div style={{ padding: "20px", borderBottom: "1px solid #E4E1D8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontWeight: 700, color: "#0F172A", fontSize: "16px" }}>+ New Customer</h3>
              <button onClick={() => setShowCreateCustomer(false)} style={{ background: "transparent", border: "none", color: "#475569", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ fontSize: "13px", color: "#0F172A", fontWeight: 600, display: "block", marginBottom: "6px" }}>Customer Name *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. J. Bakker"
                  style={{ width: "100%", padding: "10px 12px", backgroundColor: "#FFFFFF", border: "1px solid #E4E1D8", borderRadius: "12px", color: "#0F172A", outline: "none", fontSize: "13px" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "13px", color: "#0F172A", fontWeight: 600, display: "block", marginBottom: "6px" }}>Phone</label>
                  <input
                    type="text"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    placeholder="+31 20 555 1234"
                    style={{ width: "100%", padding: "10px 12px", backgroundColor: "#FFFFFF", border: "1px solid #E4E1D8", borderRadius: "12px", color: "#0F172A", outline: "none", fontSize: "13px" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "13px", color: "#0F172A", fontWeight: 600, display: "block", marginBottom: "6px" }}>Email</label>
                  <input
                    type="email"
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                    placeholder="client@mail.com"
                    style={{ width: "100%", padding: "10px 12px", backgroundColor: "#FFFFFF", border: "1px solid #E4E1D8", borderRadius: "12px", color: "#0F172A", outline: "none", fontSize: "13px" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "13px", color: "#0F172A", fontWeight: 600, display: "block", marginBottom: "6px" }}>Address</label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="Street and number"
                  style={{ width: "100%", padding: "10px 12px", backgroundColor: "#FFFFFF", border: "1px solid #E4E1D8", borderRadius: "12px", color: "#0F172A", outline: "none", fontSize: "13px" }}
                />
              </div>

              <div style={{ paddingTop: "8px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateCustomer(false)}
                  style={{ padding: "8px 16px", border: "1px solid #E4E1D8", borderRadius: "12px", color: "#475569", backgroundColor: "transparent", cursor: "pointer", fontSize: "13px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="btn-new-job"
                >
                  {formLoading ? "Saving..." : "Create Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: JOB DETAIL ── */}
      {selectedJob && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <div style={{ padding: "20px", borderBottom: "1px solid #E4E1D8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontWeight: 700, color: "#0F172A", fontSize: "16px" }}>
                  {selectedJob.serviceType} — {selectedJob.customerName}
                </h3>
                <span style={{ fontSize: "12px", color: "#475569", display: "block", marginTop: "2px" }}>{selectedJob.scheduledTime} • {selectedJob.address}</span>
              </div>
              <button onClick={() => setSelectedJob(null)} style={{ background: "transparent", border: "none", color: "#475569", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <button
                  onClick={() => handleUpdateJobStatus(selectedJob.id, "in_progress")}
                  style={{ padding: "10px", backgroundColor: "#FEF3C7", color: "#B45309", border: "1px solid #F59E0B", borderRadius: "12px", fontSize: "13px", cursor: "pointer", fontWeight: 600 }}
                >
                  Mark In Progress
                </button>
                <button
                  onClick={() => handleUpdateJobStatus(selectedJob.id, "completed")}
                  style={{ padding: "10px", backgroundColor: "#DCFCE7", color: "#15803D", border: "1px solid #22C55E", borderRadius: "12px", fontSize: "13px", cursor: "pointer", fontWeight: 600 }}
                >
                  Mark Completed
                </button>
              </div>

              {selectedJob.checklist.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingTop: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A", textTransform: "uppercase" }}>Checklist Tasks</span>
                  {selectedJob.checklist.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleToggleChecklist(selectedJob.id, item.id, item.checked)}
                      style={{
                        padding: "10px 12px",
                        backgroundColor: "#F8FAFC",
                        border: "1px solid #E4E1D8",
                        borderRadius: "12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        cursor: "pointer",
                        fontSize: "13px",
                      }}
                    >
                      {item.checked ? <CheckSquare size={16} color="#15803D" /> : <Square size={16} color="#94A3B8" />}
                      <span style={{ textDecoration: item.checked ? "line-through" : "none", color: item.checked ? "#64748B" : "#0F172A" }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {selectedJob.notes && (
                <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E4E1D8", padding: "12px", borderRadius: "12px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Instructions</span>
                  <p style={{ fontSize: "13px", color: "#0F172A" }}>{selectedJob.notes}</p>
                </div>
              )}
            </div>

            <div style={{ padding: "16px 20px", backgroundColor: "#F8FAFC", borderTop: "1px solid #E4E1D8", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setSelectedJob(null)}
                style={{ padding: "6px 14px", border: "1px solid #E4E1D8", borderRadius: "12px", color: "#475569", backgroundColor: "#FFFFFF", cursor: "pointer", fontSize: "13px", fontWeight: 500 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
