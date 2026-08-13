import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardShell from "./DashboardShell";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import PrintPrescriptionLink from "@/components/nirog/PrintPrescriptionLink";
import AskFollowUpButton from "@/components/nirog/AskFollowUpButton";
import {
  Pill,
  Sun,
  Sunset,
  Moon,
  Flame,
  CheckCircle2,
  Circle,
  Loader2,
  Stethoscope,
  ArrowRight,
  Sparkles,
  Clock,
} from "lucide-react";

const FOOD_TAG = {
  before: "Before food",
  after: "After food",
  with: "With food",
  empty: "Empty stomach",
  any: "Any time",
};

function bucketOf(t) {
  const h = parseInt(t.split(":")[0], 10);
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 20) return "evening";
  return "night";
}

const BUCKETS = [
  { key: "morning", label: "Morning", icon: Sun, hint: "6am – 12pm" },
  { key: "afternoon", label: "Afternoon", icon: Sun, hint: "12pm – 5pm" },
  { key: "evening", label: "Evening", icon: Sunset, hint: "5pm – 8pm" },
  { key: "night", label: "Night", icon: Moon, hint: "8pm – 6am" },
];

export default function Medicines() {
  const [data, setData] = useState({ doses: [], streak: 0, date: "" });
  const [loading, setLoading] = useState(true);
  const [prescriptions, setPrescriptions] = useState([]);
  const [taking, setTaking] = useState(null); // key of dose being confirmed

  const load = async () => {
    try {
      const [t, p] = await Promise.all([
        api.get("/medicines/today"),
        api.get("/prescriptions/me"),
      ]);
      setData(t.data);
      setPrescriptions(p.data.prescriptions);
    } catch (e) {
      // ignore (likely logged out)
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const take = async (d) => {
    const key = `${d.prescription_id}-${d.med_index}-${d.time}`;
    setTaking(key);
    try {
      await api.post("/medicines/take", {
        prescription_id: d.prescription_id,
        med_index: d.med_index,
        time: d.time,
      });
      await load();
    } finally {
      setTaking(null);
    }
  };

  const byBucket = useMemo(() => {
    const g = { morning: [], afternoon: [], evening: [], night: [] };
    (data?.doses || []).forEach((d) => g[bucketOf(d.time)].push(d));
    return g;
  }, [data.doses]);

  const totalToday = (data?.doses || []).length;
  const takenToday = (data?.doses || []).filter((d) => d.taken).length;
  const percent = totalToday ? Math.round((takenToday / totalToday) * 100) : 0;

  return (
    <DashboardShell roles={["patient"]} subtitle="Adherence, quietly kept" title="Your medicines today">
      {loading ? (
        <div className="flex items-center gap-2 text-charcoal-soft">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading…
        </div>
      ) : totalToday === 0 ? (
        <EmptyState prescriptions={prescriptions} />
      ) : (
        <>
          {/* Top summary */}
          <div className="grid md:grid-cols-3 gap-4 mb-10">
            <div className="rounded-3xl bg-charcoal text-bone p-6" data-testid="medicine-progress">
              <div className="text-xs uppercase tracking-widest text-bone/60">Today's progress</div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-mono text-4xl">{takenToday}</span>
                <span className="text-bone/60 text-sm">/ {totalToday} doses</span>
              </div>
              <div className="mt-4 h-2 rounded-full bg-bone/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  className="h-full bg-saffron"
                />
              </div>
              <div className="text-xs text-bone/60 mt-2">{percent}% adherence today</div>
            </div>

            <div className="rounded-3xl bg-saffron text-white p-6" data-testid="medicine-streak">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/80">
                <Flame className="w-3.5 h-3.5" strokeWidth={2} />
                Streak
              </div>
              <div className="mt-3 font-mono text-5xl leading-none">{data.streak}</div>
              <div className="text-white/85 text-sm mt-2">
                {data.streak === 0
                  ? "Complete today's doses to start your streak."
                  : data.streak === 1
                  ? "day of full adherence. Keep going."
                  : "days of full adherence. Impressive."}
              </div>
            </div>

            <div className="rounded-3xl bg-white border border-subtle p-6">
              <div className="text-xs uppercase tracking-widest text-charcoal-soft">Active prescriptions</div>
              <div className="mt-3 font-mono text-4xl">{prescriptions.length}</div>
              <div className="text-sm text-charcoal-soft mt-2">
                <Link to="/app/patient/history" className="text-saffron hover:underline">
                  View all →
                </Link>
              </div>
            </div>
          </div>

          {/* Dose list grouped by bucket */}
          <div className="space-y-8" data-testid="medicine-buckets">
            {BUCKETS.map((b) => {
              const items = byBucket[b.key];
              if (items.length === 0) return null;
              const Icon = b.icon;
              return (
                <section key={b.key} data-testid={`bucket-${b.key}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-white border border-subtle grid place-items-center">
                      <Icon className="w-4 h-4 text-saffron" strokeWidth={1.8} />
                    </div>
                    <div>
                      <div className="font-display text-2xl text-charcoal leading-tight">{b.label}</div>
                      <div className="text-xs text-charcoal-soft">{b.hint}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <AnimatePresence>
                      {items.map((d) => {
                        const key = `${d.prescription_id}-${d.med_index}-${d.time}`;
                        const isTaking = taking === key;
                        return (
                          <motion.div
                            key={key}
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            data-testid={`dose-${key}`}
                            className={`rounded-2xl p-5 border flex items-center gap-4 transition-colors ${
                              d.taken
                                ? "bg-sage/10 border-sage/30"
                                : "bg-white border-subtle"
                            }`}
                          >
                            <div
                              className={`w-14 h-14 rounded-2xl grid place-items-center flex-shrink-0 ${
                                d.taken ? "bg-sage/20" : "bg-saffron/10"
                              }`}
                            >
                              <Pill
                                className={`w-6 h-6 ${d.taken ? "text-sage" : "text-saffron"}`}
                                strokeWidth={1.6}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className={`font-display text-xl ${d.taken ? "text-charcoal-soft line-through" : "text-charcoal"}`}>
                                  {d.name}
                                </div>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-bone border border-subtle text-charcoal-soft">
                                  {d.dose}
                                </span>
                              </div>
                              <div className="text-xs text-charcoal-soft mt-1 flex items-center gap-3 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" strokeWidth={2} />
                                  <span className="font-mono">{d.time}</span>
                                </span>
                                <span>{FOOD_TAG[d.food_instructions] || d.food_label}</span>
                                <span className="text-charcoal-soft/70">· {d.doctor_name}</span>
                              </div>
                            </div>
                            {d.taken ? (
                              <div className="text-sage flex items-center gap-1.5 text-sm">
                                <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
                                Taken
                              </div>
                            ) : (
                              <button
                                onClick={() => take(d)}
                                disabled={isTaking}
                                data-testid={`take-${key}`}
                                className="px-4 py-2 rounded-full bg-charcoal text-bone hover:bg-saffron transition inline-flex items-center gap-2 text-sm disabled:opacity-60"
                              >
                                {isTaking ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Circle className="w-4 h-4" strokeWidth={2} />
                                )}
                                Mark taken
                              </button>
                            )}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </section>
              );
            })}
          </div>

          {/* Active prescriptions summary */}
          {prescriptions.length > 0 && (
            <section className="mt-16">
              <h2 className="font-display text-3xl text-charcoal mb-5">Active prescriptions</h2>
              <div className="space-y-3">
                {prescriptions.map((p) => (
                  <div key={p.id} className="rounded-2xl bg-white border border-subtle p-5" data-testid={`rx-summary-${p.id}`}>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-saffron/10 grid place-items-center flex-shrink-0">
                        <Stethoscope className="w-4 h-4 text-saffron" strokeWidth={1.8} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-display text-lg text-charcoal">{p.doctor_name}</div>
                        <div className="text-xs text-charcoal-soft">
                          {p.doctor_specialty} · {new Date(p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {p.medications.map((m, i) => (
                            <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-bone border border-subtle">
                              {m.name} · {m.dose} · <span className="text-saffron">{m.frequency}</span>
                            </span>
                          ))}
                        </div>
                        {p.notes && (
                          <div className="mt-3 text-sm text-charcoal-soft italic">"{p.notes}"</div>
                        )}
                        <div className="mt-3 flex items-center gap-2">
                          <PrintPrescriptionLink prescriptionId={p.id} />
                          <AskFollowUpButton prescriptionId={p.id} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </DashboardShell>
  );
}

function EmptyState({ prescriptions }) {
  return (
    <div className="rounded-3xl bg-white border border-dashed border-subtle p-12 text-center" data-testid="empty-medicines">
      <div className="w-14 h-14 rounded-full bg-bone grid place-items-center mx-auto mb-4">
        <Pill className="w-6 h-6 text-charcoal-soft" strokeWidth={1.6} />
      </div>
      <div className="font-display text-2xl text-charcoal">No doses due today</div>
      <div className="mt-2 text-charcoal-soft max-w-md mx-auto">
        {prescriptions.length === 0
          ? "You don't have any active prescriptions yet. Once your doctor writes one, your medicines will appear here — with gentle alarms and streak tracking."
          : "You're all done for today. Come back tomorrow for the next round."}
      </div>
      {prescriptions.length === 0 && (
        <Link
          to="/app/patient"
          className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-saffron text-white hover:bg-saffron-hover transition"
        >
          Book a consultation
          <ArrowRight className="w-4 h-4" strokeWidth={1.8} />
        </Link>
      )}

      <div className="mt-8 flex items-center justify-center gap-2 text-xs text-charcoal-soft">
        <Sparkles className="w-3.5 h-3.5 text-saffron" />
        Alarms trigger automatically the moment your doctor sends a prescription.
      </div>
    </div>
  );
}
