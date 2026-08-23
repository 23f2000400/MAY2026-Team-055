// Usage: <WalkinModal onClose={() => {}} onAdded={() => refresh()} />
// Integration pass will add the "Add walk-in" button to ReceptionDashboard.jsx header
import { useState, useEffect } from "react";
import { X, Zap, Clock, Loader2 } from "lucide-react";
import { fetchApi } from "@/lib/api";

export default function WalkinModal({ onClose, onAdded, doctorsList }) {
  const [form, setForm] = useState({ patient_name: "", phone: "", doctor_id: "", urgency: "routine" });
  const [doctors, setDoctors] = useState(doctorsList || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (doctorsList && doctorsList.length > 0) {
      setDoctors(doctorsList);
    } else {
      fetchApi('/api/reception/doctors')
        .then(r => r.ok ? r.json() : fetchApi('/api/doctors').then(res => res.json()))
        .then(d => setDoctors(d.doctors || []))
        .catch(() => setDoctors([]));
    }
  }, [doctorsList]);

  const submit = async () => {
    if (!form.patient_name.trim()) { setError("Patient name required"); return; }
    if (!form.doctor_id) { setError("Select a doctor"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetchApi('/api/reception/walkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed');
      onAdded?.();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" data-testid="walkin-modal">
      <div className="bg-white rounded-3xl shadow-medium w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl text-charcoal">Add walk-in patient</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full border border-subtle grid place-items-center hover:border-saffron hover:text-saffron transition">
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-charcoal-soft font-semibold mb-1.5 block">Patient name *</label>
            <input
              type="text"
              value={form.patient_name}
              onChange={e => setForm(p => ({ ...p, patient_name: e.target.value }))}
              data-testid="walkin-name"
              placeholder="Full name"
              className="w-full px-4 py-2.5 rounded-xl border border-subtle bg-white focus:outline-none focus:border-saffron font-body text-sm"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-charcoal-soft font-semibold mb-1.5 block">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              data-testid="walkin-phone"
              placeholder="+91 98765 43210"
              className="w-full px-4 py-2.5 rounded-xl border border-subtle bg-white focus:outline-none focus:border-saffron font-body text-sm"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-charcoal-soft font-semibold mb-1.5 block">Doctor *</label>
            <select
              value={form.doctor_id}
              onChange={e => setForm(p => ({ ...p, doctor_id: e.target.value }))}
              data-testid="walkin-doctor-select"
              className="w-full px-4 py-2.5 rounded-xl border border-subtle bg-white focus:outline-none focus:border-saffron font-body text-sm"
            >
              <option value="">Select doctor…</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>{d.name} — {d.specialty}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-charcoal-soft font-semibold mb-2 block">Urgency</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, urgency: "routine" }))}
                data-testid="walkin-urgency-routine"
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full border text-sm font-body transition-colors ${form.urgency === 'routine' ? 'bg-charcoal text-bone border-charcoal' : 'border-subtle text-charcoal-soft hover:border-charcoal/30'}`}
              >
                <Clock className="w-4 h-4" strokeWidth={1.8} />
                Routine
              </button>
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, urgency: "urgent" }))}
                data-testid="walkin-urgency-urgent"
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full border text-sm font-body transition-colors ${form.urgency === 'urgent' ? 'bg-ochre text-white border-ochre' : 'border-subtle text-charcoal-soft hover:border-ochre/30'}`}
              >
                <Zap className="w-4 h-4" strokeWidth={1.8} />
                Urgent
              </button>
            </div>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm font-body mt-3">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-full border border-subtle text-charcoal font-body text-sm">Cancel</button>
          <button
            onClick={submit}
            disabled={saving}
            data-testid="walkin-submit"
            className="flex-1 py-2.5 rounded-full bg-saffron text-white font-body text-sm hover:bg-saffron-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Adding…" : "Add patient"}
          </button>
        </div>
      </div>
    </div>
  );
}
