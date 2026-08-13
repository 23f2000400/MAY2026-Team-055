// ROUTE TO ADD IN App.js:
// import PatientSettings from "@/pages/PatientSettings";
// <Route path="/app/patient/settings" element={<PatientSettings />} />

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import DashboardShell from "@/pages/DashboardShell";
import { useAuth } from "@/lib/AuthContext";
import api, { formatApiError } from "@/lib/api";
import {
  User,
  Lock,
  Wallet,
  Settings,
  Eye,
  EyeOff,
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";

// ─── Tiny Toast ──────────────────────────────────────────────────────────────
function Toast({ message, type = "success", onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const styles =
    type === "error"
      ? "bg-red-50 border-red-200 text-red-700"
      : "bg-sage/10 border-sage/30 text-sage-700";

  return (
    <div
      className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-medium max-w-sm ${styles}`}
    >
      {type === "error" ? (
        <AlertTriangle className="w-4 h-4 shrink-0" />
      ) : (
        <CheckCircle2 className="w-4 h-4 shrink-0" />
      )}
      <span className="text-sm">{message}</span>
      <button onClick={onDismiss} className="ml-auto pl-2 opacity-60 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Password strength meter ─────────────────────────────────────────────────
function strengthScore(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLORS = [
  "",
  "bg-red-400",
  "bg-yellow-400",
  "bg-lime-400",
  "bg-green-500",
];

function PasswordStrengthMeter({ password }) {
  const score = strengthScore(password);
  return (
    <div data-testid="pw-strength" className="mt-2">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= score ? STRENGTH_COLORS[score] : "bg-charcoal/10"
            }`}
          />
        ))}
      </div>
      {password && (
        <p className="mt-1 text-xs text-charcoal-soft">{STRENGTH_LABELS[score]}</p>
      )}
    </div>
  );
}

// ─── Shared input style ───────────────────────────────────────────────────────
const inputCls =
  "w-full px-4 py-3 rounded-2xl border border-subtle bg-white text-charcoal placeholder:text-charcoal-soft/50 focus:outline-none focus:border-saffron/50 focus:ring-2 focus:ring-saffron/10 transition text-sm";

const labelCls = "block text-xs uppercase tracking-widest text-charcoal-soft mb-2 font-semibold";

// ─── Tab: Profile ────────────────────────────────────────────────────────────
function ProfileTab({ user, setToast, refreshUser }) {
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    dob: user?.dob || "",
    gender: user?.gender || "",
    preferred_language: user?.preferred_language || "English",
  });
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const handleField = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side size guard
    if (file.size > 1 * 1024 * 1024) {
      setToast({ message: "Image must be under 1 MB", type: "error" });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data } = await api.post("/uploads/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAvatarPreview(data.url);
      setForm((f) => ({ ...f, avatar_url: data.url }));
      setToast({ message: "Avatar uploaded", type: "success" });
    } catch (err) {
      setToast({ message: formatApiError(err), type: "error" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch("/auth/me", form);
      await refreshUser();
      setToast({ message: "Profile updated successfully", type: "success" });
    } catch (err) {
      setToast({ message: formatApiError(err), type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Resolve avatar src (prepend backend base if relative)
  const avatarSrc = avatarPreview
    ? avatarPreview.startsWith("/")
      ? `${process.env.REACT_APP_BACKEND_URL}${avatarPreview}`
      : avatarPreview
    : null;

  return (
    <form onSubmit={handleSave} className="space-y-8 max-w-xl">
      {/* Avatar upload */}
      <div className="flex items-center gap-6">
        <div
          data-testid="profile-avatar-upload"
          onClick={() => !uploading && fileRef.current?.click()}
          className="relative w-20 h-20 rounded-full border-2 border-dashed border-subtle bg-white cursor-pointer hover:border-saffron/50 transition group flex-shrink-0"
        >
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt="Avatar"
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <div className="w-full h-full grid place-items-center">
              <User className="w-8 h-8 text-charcoal-soft/50" strokeWidth={1.5} />
            </div>
          )}
          {uploading ? (
            <div className="absolute inset-0 rounded-full bg-white/80 grid place-items-center">
              <Loader2 className="w-5 h-5 animate-spin text-saffron" />
            </div>
          ) : (
            <div className="absolute inset-0 rounded-full bg-charcoal/0 group-hover:bg-charcoal/10 transition grid place-items-center">
              <Upload className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition" />
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleAvatarChange}
        />
        <div>
          <p className="text-sm font-semibold text-charcoal">Profile photo</p>
          <p className="text-xs text-charcoal-soft mt-0.5">JPG, PNG or WebP · max 1 MB</p>
          <button
            type="button"
            onClick={() => !uploading && fileRef.current?.click()}
            className="mt-2 text-xs text-saffron hover:underline"
          >
            {uploading ? "Uploading…" : "Change photo"}
          </button>
        </div>
      </div>

      {/* Name */}
      <div>
        <label className={labelCls}>Full name</label>
        <input
          data-testid="profile-name-input"
          name="name"
          type="text"
          value={form.name}
          onChange={handleField}
          placeholder="Your full name"
          className={inputCls}
        />
      </div>

      {/* Phone */}
      <div>
        <label className={labelCls}>Phone number</label>
        <input
          data-testid="profile-phone-input"
          name="phone"
          type="text"
          value={form.phone}
          onChange={handleField}
          placeholder="+91 98765 43210"
          className={inputCls}
        />
      </div>

      {/* Date of birth */}
      <div>
        <label className={labelCls}>Date of birth</label>
        <input
          data-testid="profile-dob-input"
          name="dob"
          type="date"
          value={form.dob}
          onChange={handleField}
          className={inputCls}
        />
      </div>

      {/* Gender */}
      <div>
        <label className={labelCls}>Gender</label>
        <select
          data-testid="profile-gender-select"
          name="gender"
          value={form.gender}
          onChange={handleField}
          className={inputCls}
        >
          <option value="">Prefer not to say</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
          <option value="prefer not to say">Prefer not to say</option>
        </select>
      </div>

      {/* Language preference */}
      <div>
        <label className={labelCls}>Language preference</label>
        <select
          name="preferred_language"
          value={form.preferred_language}
          onChange={handleField}
          className={inputCls}
        >
          <option value="English">English</option>
          <option value="Hindi">Hindi</option>
          <option value="Tamil">Tamil</option>
          <option value="Kannada">Kannada</option>
          <option value="Marathi">Marathi</option>
        </select>
      </div>

      <button
        data-testid="profile-save-btn"
        type="submit"
        disabled={saving || uploading}
        className="px-8 py-3 rounded-full bg-saffron text-white text-sm font-semibold hover:bg-saffron/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

// ─── Tab: Security ────────────────────────────────────────────────────────────
function SecurityTab({ setToast, logout, navigate }) {
  const [pwForm, setPwForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handlePwField = (e) =>
    setPwForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm_password) {
      setToast({ message: "New passwords do not match", type: "error" });
      return;
    }
    if (pwForm.new_password.length < 6) {
      setToast({ message: "New password must be at least 6 characters", type: "error" });
      return;
    }
    setPwSaving(true);
    try {
      await api.post("/auth/change-password", {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      setToast({ message: "Password changed successfully", type: "success" });
      setPwForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      setToast({ message: formatApiError(err), type: "error" });
    } finally {
      setPwSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    if (!window.confirm("This will permanently delete your account. Are you absolutely sure?")) return;
    setDeleting(true);
    try {
      await api.post("/auth/delete-account");
      logout();
      navigate("/");
    } catch (err) {
      setToast({ message: formatApiError(err), type: "error" });
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-xl space-y-12">
      {/* Change password */}
      <section>
        <h2 className="font-display text-2xl text-charcoal mb-6">Change password</h2>
        <form onSubmit={handleChangePassword} className="space-y-5">
          {/* Current password */}
          <div>
            <label className={labelCls}>Current password</label>
            <div className="relative">
              <input
                data-testid="pw-current"
                name="current_password"
                type={showCurrent ? "text" : "password"}
                value={pwForm.current_password}
                onChange={handlePwField}
                placeholder="Enter current password"
                className={`${inputCls} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-soft hover:text-charcoal transition"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label className={labelCls}>New password</label>
            <div className="relative">
              <input
                data-testid="pw-new"
                name="new_password"
                type={showNew ? "text" : "password"}
                value={pwForm.new_password}
                onChange={handlePwField}
                placeholder="At least 6 characters"
                className={`${inputCls} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-soft hover:text-charcoal transition"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <PasswordStrengthMeter password={pwForm.new_password} />
          </div>

          {/* Confirm password */}
          <div>
            <label className={labelCls}>Confirm new password</label>
            <div className="relative">
              <input
                data-testid="pw-confirm"
                name="confirm_password"
                type={showConfirm ? "text" : "password"}
                value={pwForm.confirm_password}
                onChange={handlePwField}
                placeholder="Repeat new password"
                className={`${inputCls} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-soft hover:text-charcoal transition"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {pwForm.confirm_password && pwForm.new_password !== pwForm.confirm_password && (
              <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
            )}
          </div>

          <button
            data-testid="change-pw-submit"
            type="submit"
            disabled={pwSaving}
            className="px-8 py-3 rounded-full bg-saffron text-white text-sm font-semibold hover:bg-saffron/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pwSaving ? "Updating…" : "Update password"}
          </button>
        </form>
      </section>

      {/* Divider */}
      <div className="border-t border-subtle" />

      {/* Delete account */}
      <section>
        <h2 className="font-display text-2xl text-charcoal mb-2">Delete account</h2>
        <p className="text-sm text-charcoal-soft mb-6">
          This action is permanent and cannot be undone. Your PII will be anonymised, but booking records are kept for hospital compliance.
        </p>
        <div className="rounded-2xl border-2 border-red-200 bg-red-50/50 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Danger zone</p>
              <p className="text-xs text-red-600 mt-1">
                Type <span className="font-mono font-bold">DELETE</span> below to confirm account deletion.
              </p>
            </div>
          </div>
          <input
            data-testid="delete-account-input"
            type="text"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder='Type "DELETE" to confirm'
            className="w-full px-4 py-3 rounded-xl border border-red-200 bg-white text-charcoal placeholder:text-charcoal-soft/40 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition text-sm font-mono"
          />
          <button
            data-testid="delete-account-btn"
            onClick={handleDeleteAccount}
            disabled={deleteConfirm !== "DELETE" || deleting}
            className="w-full px-6 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {deleting ? "Deleting account…" : "Delete my account permanently"}
          </button>
        </div>
      </section>
    </div>
  );
}

// ─── Tab: Wallet ─────────────────────────────────────────────────────────────
function WalletTab({ user, setToast }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/wallet/transactions");
        if (active) setTransactions(data.transactions || []);
      } catch (err) {
        if (active) setToast({ message: formatApiError(err), type: "error" });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [setToast]);

  const handleTopup = () => {
    setToast({ message: "Real payment gateway coming soon", type: "success" });
  };

  const fmt = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const statusLabel = (s) => {
    const map = {
      booked: "Booked",
      arrived: "Arrived",
      in_consult: "In consult",
      completed: "Completed",
      cancelled: "Cancelled",
      refunded: "Refunded",
    };
    return map[s] || s;
  };

  return (
    <div className="max-w-2xl space-y-8">
      {/* Balance card */}
      <div
        data-testid="wallet-balance"
        className="rounded-3xl bg-charcoal text-bone p-8 flex items-center justify-between"
      >
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-bone/60 mb-2">Wallet balance</div>
          <div className="font-mono text-4xl">₹{user?.wallet_balance ?? 0}</div>
          <div className="text-xs text-bone/50 mt-2">Available for deposits</div>
        </div>
        <div className="w-16 h-16 rounded-full bg-saffron/20 grid place-items-center">
          <Wallet className="w-7 h-7 text-saffron" strokeWidth={1.5} />
        </div>
      </div>

      {/* Top-up button */}
      <button
        data-testid="wallet-topup-btn"
        onClick={handleTopup}
        className="px-8 py-3 rounded-full border-2 border-saffron text-saffron text-sm font-semibold hover:bg-saffron hover:text-white transition"
      >
        + Add money
      </button>

      {/* Transactions */}
      <div>
        <h2 className="font-display text-2xl text-charcoal mb-4">Transaction history</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-charcoal-soft py-8">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading transactions…
          </div>
        ) : transactions.length === 0 ? (
          <div className="rounded-2xl bg-white border border-dashed border-subtle p-8 text-center text-charcoal-soft text-sm">
            No transactions yet. Book a consultation to see your transaction history.
          </div>
        ) : (
          <div
            data-testid="wallet-transactions-table"
            className="rounded-2xl border border-subtle bg-white overflow-hidden"
          >
            {/* Table header */}
            <div className="grid grid-cols-4 gap-4 px-5 py-3 bg-bone border-b border-subtle">
              <div className="text-xs uppercase tracking-widest text-charcoal-soft">Date</div>
              <div className="text-xs uppercase tracking-widest text-charcoal-soft col-span-2">Description</div>
              <div className="text-xs uppercase tracking-widest text-charcoal-soft text-right">Amount</div>
            </div>
            {/* Rows */}
            {transactions.map((tx) => (
              <div
                key={tx.id}
                data-testid={`transaction-row-${tx.id}`}
                className="grid grid-cols-4 gap-4 px-5 py-4 border-b border-subtle last:border-b-0 hover:bg-bone/50 transition items-center"
              >
                <div className="text-xs text-charcoal-soft font-mono">{fmt(tx.date)}</div>
                <div className="col-span-2">
                  <p className="text-sm text-charcoal leading-snug">{tx.description}</p>
                  <span
                    className={`mt-1 inline-block text-[10px] px-2 py-0.5 rounded-full ${
                      tx.status === "refunded"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : tx.status === "cancelled"
                        ? "bg-red-50 text-red-600 border border-red-100"
                        : tx.status === "completed"
                        ? "bg-charcoal/5 text-charcoal-soft border border-subtle"
                        : "bg-saffron/10 text-saffron border border-saffron/20"
                    }`}
                  >
                    {statusLabel(tx.status)}
                  </span>
                </div>
                <div
                  className={`text-right font-mono text-sm font-semibold ${
                    tx.type === "credit" ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {tx.type === "credit" ? "+" : ""}₹{Math.abs(tx.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Preferences ────────────────────────────────────────────────────────
function PreferencesTab({ user, setToast }) {
  const [language, setLanguage] = useState(user?.preferred_language || "English");
  const [saving, setSaving] = useState(false);

  const handleSaveLanguage = async () => {
    setSaving(true);
    try {
      await api.patch("/auth/me", { preferred_language: language });
      setToast({ message: "Language preference saved", type: "success" });
    } catch (err) {
      setToast({ message: formatApiError(err), type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationsClick = () => {
    setToast({ message: "Coming soon", type: "success" });
  };

  return (
    <div className="max-w-xl space-y-8">
      {/* Language */}
      <section className="rounded-2xl bg-white border border-subtle p-6 space-y-4">
        <h3 className="font-display text-xl text-charcoal">Language</h3>
        <div>
          <label className={labelCls}>Preferred language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className={inputCls}
          >
            <option value="English">English</option>
            <option value="Hindi">Hindi</option>
            <option value="Tamil">Tamil</option>
            <option value="Kannada">Kannada</option>
            <option value="Marathi">Marathi</option>
          </select>
        </div>
        <button
          onClick={handleSaveLanguage}
          disabled={saving}
          className="px-6 py-2.5 rounded-full bg-saffron text-white text-sm font-semibold hover:bg-saffron/90 transition disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save preference"}
        </button>
      </section>

      {/* Notifications */}
      <section className="rounded-2xl bg-white border border-subtle p-6 space-y-3">
        <h3 className="font-display text-xl text-charcoal">Notifications</h3>
        <p className="text-sm text-charcoal-soft">
          Manage alerts for appointments, medicine reminders, and wallet activity.
        </p>
        <button
          onClick={handleNotificationsClick}
          className="text-sm text-saffron hover:underline"
        >
          Notification settings →
        </button>
      </section>

      {/* Dark mode */}
      <section className="rounded-2xl bg-white border border-subtle p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-xl text-charcoal">Dark mode</h3>
            <p className="text-sm text-charcoal-soft mt-1">Switch to a darker theme</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs px-2.5 py-1 rounded-full bg-charcoal/5 border border-subtle text-charcoal-soft font-semibold uppercase tracking-widest">
              Coming soon
            </span>
            {/* Disabled toggle */}
            <div className="w-11 h-6 rounded-full bg-charcoal/10 relative cursor-not-allowed">
              <div className="absolute left-1 top-1 w-4 h-4 rounded-full bg-white shadow-sm" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS = ["Profile", "Security", "Wallet", "Preferences"];

const TAB_ICONS = {
  Profile: User,
  Security: Lock,
  Wallet: Wallet,
  Preferences: Settings,
};

export default function PatientSettings() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Profile");
  const [toast, setToast] = useState(null);

  const showToast = (payload) => setToast(payload);
  const dismissToast = () => setToast(null);

  return (
    <DashboardShell roles={["patient"]} title="Settings" subtitle="YOUR ACCOUNT">
      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={dismissToast} />
      )}

      {/* Tab navigation */}
      <div className="mb-10 flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const Icon = TAB_ICONS[tab];
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              data-testid={`settings-tab-${tab.toLowerCase()}`}
              onClick={() => setActiveTab(tab)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-colors ${
                active
                  ? "bg-charcoal text-bone"
                  : "bg-white border border-subtle text-charcoal-soft hover:border-charcoal hover:text-charcoal"
              }`}
            >
              <Icon className="w-4 h-4" strokeWidth={active ? 2 : 1.8} />
              {tab}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "Profile" && (
        <ProfileTab user={user} setToast={showToast} refreshUser={refreshUser} />
      )}
      {activeTab === "Security" && (
        <SecurityTab setToast={showToast} logout={logout} navigate={navigate} />
      )}
      {activeTab === "Wallet" && (
        <WalletTab user={user} setToast={showToast} />
      )}
      {activeTab === "Preferences" && (
        <PreferencesTab user={user} setToast={showToast} />
      )}
    </DashboardShell>
  );
}
