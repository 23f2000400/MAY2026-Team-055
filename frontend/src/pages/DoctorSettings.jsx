// ROUTE TO ADD IN App.js:
// import DoctorSettings from "@/pages/DoctorSettings";
// <Route path="/app/doctor/settings" element={<DoctorSettings />} />

import React, { useEffect, useState, useRef } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import DashboardShell from "./DashboardShell";
import api, { formatApiError } from "@/lib/api";
import { Loader2, X, Plus, Save, Upload, CheckCircle2 } from "lucide-react";

// ─── constants ────────────────────────────────────────────────────────────────

const DAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

const DEFAULT_SCHEDULE = {
  mon: [{ start: "09:00", end: "13:00" }],
  tue: [{ start: "09:00", end: "13:00" }],
  wed: [{ start: "09:00", end: "13:00" }],
  thu: [{ start: "09:00", end: "13:00" }],
  fri: [{ start: "09:00", end: "13:00" }],
  sat: [],
  sun: [],
};

// ─── Toast helper ─────────────────────────────────────────────────────────────

function useToast() {
  const [toast, setToast] = useState(null);
  const show = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };
  return { toast, show };
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DoctorSettings() {
  const tabs = ["Profile", "Weekly Schedule", "Blocked Dates"];
  const [activeTab, setActiveTab] = useState("Profile");
  const { toast, show } = useToast();

  return (
    <DashboardShell roles={["doctor"]} title="Settings" subtitle="Doctor settings">
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-medium text-sm font-medium transition-all ${
            toast.type === "success"
              ? "bg-sage text-white"
              : "bg-destructive text-white"
          }`}
        >
          {toast.type === "success" && <CheckCircle2 className="w-4 h-4" strokeWidth={2} />}
          {toast.msg}
        </div>
      )}

      {/* Tab bar */}
      <div className="mb-8 inline-flex gap-1 p-1 rounded-full bg-white border border-subtle" role="tablist">
        <button
          role="tab"
          data-testid="doctor-settings-tab-profile"
          onClick={() => setActiveTab("Profile")}
          className={`px-5 py-2 rounded-full text-sm transition-colors ${
            activeTab === "Profile"
              ? "bg-charcoal text-bone"
              : "text-charcoal-soft hover:text-charcoal"
          }`}
        >
          Profile
        </button>
        <button
          role="tab"
          data-testid="doctor-settings-tab-schedule"
          onClick={() => setActiveTab("Weekly Schedule")}
          className={`px-5 py-2 rounded-full text-sm transition-colors ${
            activeTab === "Weekly Schedule"
              ? "bg-charcoal text-bone"
              : "text-charcoal-soft hover:text-charcoal"
          }`}
        >
          Weekly Schedule
        </button>
        <button
          role="tab"
          data-testid="doctor-settings-tab-blocked"
          onClick={() => setActiveTab("Blocked Dates")}
          className={`px-5 py-2 rounded-full text-sm transition-colors ${
            activeTab === "Blocked Dates"
              ? "bg-charcoal text-bone"
              : "text-charcoal-soft hover:text-charcoal"
          }`}
        >
          Blocked Dates
        </button>
      </div>

      {/* Tab panels */}
      {activeTab === "Profile" && <ProfileTab onSuccess={(msg) => show(msg)} onError={(msg) => show(msg, "error")} />}
      {activeTab === "Weekly Schedule" && <ScheduleTab onSuccess={(msg) => show(msg)} onError={(msg) => show(msg, "error")} />}
      {activeTab === "Blocked Dates" && <BlockedDatesTab onSuccess={(msg) => show(msg)} onError={(msg) => show(msg, "error")} />}
    </DashboardShell>
  );
}

// ─── Profile Tab ─────────────────────────────────────────────────────────────

function ProfileTab({ onSuccess, onError }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const [bio, setBio] = useState("");
  const [fee, setFee] = useState("");
  const [credentials, setCredentials] = useState([""]);
  const [languages, setLanguages] = useState([]);
  const [langInput, setLangInput] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    api.get("/doctor/profile")
      .then(({ data }) => {
        const u = data.user;
        setBio(u.bio || "");
        setFee(u.fee != null ? String(u.fee) : "");
        setCredentials(u.credentials && u.credentials.length > 0 ? u.credentials : [""]);
        setLanguages(u.languages || []);
        setAvatarUrl(u.avatar_url || u.avatar || "");
      })
      .catch((err) => onError(formatApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const filteredCredentials = credentials.filter((c) => c.trim() !== "");
      const body = {
        bio: bio || undefined,
        fee: fee ? parseInt(fee, 10) : undefined,
        credentials: filteredCredentials.length > 0 ? filteredCredentials : undefined,
        languages: languages.length > 0 ? languages : undefined,
        avatar_url: avatarUrl || undefined,
      };
      // Remove undefined keys
      const cleanBody = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined));
      await api.patch("/doctor/profile", cleanBody);
      onSuccess("Profile saved successfully.");
    } catch (err) {
      onError(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = localStorage.getItem("nirog_token");
      const { data } = await api.post("/uploads/doctor-avatar", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });
      setAvatarUrl(data.url);
      onSuccess("Avatar uploaded.");
    } catch (err) {
      onError(formatApiError(err));
    } finally {
      setUploading(false);
    }
  };

  const addCredential = () => setCredentials((prev) => [...prev, ""]);
  const removeCredential = (i) => setCredentials((prev) => prev.filter((_, idx) => idx !== i));
  const updateCredential = (i, val) =>
    setCredentials((prev) => prev.map((c, idx) => (idx === i ? val : c)));

  const addLanguage = () => {
    const lang = langInput.trim();
    if (lang && !languages.includes(lang)) {
      setLanguages((prev) => [...prev, lang]);
    }
    setLangInput("");
  };
  const removeLanguage = (lang) => setLanguages((prev) => prev.filter((l) => l !== lang));

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-charcoal-soft py-10">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading profile…
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Avatar */}
      <div className="rounded-3xl bg-white border border-subtle p-6 space-y-4">
        <h2 className="font-display text-2xl text-charcoal">Photo</h2>
        <div className="flex items-center gap-5">
          {avatarUrl ? (
            <img
              src={avatarUrl.startsWith("/api") ? `${process.env.REACT_APP_BACKEND_URL}${avatarUrl}` : avatarUrl}
              alt="Avatar"
              className="w-20 h-20 rounded-full object-cover border border-subtle"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-bone border border-subtle grid place-items-center text-charcoal-soft text-2xl font-display">
              ?
            </div>
          )}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              data-testid="doctor-avatar-upload"
              onChange={handleAvatarUpload}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-subtle text-sm text-charcoal hover:border-saffron hover:text-saffron transition disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" strokeWidth={1.8} />
              )}
              {uploading ? "Uploading…" : "Upload photo"}
            </button>
            <p className="mt-1 text-xs text-charcoal-soft">Max 2 MB. JPG, PNG, WebP.</p>
          </div>
        </div>
      </div>

      {/* Bio */}
      <div className="rounded-3xl bg-white border border-subtle p-6 space-y-3">
        <label className="block font-display text-2xl text-charcoal" htmlFor="doctor-bio">
          Bio
        </label>
        <p className="text-sm text-charcoal-soft">A short description patients will see on your profile.</p>
        <textarea
          id="doctor-bio"
          data-testid="doctor-bio-textarea"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={1000}
          rows={5}
          placeholder="Tell patients about your speciality, approach, and experience…"
          className="w-full px-4 py-3 rounded-2xl border border-subtle bg-bone text-charcoal text-sm resize-none focus:outline-none focus:border-saffron transition placeholder:text-charcoal-soft/50"
        />
        <div className="text-xs text-charcoal-soft text-right">{bio.length}/1000</div>
      </div>

      {/* Fee */}
      <div className="rounded-3xl bg-white border border-subtle p-6 space-y-3">
        <label className="block font-display text-2xl text-charcoal" htmlFor="doctor-fee">
          Consultation fee (₹)
        </label>
        <input
          id="doctor-fee"
          data-testid="doctor-fee-input"
          type="number"
          min={0}
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          placeholder="e.g. 500"
          className="w-full px-4 py-3 rounded-2xl border border-subtle bg-bone text-charcoal text-sm focus:outline-none focus:border-saffron transition placeholder:text-charcoal-soft/50"
        />
      </div>

      {/* Credentials */}
      <div className="rounded-3xl bg-white border border-subtle p-6 space-y-3">
        <h2 className="font-display text-2xl text-charcoal">Credentials</h2>
        <p className="text-sm text-charcoal-soft">Degrees, certifications, and qualifications.</p>
        <div className="space-y-2">
          {credentials.map((cred, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={cred}
                data-testid="doctor-credentials-input"
                onChange={(e) => updateCredential(i, e.target.value)}
                placeholder={`e.g. MBBS, MS — ${i + 1}`}
                className="flex-1 px-4 py-2.5 rounded-full border border-subtle bg-bone text-charcoal text-sm focus:outline-none focus:border-saffron transition placeholder:text-charcoal-soft/50"
              />
              {credentials.length > 1 && (
                <button
                  onClick={() => removeCredential(i)}
                  className="w-8 h-8 rounded-full border border-subtle grid place-items-center text-charcoal-soft hover:border-red-300 hover:text-red-500 transition"
                  aria-label="Remove credential"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={addCredential}
          className="inline-flex items-center gap-1.5 text-sm text-saffron hover:text-saffron-hover transition"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          Add credential
        </button>
      </div>

      {/* Languages */}
      <div className="rounded-3xl bg-white border border-subtle p-6 space-y-3">
        <h2 className="font-display text-2xl text-charcoal">Languages spoken</h2>
        <div className="flex flex-wrap gap-2 min-h-[2rem]">
          {languages.map((lang) => (
            <span
              key={lang}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-saffron/10 border border-saffron/20 rounded-full text-sm text-saffron"
            >
              {lang}
              <button
                onClick={() => removeLanguage(lang)}
                aria-label={`Remove ${lang}`}
                className="hover:text-saffron-hover transition"
              >
                <X className="w-3 h-3" strokeWidth={2.5} />
              </button>
            </span>
          ))}
          {languages.length === 0 && (
            <span className="text-sm text-charcoal-soft italic">No languages added yet.</span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={langInput}
            onChange={(e) => setLangInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addLanguage()}
            placeholder="e.g. Hindi, English, Kannada"
            className="flex-1 px-4 py-2.5 rounded-full border border-subtle bg-bone text-charcoal text-sm focus:outline-none focus:border-saffron transition placeholder:text-charcoal-soft/50"
          />
          <button
            onClick={addLanguage}
            className="px-4 py-2.5 rounded-full bg-charcoal text-bone text-sm hover:bg-charcoal/90 transition"
          >
            Add
          </button>
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-saffron text-white font-medium hover:bg-saffron-hover transition disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" strokeWidth={2} />}
        {saving ? "Saving…" : "Save profile"}
      </button>
    </div>
  );
}

// ─── Weekly Schedule Tab ──────────────────────────────────────────────────────

function ScheduleTab({ onSuccess, onError }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // schedule: { mon: [{start, end}, ...], ... }
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);

  useEffect(() => {
    api.get("/doctor/profile")
      .then(({ data }) => {
        const ws = data.user.weekly_schedule;
        if (ws && Object.keys(ws).length > 0) {
          // Merge default + fetched so all 7 days are represented
          const merged = { ...DEFAULT_SCHEDULE };
          for (const d of DAYS) {
            if (d.key in ws) {
              merged[d.key] = ws[d.key];
            }
          }
          setSchedule(merged);
        }
      })
      .catch((err) => onError(formatApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  const isDayOpen = (day) => schedule[day] && schedule[day].length > 0;

  const toggleDay = (day) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: isDayOpen(day) ? [] : [{ start: "09:00", end: "13:00" }],
    }));
  };

  const addRange = (day) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: [...(prev[day] || []), { start: "09:00", end: "13:00" }],
    }));
  };

  const removeRange = (day, i) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: prev[day].filter((_, idx) => idx !== i),
    }));
  };

  const updateRange = (day, i, field, value) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: prev[day].map((r, idx) => (idx === i ? { ...r, [field]: value } : r)),
    }));
  };

  const handleSave = async () => {
    // Only send days that have ranges (open days)
    const weekly_schedule = {};
    for (const d of DAYS) {
      weekly_schedule[d.key] = schedule[d.key] || [];
    }
    setSaving(true);
    try {
      await api.put("/doctor/schedule", { weekly_schedule });
      onSuccess("Schedule saved.");
    } catch (err) {
      onError(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-charcoal-soft py-10">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading schedule…
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-sm text-charcoal-soft mb-6">
        Set your availability for each day of the week. You can add multiple time ranges per day.
      </p>

      {DAYS.map(({ key, label }) => {
        const open = isDayOpen(key);
        const ranges = schedule[key] || [];
        return (
          <div
            key={key}
            className={`rounded-2xl bg-white border p-5 transition-all ${
              open ? "border-subtle" : "border-dashed border-subtle opacity-60"
            }`}
          >
            {/* Day header */}
            <div className="flex items-center justify-between">
              <span className="font-medium text-charcoal">{label}</span>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium ${open ? "text-sage" : "text-charcoal-soft"}`}>
                  {open ? "Open" : "Closed"}
                </span>
                {/* Toggle switch */}
                <button
                  role="switch"
                  aria-checked={open}
                  data-testid={`schedule-day-${key}-toggle`}
                  onClick={() => toggleDay(key)}
                  className={`relative w-10 h-5 rounded-full transition-colors focus:outline-none ${
                    open ? "bg-sage" : "bg-charcoal/20"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      open ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Time ranges */}
            {open && (
              <div className="mt-4 space-y-2">
                {ranges.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-1.5 bg-saffron/10 border border-saffron/20 rounded-full text-sm text-saffron"
                  >
                    <input
                      type="time"
                      value={r.start}
                      data-testid={`schedule-range-${key}-${i}-start`}
                      onChange={(e) => updateRange(key, i, "start", e.target.value)}
                      className="bg-transparent text-saffron border-none focus:outline-none w-20 text-sm"
                    />
                    <span className="text-saffron/60">–</span>
                    <input
                      type="time"
                      value={r.end}
                      data-testid={`schedule-range-${key}-${i}-end`}
                      onChange={(e) => updateRange(key, i, "end", e.target.value)}
                      className="bg-transparent text-saffron border-none focus:outline-none w-20 text-sm"
                    />
                    <button
                      data-testid={`schedule-range-${key}-${i}-remove`}
                      onClick={() => removeRange(key, i)}
                      aria-label="Remove time range"
                      className="ml-auto hover:text-saffron-hover transition"
                    >
                      <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
                <button
                  data-testid={`schedule-day-${key}-add-range`}
                  onClick={() => addRange(key)}
                  className="inline-flex items-center gap-1.5 text-sm text-saffron hover:text-saffron-hover transition mt-1"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                  Add range
                </button>
              </div>
            )}
          </div>
        );
      })}

      <button
        data-testid="schedule-save"
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-saffron text-white font-medium hover:bg-saffron-hover transition disabled:opacity-50 mt-4"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" strokeWidth={2} />}
        {saving ? "Saving…" : "Save schedule"}
      </button>
    </div>
  );
}

// ─── Blocked Dates Tab ────────────────────────────────────────────────────────

function BlockedDatesTab({ onSuccess, onError }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDays, setSelectedDays] = useState([]);

  useEffect(() => {
    api.get("/doctor/profile")
      .then(({ data }) => {
        const blocked = data.user.blocked_dates || [];
        // Convert ISO strings to Date objects for DayPicker
        setSelectedDays(blocked.map((d) => new Date(d + "T00:00:00")));
      })
      .catch((err) => onError(formatApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  const removeDate = (dateObj) => {
    setSelectedDays((prev) =>
      prev.filter((d) => d.toDateString() !== dateObj.toDateString())
    );
  };

  const toISODate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const formatDisplay = (d) =>
    d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const handleSave = async () => {
    const blocked_dates = selectedDays.map(toISODate);
    setSaving(true);
    try {
      await api.put("/doctor/blocked-dates", { blocked_dates });
      onSuccess("Blocked dates saved.");
    } catch (err) {
      onError(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-charcoal-soft py-10">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading blocked dates…
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <p className="text-sm text-charcoal-soft">
        Select dates when you will be unavailable — holidays, training days, or personal leave.
        Patients will not be able to book appointments on these days.
      </p>

      {/* Calendar */}
      <div
        data-testid="blocked-dates-calendar"
        className="rounded-3xl bg-white border border-subtle p-6 inline-block"
      >
        <DayPicker
          mode="multiple"
          selected={selectedDays}
          onSelect={setSelectedDays}
          fromDate={new Date()}
          classNames={{
            day_selected: "!bg-saffron !text-white !rounded-full",
            day_today: "!font-bold !text-saffron",
            day: "rounded-full hover:bg-saffron/10 transition",
            caption: "font-display text-charcoal",
            nav_button: "text-charcoal-soft hover:text-charcoal transition",
          }}
        />
      </div>

      {/* Selected dates chips */}
      {selectedDays.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-charcoal">
            {selectedDays.length} date{selectedDays.length !== 1 ? "s" : ""} blocked
          </h3>
          <div className="flex flex-wrap gap-2">
            {[...selectedDays]
              .sort((a, b) => a - b)
              .map((d) => (
                <span
                  key={d.toISOString()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-saffron/10 border border-saffron/20 rounded-full text-sm text-saffron"
                >
                  {formatDisplay(d)}
                  <button
                    onClick={() => removeDate(d)}
                    aria-label={`Remove ${formatDisplay(d)}`}
                    className="hover:text-saffron-hover transition"
                  >
                    <X className="w-3 h-3" strokeWidth={2.5} />
                  </button>
                </span>
              ))}
          </div>
        </div>
      )}

      {selectedDays.length === 0 && (
        <p className="text-sm text-charcoal-soft italic">No dates blocked. Click dates on the calendar above to block them.</p>
      )}

      {/* Save */}
      <button
        data-testid="blocked-dates-save"
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-saffron text-white font-medium hover:bg-saffron-hover transition disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" strokeWidth={2} />}
        {saving ? "Saving…" : "Save blocked dates"}
      </button>
    </div>
  );
}
