import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardShell from "./DashboardShell";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Stethoscope,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  X,
  Loader2,
  BellRing,
  User,
  Wallet,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Building2,
  Sparkles,
  Activity,
} from "lucide-react";

const statusStyles = {
  booked: "bg-teal/10 text-teal border-teal/20",
  arrived: "bg-sage/15 text-sage border-sage/30",
  in_consult: "bg-saffron/15 text-saffron border-saffron/30",
  completed: "bg-charcoal/5 text-charcoal-soft border-subtle",
  cancelled: "bg-red-50 text-red-600 border-red-100",
};

const statusLabels = {
  booked: "Booked",
  arrived: "You're in the queue",
  in_consult: "In consultation",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function PatientDashboard() {
  const { user, refreshUser } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(null); // doctor object
  const [modalStep, setModalStep] = useState(0); // 0 = pick slot, 1 = confirmation review, 2 = token ticket
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [symptoms, setSymptoms] = useState("");
  const [booking, setBooking] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [d, b] = await Promise.all([api.get("/doctors"), api.get("/bookings/me")]);
      setDoctors(d?.data?.doctors || []);
      setBookings(b?.data?.bookings || []);
    } catch (e) {
      // Silently ignore — likely unauthenticated (logout race) or transient
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const openPicker = async (doc) => {
    setErr("");
    setMsg("");
    setPicking(doc);
    setModalStep(0);
    setSelectedSlot(null);
    setSymptoms("");
    setConfirmedBooking(null);
    const { data } = await api.get(`/doctors/${doc.id}/slots`);
    setSlots(data.slots);
  };

  const proceedToReview = () => {
    if (!selectedSlot) return;
    setErr("");
    setModalStep(1); // Confirmation review step
  };

  const confirmBooking = async () => {
    if (!selectedSlot || !picking) return;
    setBooking(true);
    setErr("");
    try {
      const { data } = await api.post("/bookings", {
        doctor_id: picking.id,
        slot_time: selectedSlot,
        symptoms: symptoms.trim() || undefined,
      });
      const newBooking = data.booking || data;
      setConfirmedBooking(newBooking);
      setModalStep(2); // Confirmation ticket step
      setMsg(`Booked with ${picking.name} · Token #${newBooking.token_number}`);
      await Promise.all([load(), refreshUser()]);
    } catch (e) {
      setErr(formatApiError(e));
    } finally {
      setBooking(false);
    }
  };

  const arrive = async (id) => {
    await api.post(`/bookings/${id}/arrive`);
    load();
  };

  const cancel = async (id) => {
    if (!confirm("Cancel this booking? Your ₹deposit will be refunded to wallet.")) return;
    await api.post(`/bookings/${id}/cancel`);
    await Promise.all([load(), refreshUser()]);
  };

  return (
    <DashboardShell roles={["patient"]} subtitle="Your health, your schedule" title="Book a consultation">
      {msg && (
        <div data-testid="patient-toast" className="mb-6 px-5 py-3.5 rounded-2xl bg-sage/15 border border-sage/30 text-sage-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-sage" strokeWidth={2} />
          {msg}
        </div>
      )}

      <section data-testid="doctor-list" className="grid md:grid-cols-3 gap-5">
        {doctors.map((d) => (
          <motion.button
            key={d.id}
            whileHover={{ y: -4 }}
            data-testid={`book-doctor-${d.id}`}
            onClick={() => openPicker(d)}
            className="text-left rounded-3xl bg-white border border-subtle p-6 hover:shadow-hoverGlow transition-shadow"
          >
            <div className="w-12 h-12 rounded-full bg-saffron/10 grid place-items-center">
              <Stethoscope className="w-5 h-5 text-saffron" strokeWidth={1.8} />
            </div>
            <div className="mt-5 font-display text-2xl text-charcoal leading-tight">{d.name}</div>
            <div className="text-sm text-charcoal-soft mt-1">{d.specialty}</div>
            <div className="text-xs text-charcoal-soft mt-2 flex items-center gap-1.5">
              <MapPin className="w-3 h-3" strokeWidth={2} />
              {d.hospital}
            </div>
            <div className="mt-5 pt-5 border-t border-subtle flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest text-charcoal-soft">Consultation</div>
                <div className="font-mono text-lg">₹{d.fee}</div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-widest text-saffron">Deposit</div>
                <div className="font-mono text-lg text-saffron">₹{Math.round(d.fee * 0.2)}</div>
              </div>
            </div>
          </motion.button>
        ))}
      </section>

      <section className="mt-16">
        <h2 className="font-display text-3xl text-charcoal mb-6">Your bookings</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-charcoal-soft">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading…
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-charcoal-soft rounded-2xl bg-white border border-dashed border-subtle p-8" data-testid="empty-bookings">
            No bookings yet. Pick a doctor above to get started.
          </div>
        ) : (
          <div className="space-y-3" data-testid="bookings-list">
            {(bookings || []).some((b) => b?.status === "arrived" || b?.status === "in_consult" || b?.status === "booked") && (
              <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#0d9488] to-[#10b981] text-white flex items-center justify-between shadow-md">
                <div>
                  <div className="text-xs uppercase tracking-widest text-white/80 font-medium">Live Queue Active</div>
                  <div className="font-display text-xl text-white mt-0.5">Track your position & wait time in real-time</div>
                </div>
                <Link
                  to="/app/patient/queue"
                  className="px-5 py-2.5 rounded-full bg-white text-emerald-800 font-medium text-sm hover:bg-white/90 transition shadow-sm flex items-center gap-1.5 flex-shrink-0"
                >
                  <Clock className="w-4 h-4 text-emerald-600" />
                  View Live Queue
                </Link>
              </div>
            )}
            {(bookings || []).map((b) => (
              <div
                key={b.id}
                data-testid={`booking-${b.id}`}
                className="rounded-2xl bg-white border border-subtle p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4"
              >
                <div className="w-14 h-14 rounded-2xl bg-charcoal text-bone grid place-items-center flex-shrink-0">
                  <div className="text-center">
                    <div className="text-[10px] uppercase tracking-widest text-bone/60">Token</div>
                    <div className="font-mono text-lg leading-none">#{b.token_number}</div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-xl text-charcoal">{b.doctor_name}</div>
                  <div className="text-sm text-charcoal-soft">
                    {b.doctor_specialty} · slot <span className="font-mono">{b.slot_time}</span> · {b.hospital}
                  </div>
                  {b.running_late && b.status !== "completed" && b.status !== "cancelled" && (
                    <div className="mt-2 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-ochre/15 text-ochre-700 border border-ochre/30">
                      <BellRing className="w-3 h-3" />
                      Doctor is running {b.delay_minutes} min late
                    </div>
                  )}
                </div>
                <div className={`text-xs px-3 py-1.5 rounded-full border ${statusStyles[b.status]}`}>
                  {statusLabels[b.status]}
                </div>
                <div className="flex gap-2">
                  {b.status === "booked" && (
                    <>
                      <button
                        data-testid={`arrive-${b.id}`}
                        onClick={() => arrive(b.id)}
                        className="px-4 py-2 rounded-full bg-saffron text-white text-sm hover:bg-saffron-hover transition"
                      >
                        I've arrived
                      </button>
                      <button
                        data-testid={`cancel-${b.id}`}
                        onClick={() => cancel(b.id)}
                        className="px-4 py-2 rounded-full border border-subtle text-charcoal-soft text-sm hover:border-charcoal transition"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <AnimatePresence>
        {picking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-charcoal/60 backdrop-blur-sm grid place-items-center px-4"
            onClick={() => setPicking(null)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-white rounded-3xl w-full max-w-lg p-8 shadow-medium"
              data-testid="slot-modal"
            >
              <button
                data-testid="close-slot-modal"
                onClick={() => setPicking(null)}
                className="absolute top-5 right-5 w-9 h-9 rounded-full grid place-items-center border border-subtle text-charcoal-soft hover:border-charcoal transition z-10"
              >
                <X className="w-4 h-4" strokeWidth={1.8} />
              </button>

              {/* STEP 0: SLOT SELECTION */}
              {modalStep === 0 && (
                <div>
                  <div className="text-xs uppercase tracking-[0.25em] text-saffron font-semibold">Step 1 of 2 · Select Slot</div>
                  <div className="mt-2 font-display text-3xl text-charcoal leading-tight">{picking.name}</div>
                  <div className="text-sm text-charcoal-soft">
                    {picking.specialty} · {picking.hospital}
                  </div>

                  <div className="mt-6 grid grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-1">
                    {slots.map((s) => (
                      <button
                        key={s.time}
                        disabled={!s.available}
                        data-testid={`slot-btn-${s.time}`}
                        onClick={() => setSelectedSlot(s.time)}
                        className={`p-3 rounded-xl text-center transition border ${
                          !s.available
                            ? "bg-charcoal/5 text-charcoal-soft/40 line-through cursor-not-allowed border-transparent"
                            : selectedSlot === s.time
                            ? "border-saffron bg-saffron/10 text-saffron font-semibold shadow-sm"
                            : "border-subtle hover:border-charcoal/40 text-charcoal"
                        }`}
                      >
                        <div className="font-mono text-sm">{s.time}</div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-6 flex items-center justify-between p-4 rounded-2xl bg-bone border border-subtle">
                    <div>
                      <div className="text-xs uppercase tracking-widest text-charcoal-soft">Deposit (20%)</div>
                      <div className="font-mono text-2xl font-bold text-charcoal">₹{Math.round(picking.fee * 0.2)}</div>
                    </div>
                    <button
                      disabled={!selectedSlot}
                      onClick={proceedToReview}
                      className={`px-5 py-3 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                        selectedSlot
                          ? "bg-saffron text-white hover:bg-saffron-hover shadow-md"
                          : "bg-subtle text-charcoal-soft/60 cursor-not-allowed"
                      }`}
                    >
                      <span>Review Details</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 1: PRE-BOOKING CONFIRMATION & REVIEW */}
              {modalStep === 1 && (
                <div>
                  <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-saffron font-bold mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Step 2 of 2 · Review & Confirm</span>
                  </div>
                  <h3 className="font-display text-2xl font-bold text-charcoal mb-4">
                    Confirm Appointment
                  </h3>

                  {/* Summary Card */}
                  <div className="rounded-2xl border border-subtle bg-bone/50 p-4 space-y-3 mb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-display text-lg font-bold text-charcoal">{picking.name}</div>
                        <div className="text-xs text-saffron font-medium">{picking.specialty}</div>
                        <div className="text-xs text-charcoal-soft mt-0.5 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          <span>{picking.hospital}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono font-bold bg-white border border-subtle px-2.5 py-1 rounded-md text-charcoal inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-saffron" />
                          <span>Today · {selectedSlot}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-subtle flex items-center justify-between text-xs text-charcoal-soft">
                      <span>Patient: <strong>{user?.name}</strong></span>
                      <span>Contact: {user?.phone || user?.email}</span>
                    </div>
                  </div>

                  {/* Symptoms Input */}
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-charcoal mb-1 flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5 text-saffron" />
                      <span>Reason for Visit / Symptoms (Optional):</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mild fever, persistent cough, regular follow-up"
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-subtle bg-white focus:outline-none focus:border-saffron text-charcoal"
                    />
                  </div>

                  {/* Fee Breakdown */}
                  <div className="rounded-2xl bg-charcoal text-bone p-4 mb-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-bone/70">
                      <span>Total Consultation Fee:</span>
                      <span className="font-mono text-white font-semibold">₹{picking.fee}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-saffron font-bold">
                      <span className="flex items-center gap-1">
                        <Wallet className="w-3.5 h-3.5" />
                        20% Deposit (Due Now):
                      </span>
                      <span className="font-mono text-sm">₹{Math.round(picking.fee * 0.2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-bone/60 pt-1 border-t border-white/10">
                      <span>Remaining balance at clinic:</span>
                      <span className="font-mono">₹{picking.fee - Math.round(picking.fee * 0.2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-bone/80 pt-1">
                      <span>Your Wallet Balance:</span>
                      <span className="font-mono font-bold text-white">₹{user?.wallet_balance ?? 0}</span>
                    </div>
                  </div>

                  {/* Refund policy snippet */}
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-sage/10 border border-sage/20 text-xs text-charcoal mb-4">
                    <ShieldCheck className="w-4 h-4 text-sage flex-shrink-0" />
                    <span>100% deposit refund if you cancel and slot gets filled.</span>
                  </div>

                  {err && (
                    <div data-testid="booking-error" className="mb-3 text-xs px-3.5 py-2 rounded-xl bg-red-50 border border-red-100 text-red-700">
                      {err}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => setModalStep(0)}
                      disabled={booking}
                      className="py-3 px-4 rounded-full border border-subtle text-xs font-semibold text-charcoal hover:bg-bone transition-colors flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>

                    <button
                      type="button"
                      disabled={booking}
                      data-testid="confirm-booking-btn"
                      onClick={confirmBooking}
                      className="flex-1 py-3 px-6 rounded-full bg-saffron text-white text-xs font-bold hover:bg-saffron-hover transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                    >
                      {booking ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Confirming Appointment…</span>
                        </>
                      ) : (
                        <>
                          <span>Confirm & Pay ₹{Math.round(picking.fee * 0.2)}</span>
                          <CheckCircle2 className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: CONFIRMATION TOKEN TICKET */}
              {modalStep === 2 && confirmedBooking && (
                <div className="text-center py-2">
                  <div className="w-12 h-12 rounded-full bg-sage/20 text-sage flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="font-display text-2xl font-bold text-charcoal">
                    Appointment Confirmed!
                  </h3>
                  <p className="text-xs text-charcoal-soft mt-1 mb-4">
                    Your appointment has been registered in the live OPD queue.
                  </p>

                  <div className="rounded-2xl bg-charcoal text-bone p-5 mb-5 text-left relative overflow-hidden">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-saffron font-bold">OPD TOKEN</div>
                        <div className="font-mono text-4xl font-extrabold my-1">
                          #{String(confirmedBooking.token_number || 1).padStart(2, "0")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-widest text-bone/60">SLOT TIME</div>
                        <div className="font-mono text-lg font-bold">{confirmedBooking.slot_time || selectedSlot}</div>
                      </div>
                    </div>
                    <div className="pt-3 mt-3 border-t border-white/10 text-xs flex justify-between items-center text-bone/80">
                      <span>{picking.name} · {picking.specialty}</span>
                      <span className="font-mono text-[11px] text-bone/50">Ref: {confirmedBooking.id?.slice(0, 8).toUpperCase()}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Link
                      to={`/app/patient/queue?bookingId=${confirmedBooking.id}`}
                      onClick={() => setPicking(null)}
                      className="w-full py-3 rounded-full bg-saffron text-white text-xs font-bold hover:bg-saffron-hover transition-all flex items-center justify-center gap-2 shadow-md"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Track Live Queue Position &rarr;</span>
                    </Link>
                    <button
                      onClick={() => setPicking(null)}
                      className="w-full py-2.5 rounded-full border border-subtle text-xs font-semibold text-charcoal hover:bg-bone transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardShell>
  );
}
