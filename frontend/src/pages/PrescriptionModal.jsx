import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, Pill, Sparkles, Loader2 } from "lucide-react";
import api, { formatApiError } from "@/lib/api";

const FREQ = [
  { code: "OD", label: "Once daily", times: ["09:00"] },
  { code: "BID", label: "Twice daily", times: ["09:00", "21:00"] },
  { code: "TID", label: "Thrice daily", times: ["09:00", "14:00", "21:00"] },
  { code: "QID", label: "Four times daily", times: ["08:00", "13:00", "18:00", "22:00"] },
];

const FOOD = [
  { code: "before", label: "Before food" },
  { code: "after", label: "After food" },
  { code: "with", label: "With food" },
  { code: "empty", label: "Empty stomach" },
  { code: "any", label: "Any time" },
];

const MEDICINES = [
  { name: "Paracetamol", dose: "500 mg", type: "Antipyretic" },
  { name: "Paracetamol", dose: "650 mg", type: "Antipyretic" },
  { name: "Dolo 650", dose: "650 mg", type: "Antipyretic" },
  { name: "Ibuprofen", dose: "400 mg", type: "NSAID" },
  { name: "Ibuprofen", dose: "600 mg", type: "NSAID" },
  { name: "Diclofenac", dose: "50 mg", type: "NSAID" },
  { name: "Amoxicillin", dose: "250 mg", type: "Antibiotic" },
  { name: "Amoxicillin", dose: "500 mg", type: "Antibiotic" },
  { name: "Augmentin", dose: "625 mg", type: "Antibiotic" },
  { name: "Azithromycin", dose: "250 mg", type: "Antibiotic" },
  { name: "Azithromycin", dose: "500 mg", type: "Antibiotic" },
  { name: "Ciprofloxacin", dose: "500 mg", type: "Antibiotic" },
  { name: "Metronidazole", dose: "400 mg", type: "Antibiotic" },
  { name: "Cefixime", dose: "200 mg", type: "Antibiotic" },
  { name: "Norfloxacin", dose: "400 mg", type: "Antibiotic" },
  { name: "Doxycycline", dose: "100 mg", type: "Antibiotic" },
  { name: "Cetirizine", dose: "10 mg", type: "Antihistamine" },
  { name: "Levocetirizine", dose: "5 mg", type: "Antihistamine" },
  { name: "Fexofenadine", dose: "120 mg", type: "Antihistamine" },
  { name: "Montelukast", dose: "10 mg", type: "Antileukotriene" },
  { name: "Pantoprazole", dose: "40 mg", type: "Antacid" },
  { name: "Omeprazole", dose: "20 mg", type: "Antacid" },
  { name: "Ranitidine", dose: "150 mg", type: "Antacid" },
  { name: "Domperidone", dose: "10 mg", type: "Antiemetic" },
  { name: "Ondansetron", dose: "4 mg", type: "Antiemetic" },
  { name: "Metformin", dose: "500 mg", type: "Antidiabetic" },
  { name: "Metformin", dose: "1000 mg", type: "Antidiabetic" },
  { name: "Glimepiride", dose: "1 mg", type: "Antidiabetic" },
  { name: "Atorvastatin", dose: "10 mg", type: "Statin" },
  { name: "Atorvastatin", dose: "20 mg", type: "Statin" },
  { name: "Rosuvastatin", dose: "10 mg", type: "Statin" },
  { name: "Amlodipine", dose: "5 mg", type: "Antihypertensive" },
  { name: "Amlodipine", dose: "10 mg", type: "Antihypertensive" },
  { name: "Losartan", dose: "50 mg", type: "Antihypertensive" },
  { name: "Telmisartan", dose: "40 mg", type: "Antihypertensive" },
  { name: "Atenolol", dose: "50 mg", type: "Beta-blocker" },
  { name: "Prednisolone", dose: "5 mg", type: "Corticosteroid" },
  { name: "Prednisolone", dose: "10 mg", type: "Corticosteroid" },
  { name: "Vitamin D3", dose: "60000 IU", type: "Supplement" },
  { name: "Vitamin B12", dose: "500 mcg", type: "Supplement" },
  { name: "Calcium Carbonate", dose: "500 mg", type: "Supplement" },
  { name: "Folic Acid", dose: "5 mg", type: "Supplement" },
  { name: "Sertraline", dose: "50 mg", type: "Antidepressant" },
  { name: "Escitalopram", dose: "10 mg", type: "Antidepressant" },
  { name: "Clonazepam", dose: "0.5 mg", type: "Anxiolytic" },
  { name: "Aspirin", dose: "75 mg", type: "Antiplatelet" },
  { name: "Clopidogrel", dose: "75 mg", type: "Antiplatelet" },
  { name: "Salbutamol", dose: "2 mg", type: "Bronchodilator" },
  { name: "Levothyroxine", dose: "25 mcg", type: "Thyroid" },
  { name: "Levothyroxine", dose: "50 mcg", type: "Thyroid" },
];

const emptyMed = () => ({
  name: "",
  dose: "",
  frequency: "BID",
  food_instructions: "after",
  duration_days: 5,
});

function MedAutocomplete({ index, value, onChange, onSelect }) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const suggestions = value.length >= 2
    ? MEDICINES.filter((m) =>
        m.name.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 6)
    : [];

  useEffect(() => {
    setOpen(suggestions.length > 0);
    setHighlighted(0);
  }, [value]);

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const select = (med) => {
    onSelect(med.name, med.dose);
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && suggestions[highlighted]) {
      e.preventDefault();
      select(suggestions[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        data-testid={`rx-name-${index}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder="e.g. Paracetamol"
        autoComplete="off"
        className="w-full px-3 py-2.5 rounded-xl border border-subtle bg-bone focus:bg-white focus:border-saffron outline-none transition text-sm"
      />
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-subtle shadow-lg overflow-hidden max-h-56 overflow-y-auto">
          {suggestions.map((med, i) => (
            <button
              key={`${med.name}-${med.dose}`}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); select(med); }}
              onMouseEnter={() => setHighlighted(i)}
              className={`w-full px-4 py-2.5 text-left flex items-center justify-between gap-3 transition-colors ${
                i === highlighted ? "bg-saffron/10" : "hover:bg-bone"
              }`}
            >
              <div>
                <span className="font-body text-sm text-charcoal">{med.name}</span>
                <span className="font-mono text-xs text-charcoal-soft ml-2">{med.dose}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-bone border border-subtle text-charcoal-soft flex-shrink-0">
                {med.type}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PrescriptionModal({ booking, onClose, onDone }) {
  const [meds, setMeds] = useState([emptyMed()]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const update = (i, k, v) => {
    const next = [...meds];
    next[i] = { ...next[i], [k]: v };
    setMeds(next);
  };

  const add = () => setMeds([...meds, emptyMed()]);
  const remove = (i) => setMeds(meds.filter((_, idx) => idx !== i));

  const submit = async () => {
    setErr("");
    const cleaned = meds
      .map((m) => ({ ...m, name: m.name.trim(), dose: m.dose.trim() }))
      .filter((m) => m.name && m.dose);
    if (cleaned.length === 0) {
      setErr("Add at least one medication with a name and dose.");
      return;
    }
    setBusy(true);
    try {
      await api.post(`/doctor/bookings/${booking.id}/prescription`, {
        medications: cleaned,
        notes,
      });
      onDone && onDone();
      onClose && onClose();
    } catch (e) {
      setErr(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-charcoal/60 backdrop-blur-sm grid place-items-center px-4 py-8 overflow-y-auto"
        onClick={onClose}
        data-testid="rx-modal"
      >
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative bg-bone rounded-3xl w-full max-w-3xl shadow-medium overflow-hidden my-auto"
        >
          <button
            data-testid="rx-close"
            onClick={onClose}
            className="absolute top-5 right-5 w-9 h-9 rounded-full grid place-items-center border border-subtle bg-white text-charcoal-soft hover:border-charcoal transition z-10"
          >
            <X className="w-4 h-4" strokeWidth={1.8} />
          </button>

          <div className="p-8">
            <div className="text-xs uppercase tracking-[0.25em] text-saffron font-semibold">Write prescription</div>
            <div className="mt-2 font-display text-3xl text-charcoal leading-tight">{booking.patient_name}</div>
            <div className="text-sm text-charcoal-soft">
              Token <span className="font-mono">#{booking.token_number}</span> · slot{" "}
              <span className="font-mono">{booking.slot_time}</span>
            </div>

            <div className="mt-8 space-y-4">
              {meds.map((m, i) => (
                <div key={i} className="rounded-2xl bg-white border border-subtle p-5" data-testid={`rx-med-${i}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-charcoal">
                      <Pill className="w-4 h-4 text-saffron" strokeWidth={1.8} />
                      <span className="font-medium">Medication {i + 1}</span>
                    </div>
                    {meds.length > 1 && (
                      <button
                        data-testid={`rx-remove-${i}`}
                        onClick={() => remove(i)}
                        className="w-8 h-8 grid place-items-center rounded-full text-charcoal-soft hover:text-red-600 hover:bg-red-50 transition"
                      >
                        <Trash2 className="w-4 h-4" strokeWidth={1.8} />
                      </button>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-3">
                    <Field label="Name">
                      <MedAutocomplete
                        index={i}
                        value={m.name}
                        onChange={(v) => update(i, "name", v)}
                        onSelect={(name, dose) => {
                          update(i, "name", name);
                          if (!meds[i].dose) update(i, "dose", dose);
                        }}
                      />
                    </Field>
                    <Field label="Dose">
                      <input
                        data-testid={`rx-dose-${i}`}
                        value={m.dose}
                        onChange={(e) => update(i, "dose", e.target.value)}
                        placeholder="e.g. 500 mg"
                        className="w-full px-3 py-2.5 rounded-xl border border-subtle bg-bone focus:bg-white focus:border-saffron outline-none transition text-sm"
                      />
                    </Field>

                    <Field label="Frequency">
                      <div className="flex gap-1.5 flex-wrap">
                        {FREQ.map((f) => (
                          <button
                            key={f.code}
                            type="button"
                            data-testid={`rx-freq-${i}-${f.code}`}
                            onClick={() => update(i, "frequency", f.code)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition ${
                              m.frequency === f.code
                                ? "border-saffron bg-saffron/10 text-saffron"
                                : "border-subtle text-charcoal-soft hover:border-charcoal/40"
                            }`}
                          >
                            {f.code}
                          </button>
                        ))}
                      </div>
                      <div className="text-[11px] text-charcoal-soft mt-1.5">
                        {FREQ.find((f) => f.code === m.frequency)?.label} · at{" "}
                        <span className="font-mono">
                          {FREQ.find((f) => f.code === m.frequency)?.times.join(", ")}
                        </span>
                      </div>
                    </Field>

                    <Field label="Food">
                      <select
                        data-testid={`rx-food-${i}`}
                        value={m.food_instructions}
                        onChange={(e) => update(i, "food_instructions", e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-subtle bg-bone focus:bg-white focus:border-saffron outline-none transition text-sm"
                      >
                        {FOOD.map((f) => (
                          <option key={f.code} value={f.code}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Duration (days)">
                      <input
                        type="number"
                        min="1"
                        max="365"
                        data-testid={`rx-days-${i}`}
                        value={m.duration_days}
                        onChange={(e) => update(i, "duration_days", parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2.5 rounded-xl border border-subtle bg-bone focus:bg-white focus:border-saffron outline-none transition text-sm"
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={add}
              data-testid="rx-add-med"
              className="mt-4 w-full py-3 rounded-2xl border border-dashed border-charcoal/20 text-charcoal-soft hover:text-saffron hover:border-saffron transition flex items-center justify-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              Add another medication
            </button>

            <div className="mt-6">
              <Field label="Notes (optional)">
                <textarea
                  data-testid="rx-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Rest for 3 days. Return if fever persists beyond 48hrs."
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-subtle bg-white focus:border-saffron outline-none transition text-sm resize-none"
                />
              </Field>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-sage/10 border border-sage/20 flex items-start gap-2 text-xs text-charcoal">
              <Sparkles className="w-3.5 h-3.5 text-sage flex-shrink-0 mt-0.5" />
              <span>
                Alarms are auto-scheduled the moment you submit. The patient sees today's doses on their Medicines tab.
              </span>
            </div>

            {err && (
              <div data-testid="rx-error" className="mt-4 text-sm px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700">
                {err}
              </div>
            )}

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={onClose}
                className="px-5 py-3 rounded-full border border-charcoal/15 text-charcoal-soft hover:text-charcoal hover:border-charcoal transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={busy}
                data-testid="rx-submit"
                className="px-6 py-3 rounded-full bg-saffron text-white hover:bg-saffron-hover disabled:opacity-60 transition flex items-center gap-2"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Sign & send to patient"
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-charcoal-soft">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
