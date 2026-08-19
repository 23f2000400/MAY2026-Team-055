// ROUTE TO ADD IN App.js:
// import FamilyProfiles from "@/pages/FamilyProfiles";
// <Route path="/app/patient/family" element={<FamilyProfiles />} />

import { useState, useEffect } from "react";
import { Users, Plus, Edit2, Trash2, User, X, Loader2 } from "lucide-react";
import DashboardShell from "@/pages/DashboardShell";
import { useAuth } from "@/lib/AuthContext";
import { fetchApi } from "@/lib/api";

const RELATIONSHIPS = ["self", "spouse", "child", "parent", "sibling", "other"];
const RELATIONSHIP_LABEL = {
  self: "Myself",
  spouse: "Spouse",
  child: "Child",
  parent: "Parent",
  sibling: "Sibling",
  other: "Other",
};

export default function FamilyProfiles() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | { id?, name... }
  const [form, setForm] = useState({ name: "", relationship: "spouse", gender: "male", dob: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetchApi("/api/family");
      if (res.ok) {
        const data = await res.json();
        setMembers(data.family_members);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const openAdd = () => {
    setForm({ name: "", relationship: "spouse", gender: "male", dob: "", phone: "" });
    setError("");
    setModal("add");
  };

  const openEdit = (m) => {
    setForm({
      name: m.name || "",
      relationship: m.relationship || "other",
      gender: m.gender || "male",
      dob: m.dob || "",
      phone: m.phone || "",
    });
    setError("");
    setModal(m);
  };

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const isEdit = modal && typeof modal === "object" && modal.id;
      const url = isEdit ? `/api/family/${modal.id}` : "/api/family";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetchApi(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to save");
      setModal(null);
      fetchMembers();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const softDelete = async (id) => {
    if (!window.confirm("Remove this family member?")) return;
    await fetchApi(`/api/family/${id}`, { method: "DELETE" });
    fetchMembers();
  };

  const avatarColors = ["bg-saffron/20", "bg-teal/20", "bg-sage-soft", "bg-ochre-soft"];

  return (
    <DashboardShell roles={["patient"]} title="Family" subtitle="PROFILES">
      <div data-testid="family-list">
        {/* Add button */}
        <div className="mb-8 flex items-center justify-between">
          <p className="font-body text-charcoal-soft">
            {members.length} profile{members.length !== 1 ? "s" : ""}
          </p>
          <button
            onClick={openAdd}
            data-testid="add-family-btn"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-saffron text-white font-body text-sm hover:bg-saffron-hover transition-colors"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            Add family member
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-charcoal-soft font-body">Loading…</div>
        ) : members.length === 0 ? (
          /* Empty state */
          <div className="py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-saffron/10 grid place-items-center mx-auto mb-6">
              <Users className="w-10 h-10 text-saffron" strokeWidth={1.5} />
            </div>
            <h2 className="font-display text-3xl text-charcoal">Add your family</h2>
            <p className="font-body text-charcoal-soft mt-3 max-w-sm mx-auto">
              Add your first family member. Booking for them takes one tap.
            </p>
            <button
              onClick={openAdd}
              data-testid="add-family-btn"
              className="mt-6 px-8 py-3 rounded-full bg-saffron text-white font-body hover:bg-saffron-hover transition-colors"
            >
              Add family member
            </button>
          </div>
        ) : (
          /* Members grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {members.map((m, i) => (
              <div
                key={m.id}
                data-testid={`family-card-${m.id}`}
                className="bg-white rounded-3xl border border-subtle p-6 hover:shadow-hoverGlow transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-14 h-14 rounded-full ${avatarColors[i % avatarColors.length]} grid place-items-center flex-shrink-0`}
                  >
                    {m.avatar_url ? (
                      <img
                        src={m.avatar_url}
                        alt={m.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-7 h-7 text-charcoal-soft" strokeWidth={1.5} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs uppercase tracking-[0.25em] text-saffron font-semibold">
                      {RELATIONSHIP_LABEL[m.relationship] || m.relationship}
                      {m.is_self && " · You"}
                    </div>
                    <h3 className="mt-1 font-display text-xl text-charcoal truncate">{m.name}</h3>
                    {m.phone && (
                      <p className="font-mono text-xs text-charcoal-soft mt-0.5">{m.phone}</p>
                    )}
                    {m.dob && (
                      <p className="font-body text-xs text-charcoal-soft mt-0.5">
                        {new Date(m.dob).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                </div>

                {!m.is_self && (
                  <div className="mt-4 pt-4 border-t border-subtle flex gap-2">
                    <button
                      onClick={() => openEdit(m)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full border border-subtle text-sm font-body text-charcoal-soft hover:border-saffron hover:text-saffron transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" strokeWidth={2} /> Edit
                    </button>
                    <button
                      onClick={() => softDelete(m.id)}
                      className="w-9 h-9 rounded-full border border-subtle grid place-items-center text-charcoal-soft hover:border-red-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            className="bg-white rounded-3xl shadow-medium w-full max-w-md p-6"
            data-testid="family-form"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl text-charcoal">
                {modal === "add" ? "Add family member" : `Edit ${modal?.name || ""}`}
              </h2>
              <button
                onClick={() => setModal(null)}
                className="w-9 h-9 rounded-full border border-subtle grid place-items-center hover:border-saffron hover:text-saffron transition"
              >
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-charcoal-soft font-semibold mb-1.5 block">
                  Full name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  data-testid="family-name-input"
                  placeholder="e.g. Priya Sharma"
                  className="w-full px-4 py-2.5 rounded-xl border border-subtle bg-white focus:outline-none focus:border-saffron font-body text-sm"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest text-charcoal-soft font-semibold mb-1.5 block">
                  Relationship
                </label>
                <select
                  value={form.relationship}
                  onChange={(e) => setForm((p) => ({ ...p, relationship: e.target.value }))}
                  data-testid="family-relationship-select"
                  className="w-full px-4 py-2.5 rounded-xl border border-subtle bg-white focus:outline-none focus:border-saffron font-body text-sm"
                >
                  {RELATIONSHIPS.filter((r) => r !== "self").map((r) => (
                    <option key={r} value={r}>
                      {RELATIONSHIP_LABEL[r]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs uppercase tracking-widest text-charcoal-soft font-semibold mb-1.5 block">
                    Gender
                  </label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-subtle bg-white focus:outline-none focus:border-saffron font-body text-sm"
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-charcoal-soft font-semibold mb-1.5 block">
                    Date of birth
                  </label>
                  <input
                    type="date"
                    value={form.dob}
                    onChange={(e) => setForm((p) => ({ ...p, dob: e.target.value }))}
                    data-testid="family-dob-input"
                    className="w-full px-3 py-2.5 rounded-xl border border-subtle bg-white focus:outline-none focus:border-saffron font-body text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest text-charcoal-soft font-semibold mb-1.5 block">
                  Phone (optional)
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-2.5 rounded-xl border border-subtle bg-white focus:outline-none focus:border-saffron font-body text-sm"
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-sm font-body mt-3">{error}</p>}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-2.5 rounded-full border border-subtle text-charcoal font-body text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                data-testid="family-save-btn"
                className="flex-1 py-2.5 rounded-full bg-saffron text-white font-body text-sm hover:bg-saffron-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? "Saving…" : modal === "add" ? "Add member" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
