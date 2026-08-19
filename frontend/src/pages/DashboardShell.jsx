import React, { useState } from "react";
import { Navigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import {
  LogOut, User, Stethoscope, ClipboardList, Wallet, Calendar, History, Pill,
  Settings, Users, MessageCircle, BarChart3, Clock, ShieldCheck, Plus, Building2,
} from "lucide-react";
import NotificationBell from "@/components/nirog/NotificationBell";
import OfflineBanner from "@/components/nirog/OfflineBanner";
import LanguageSwitcher from "@/components/nirog/LanguageSwitcher";
import AdminManagerModal from "@/components/nirog/AdminManagerModal";

const roleLabel = { patient: "Patient", doctor: "Doctor", reception: "Receptionist", admin: "Super Admin" };

export default function DashboardShell({ children, roles, title, subtitle, onRefresh }) {
  const { user, loading, logout } = useAuth();
  const loc = useLocation();
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  if (loading)
    return (
      <div className="min-h-screen grid place-items-center bg-bone text-charcoal-soft">
        Loading…
      </div>
    );

  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;

  if (roles && !roles.includes(user.role) && user.role !== "admin") {
    const home = {
      patient: "/app/patient",
      doctor: "/app/doctor",
      reception: "/app/reception",
      admin: "/app/reception",
    }[user.role] || "/";
    return <Navigate to={home} replace />;
  }

  const RoleIcon =
    user.role === "doctor"
      ? Stethoscope
      : user.role === "reception"
      ? ClipboardList
      : user.role === "admin"
      ? ShieldCheck
      : User;

  const navLink = (to, testId, Icon, label) => (
    <Link
      to={to}
      data-testid={testId}
      className={`px-5 py-2 rounded-full text-sm inline-flex items-center gap-1.5 transition-colors ${
        loc.pathname === to
          ? "bg-charcoal text-bone"
          : "text-charcoal-soft hover:text-charcoal"
      }`}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={2} />
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen bg-bone">
      <header className="border-b border-subtle bg-white/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between gap-4">
          <Link to="/" data-testid="dash-logo" className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-charcoal text-bone grid place-items-center font-display text-lg pt-[2px]">न</span>
            <span className="font-display text-xl">NirogPath</span>
          </Link>
          <div className="flex items-center gap-3">
            {user.role === "patient" && (
              <Link
                to="/app/patient/wallet"
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-saffron/10 border border-saffron/20 text-saffron text-sm hover:bg-saffron/20 transition"
                data-testid="wallet-badge"
              >
                <Wallet className="w-3.5 h-3.5" strokeWidth={2} />
                <span className="font-mono">₹{user.wallet_balance ?? 0}</span>
              </Link>
            )}
            {user.role === "admin" && (
              <button
                onClick={() => setIsAdminOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-saffron text-bone text-sm font-semibold hover:bg-charcoal transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Admin Controls</span>
              </button>
            )}
            {(user.role === "patient" || user.role === "doctor") && (
              <NotificationBell />
            )}
            <LanguageSwitcher />
            <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-full border border-subtle">
              <RoleIcon className="w-4 h-4 text-charcoal-soft" strokeWidth={1.8} />
              <span className="text-sm text-charcoal">{user.name}</span>
              <span className="text-xs text-charcoal-soft">· {roleLabel[user.role] || user.role}</span>
            </div>
            <button
              onClick={logout}
              data-testid="logout-btn"
              className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-subtle hover:border-saffron hover:text-saffron transition text-charcoal-soft text-sm font-medium"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.8} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-10 py-10 md:py-14">
        {user.role === "patient" && (
          <div className="mb-8 flex flex-wrap gap-1 p-1 rounded-full bg-white border border-subtle" data-testid="patient-subnav">
            {navLink("/app/patient", "subnav-patient-home", Calendar, "Dashboard")}
            {navLink("/app/patient/queue", "subnav-queue", Clock, "Live Queue")}
            {navLink("/app/patient/book", "subnav-book", Stethoscope, "Book Visit")}
            {navLink("/app/patient/history", "subnav-history", History, "My bookings")}
            {navLink("/app/patient/medicines", "subnav-medicines", Pill, "Medicines")}
            {navLink("/app/patient/family", "subnav-family", Users, "Family")}
            {navLink("/app/patient/settings", "subnav-settings", Settings, "Settings")}
          </div>
        )}

        {user.role === "doctor" && (
          <div className="mb-8 inline-flex gap-1 p-1 rounded-full bg-white border border-subtle" data-testid="doctor-subnav">
            {navLink("/app/doctor", "subnav-doctor-queue", Calendar, "Queue")}
            {navLink("/app/doctor/questions", "subnav-doctor-questions", MessageCircle, "Questions")}
            {navLink("/app/doctor/settings", "subnav-doctor-settings", Settings, "Settings")}
          </div>
        )}

        {(user.role === "reception" || user.role === "admin") && (
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex gap-1 p-1 rounded-full bg-white border border-subtle" data-testid="reception-subnav">
              {navLink("/app/reception", "subnav-reception-overview", ClipboardList, "Overview")}
              {navLink("/app/reception/analytics", "subnav-reception-analytics", BarChart3, "Analytics")}
              {user.role === "admin" && navLink("/app/admin/hospitals", "subnav-admin-hospitals", Building2, "Hospitals")}
            </div>
            {user.role === "admin" && (
              <button
                onClick={() => setIsAdminOpen(true)}
                className="px-5 py-2.5 rounded-full bg-charcoal text-bone hover:bg-saffron text-sm font-semibold inline-flex items-center gap-2 transition"
              >
                <ShieldCheck className="w-4 h-4 text-saffron" />
                <span>Superuser: Add Doctor / Hospital</span>
              </button>
            )}
          </div>
        )}

        {(title || subtitle) && (
          <div className="mb-10">
            {subtitle && <div className="text-xs uppercase tracking-[0.3em] text-saffron font-semibold">{subtitle}</div>}
            {title && <h1 className="mt-3 font-display text-4xl md:text-5xl text-charcoal tracking-tight leading-tight">{title}</h1>}
          </div>
        )}
        {children}
      </main>

      <AdminManagerModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        onRefresh={onRefresh}
      />

      <OfflineBanner />
    </div>
  );
}
