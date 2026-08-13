import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import DashboardShell from "./DashboardShell";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import {
  MapPin,
  Star,
  ChevronRight,
  ChevronLeft,
  Stethoscope,
  Calendar,
  Clock,
  Wallet,
  CheckCircle2,
  Loader2,
  Building2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Download,
  User,
} from "lucide-react";
import FamilySelector from "@/components/nirog/FamilySelector";
import WaitlistButton from "@/components/nirog/WaitlistButton";
import AiDoctorRecommender from "@/components/nirog/AiDoctorRecommender";

const STEPS = ["Hospital", "Doctor", "Slot", "Payment", "Confirmation"];

export default function BookingFlow() {
  const nav = useNavigate();
  const { user, refreshUser } = useAuth();

  const [step, setStep] = useState(0);
  const [hospitals, setHospitals] = useState([]);
  const [hospital, setHospital] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [doctor, setDoctor] = useState(null);
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState(null);
  const [bookingForId, setBookingForId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [booking, setBooking] = useState(null);
  const [err, setErr] = useState("");

  // Step 1: hospitals
  useEffect(() => {
    api.get("/hospitals")
      .then((r) => setHospitals(r.data.hospitals))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const pickHospital = async (h) => {
    setLoading(true);
    setHospital(h);
    try {
      const { data } = await api.get(`/hospitals/${h.id}/doctors`);
      setDoctors(data.doctors);
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const pickDoctor = async (d) => {
    setLoading(true);
    setDoctor(d);
    try {
      const { data } = await api.get(`/doctors/${d.id}/slots`);
      setSlots(data.slots);
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const handleAiSelectDoctor = async (d) => {
    setLoading(true);
    setDoctor(d);
    try {
      const { data } = await api.get(`/doctors/${d.id}/slots`);
      setSlots(data.slots);
      setStep(2);
    } catch (e) {
      setErr(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const chooseSlot = (s) => {
    setSlot(s);
    setStep(3);
  };

  const pay = async () => {
    setProcessing(true);
    setErr("");
    try {
      const { data } = await api.post("/bookings", {
        doctor_id: doctor.id,
        slot_time: slot,
        ...(bookingForId ? { family_member_id: bookingForId } : {}),
      });
      setBooking(data.booking);
      await refreshUser();
      setStep(4);
    } catch (e) {
      setErr(formatApiError(e));
    } finally {
      setProcessing(false);
    }
  };

  const back = () => {
    setErr("");
    if (step > 0) setStep(step - 1);
  };

  const reset = () => {
    setStep(0);
    setHospital(null);
    setDoctor(null);
    setSlot(null);
    setSlots([]);
    setBooking(null);
    setErr("");
  };

  const deposit = doctor ? Math.round(doctor.fee * 0.2) : 0;

  return (
    <DashboardShell roles={["patient"]} subtitle="Book a visit" title="Where does it hurt today?">
      {/* Stepper */}
      <div className="mb-10">
        <div className="flex items-center gap-2 overflow-x-auto pb-2" data-testid="booking-stepper">
          {STEPS.map((label, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <React.Fragment key={label}>
                <div
                  className={`flex items-center gap-2 flex-shrink-0 ${active ? "" : done ? "opacity-100" : "opacity-40"}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full grid place-items-center text-xs font-mono border-2 ${
                      active
                        ? "bg-saffron text-white border-saffron"
                        : done
                        ? "bg-sage text-white border-sage"
                        : "bg-white border-subtle text-charcoal-soft"
                    }`}
                  >
                    {done ? <CheckCircle2 className="w-4 h-4" strokeWidth={2.2} /> : i + 1}
                  </div>
                  <span className={`text-sm ${active ? "text-charcoal font-medium" : "text-charcoal-soft"}`}>{label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px min-w-[24px] ${i < step ? "bg-sage" : "bg-subtle"}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {step > 0 && step < 4 && (
        <button
          onClick={back}
          data-testid="booking-back"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-charcoal-soft hover:text-saffron transition"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={1.8} />
          Back to {STEPS[step - 1]}
        </button>
      )}

      <AnimatePresence mode="wait">
        {/* Step 0: hospitals */}
        {step === 0 && (
          <motion.section
            key="s0"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            data-testid="step-hospitals"
          >
            <AiDoctorRecommender onSelectRecommendation={handleAiSelectDoctor} />
            {loading ? (
              <Loading />
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {hospitals.map((h) => (
                  <motion.button
                    key={h.id}
                    whileHover={{ y: -4 }}
                    onClick={() => pickHospital(h)}
                    data-testid={`hospital-card-${h.id}`}
                    className="text-left rounded-3xl bg-white border border-subtle overflow-hidden hover:shadow-hoverGlow transition-shadow group"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-subtle">
                      {h.image ? (
                        <img src={h.image} alt={h.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-charcoal-soft">
                          <Building2 className="w-10 h-10" strokeWidth={1.4} />
                        </div>
                      )}
                      <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur text-xs">
                        <Star className="w-3 h-3 fill-saffron text-saffron" />
                        <span className="font-mono font-medium">{h.rating}</span>
                        <span className="text-charcoal-soft">({h.reviews})</span>
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="font-display text-2xl text-charcoal leading-tight">{h.name}</div>
                      <div className="text-sm text-charcoal-soft flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5" strokeWidth={1.8} />
                        {h.area}, {h.city}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {(h.tags || []).map((t) => (
                          <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-bone border border-subtle text-charcoal-soft">
                            {t}
                          </span>
                        ))}
                      </div>
                      <div className="mt-4 pt-4 border-t border-subtle flex items-center justify-between text-sm">
                        <span className="text-charcoal-soft">
                          {h.doctor_count || 0} doctors · {(h.specialties || []).length} specialties
                        </span>
                        <span className="text-saffron flex items-center gap-1 font-medium">
                          Select
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={1.8} />
                        </span>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.section>
        )}

        {/* Step 1: doctors */}
        {step === 1 && hospital && (
          <motion.section
            key="s1"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            data-testid="step-doctors"
          >
            <div className="rounded-3xl overflow-hidden border border-subtle bg-white mb-6">
              <div className="flex items-center gap-5 p-5">
                {hospital.image && (
                  <img src={hospital.image} alt={hospital.name} className="w-20 h-20 object-cover rounded-2xl flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-display text-2xl text-charcoal">{hospital.name}</div>
                  <div className="text-sm text-charcoal-soft flex items-center gap-2 mt-1">
                    <MapPin className="w-3.5 h-3.5" strokeWidth={1.8} />
                    {hospital.area}, {hospital.city}
                    <span>·</span>
                    <Star className="w-3.5 h-3.5 fill-saffron text-saffron" />
                    <span className="font-mono">{hospital.rating}</span>
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <Loading />
            ) : (
              <div className="space-y-3">
                {doctors.map((d) => (
                  <motion.button
                    key={d.id}
                    whileHover={{ x: 4 }}
                    onClick={() => pickDoctor(d)}
                    data-testid={`doctor-row-${d.id}`}
                    className="w-full text-left rounded-2xl bg-white border border-subtle p-5 flex items-center gap-4 hover:shadow-hoverGlow hover:border-saffron transition-all group"
                  >
                    <div className="w-16 h-16 rounded-full bg-saffron/10 overflow-hidden flex-shrink-0 grid place-items-center">
                      {d.avatar ? (
                        <img src={d.avatar} alt={d.name} className="w-full h-full object-cover" />
                      ) : (
                        <Stethoscope className="w-6 h-6 text-saffron" strokeWidth={1.6} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display text-xl text-charcoal">{d.name}</div>
                      <div className="text-sm text-charcoal-soft">{d.specialty}</div>
                      <div className="text-xs text-charcoal-soft mt-1 flex items-center gap-3 flex-wrap">
                        {d.experience_years && <span>{d.experience_years}+ yrs experience</span>}
                        {d.rating && (
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-saffron text-saffron" />
                            <span className="font-mono">{d.rating}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right hidden sm:block">
                      <div className="text-xs uppercase tracking-widest text-charcoal-soft">Consultation</div>
                      <div className="font-mono text-lg">₹{d.fee}</div>
                      <div className="text-xs text-saffron mt-0.5">₹{Math.round(d.fee * 0.2)} deposit</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-charcoal-soft group-hover:text-saffron group-hover:translate-x-1 transition-all" strokeWidth={1.8} />
                  </motion.button>
                ))}
              </div>
            )}
          </motion.section>
        )}

        {/* Step 2: slot */}
        {step === 2 && doctor && (
          <motion.section
            key="s2"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            data-testid="step-slot"
          >
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left: doctor context card */}
              <div className="lg:col-span-1">
                <div className="rounded-3xl bg-white border border-subtle p-6 sticky top-24">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden mb-4">
                    {doctor.avatar ? (
                      <img src={doctor.avatar} alt={doctor.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-saffron/10 grid place-items-center">
                        <Stethoscope className="w-8 h-8 text-saffron" strokeWidth={1.4} />
                      </div>
                    )}
                  </div>
                  <div className="font-display text-2xl text-charcoal leading-tight">{doctor.name}</div>
                  <div className="text-sm text-charcoal-soft mt-1">{doctor.specialty}</div>
                  <div className="text-xs text-charcoal-soft mt-2 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" strokeWidth={2} />
                    {doctor.hospital}
                  </div>
                  <div className="mt-5 pt-5 border-t border-subtle grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-charcoal-soft">Fee</div>
                      <div className="font-mono text-lg">₹{doctor.fee}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-saffron">Deposit</div>
                      <div className="font-mono text-lg text-saffron">₹{Math.round(doctor.fee * 0.2)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: slot picker */}
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-3xl bg-white border border-subtle p-6">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-saffron font-semibold">
                    <Calendar className="w-3.5 h-3.5" />
                    Today · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
                  </div>
                  <div className="mt-4 font-display text-2xl text-charcoal leading-tight">Pick a slot</div>
                  <p className="text-sm text-charcoal-soft mt-1">
                    Struck-through slots are already taken. Every slot is a real, committed appointment.
                  </p>
                  <div className="mt-4">
                    <FamilySelector onChange={setBookingForId} />
                  </div>

                  <div className="mt-6">
                    <div className="text-xs uppercase tracking-widest text-charcoal-soft mb-3">Morning</div>
                    <SlotGrid slots={slots.filter((s) => s.time < "12:00")} selected={slot} onPick={chooseSlot} doctorId={doctor?.id} />
                  </div>
                  <div className="mt-6">
                    <div className="text-xs uppercase tracking-widest text-charcoal-soft mb-3">Afternoon</div>
                    <SlotGrid slots={slots.filter((s) => s.time >= "12:00")} selected={slot} onPick={chooseSlot} doctorId={doctor?.id} />
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* Step 3: payment */}
        {step === 3 && doctor && slot && (
          <motion.section
            key="s3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            data-testid="step-payment"
          >
            <div className="grid lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3 rounded-3xl bg-white border border-subtle p-8">
                <div className="text-xs uppercase tracking-[0.25em] text-saffron font-semibold">Order summary</div>
                <div className="mt-4 font-display text-3xl text-charcoal leading-tight">Confirm & pay deposit</div>

                <div className="mt-6 space-y-4">
                  <Row label="Hospital" value={hospital?.name} />
                  <Row label="Doctor" value={`${doctor.name} · ${doctor.specialty}`} />
                  <Row label="Date & slot" value={`Today · ${slot}`} />
                  <Row label="Consultation fee" value={`₹${doctor.fee}`} mono />
                  <div className="pt-4 border-t border-subtle" />
                  <Row label="Deposit due now (20%)" value={`₹${deposit}`} mono highlight />
                  <Row label={<span className="text-charcoal-soft">Balance at visit</span>} value={<span className="text-charcoal-soft">₹{doctor.fee - deposit}</span>} mono />
                </div>

                <div className="mt-6 flex items-start gap-3 p-4 rounded-2xl bg-sage/10 border border-sage/20">
                  <ShieldCheck className="w-5 h-5 text-sage flex-shrink-0 mt-0.5" strokeWidth={1.8} />
                  <div className="text-sm text-charcoal">
                    <div className="font-medium">Outcome-based refund</div>
                    <div className="text-charcoal-soft">
                      Cancel any time. If your slot gets filled, we refund the full deposit. If not, it goes to the doctor whose time was blocked.
                    </div>
                  </div>
                </div>

                {err && (
                  <div data-testid="payment-error" className="mt-4 text-sm px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700">
                    {err}
                  </div>
                )}
              </div>

              <div className="lg:col-span-2">
                <div className="rounded-3xl bg-charcoal text-bone p-8 sticky top-24">
                  <div className="text-xs uppercase tracking-widest text-bone/60">Pay with</div>
                  <div className="mt-3 flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-saffron" strokeWidth={1.8} />
                    <span className="font-display text-2xl">NirogPath Wallet</span>
                  </div>
                  <div className="mt-4 text-bone/60 text-sm">Balance</div>
                  <div className="font-mono text-4xl mt-1">₹{user?.wallet_balance ?? 0}</div>
                  <div className="mt-2 text-xs text-bone/50">
                    After payment: <span className="font-mono">₹{(user?.wallet_balance ?? 0) - deposit}</span>
                  </div>

                  <button
                    disabled={processing || (user?.wallet_balance ?? 0) < deposit}
                    onClick={pay}
                    data-testid="pay-btn"
                    className={`mt-6 w-full py-4 rounded-full font-medium transition-colors flex items-center justify-center gap-2 ${
                      processing || (user?.wallet_balance ?? 0) < deposit
                        ? "bg-bone/10 text-bone/40 cursor-not-allowed"
                        : "bg-saffron text-white hover:bg-saffron-hover"
                    }`}
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing…
                      </>
                    ) : (
                      <>
                        Pay ₹{deposit} deposit
                        <ArrowRight className="w-4 h-4" strokeWidth={1.8} />
                      </>
                    )}
                  </button>

                  {(user?.wallet_balance ?? 0) < deposit && (
                    <div className="mt-3 text-xs text-ochre">
                      Insufficient balance. Try a lower-fee doctor for the demo.
                    </div>
                  )}

                  <div className="mt-8 text-xs text-bone/50 flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-saffron mt-0.5" />
                    <span>Wallet is a mocked payment method for the MVP. Razorpay & Stripe integration coming next.</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* Step 4: confirmation ticket */}
        {step === 4 && booking && (
          <motion.section
            key="s4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4 }}
            data-testid="step-confirmation"
            className="max-w-2xl mx-auto"
          >
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 12 }}
                className="w-16 h-16 rounded-full bg-sage/20 grid place-items-center mx-auto"
              >
                <CheckCircle2 className="w-8 h-8 text-sage" strokeWidth={2} />
              </motion.div>
              <div className="mt-5 font-display text-4xl text-charcoal leading-tight">You're booked.</div>
              <div className="mt-2 text-charcoal-soft">Show this ticket at reception when you arrive.</div>
            </div>

            {/* Ticket */}
            <div className="relative rounded-3xl bg-white border border-subtle shadow-medium overflow-hidden" data-testid="booking-ticket">
              <div className="bg-charcoal text-bone p-8 relative">
                <div className="absolute top-0 left-0 right-0 flex justify-between px-8 pt-3 text-[10px] uppercase tracking-widest text-bone/40">
                  <span>NirogPath</span>
                  <span className="font-mono">{booking.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs uppercase tracking-widest text-saffron font-semibold">
                  <span className="w-2 h-2 rounded-full bg-sage animate-pulseDot" />
                  Confirmed
                </div>
                <div className="mt-3 font-mono text-6xl">#{String(booking.token_number).padStart(2, "0")}</div>
                <div className="mt-2 text-bone/70 text-sm">Your token</div>
              </div>

              {/* Ticket perforation */}
              <div className="relative">
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-subtle" />
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-bone border border-subtle" />
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-bone border border-subtle" />
                <div className="h-6" />
              </div>

              <div className="p-8 grid grid-cols-2 gap-5">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-charcoal-soft">Doctor</div>
                  <div className="font-display text-xl text-charcoal mt-1">{booking.doctor_name}</div>
                  <div className="text-xs text-charcoal-soft">{booking.doctor_specialty}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-charcoal-soft">Slot</div>
                  <div className="font-mono text-xl text-charcoal mt-1">{booking.slot_time}</div>
                  <div className="text-xs text-charcoal-soft">{booking.date}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-charcoal-soft">Hospital</div>
                  <div className="text-charcoal mt-1">{booking.hospital}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-charcoal-soft">Patient</div>
                  <div className="text-charcoal mt-1">{booking.patient_name}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-saffron">Deposit paid</div>
                  <div className="font-mono text-xl text-saffron mt-1">₹{booking.deposit_paid}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-charcoal-soft">Balance at visit</div>
                  <div className="font-mono text-xl text-charcoal mt-1">₹{booking.fee_total - booking.deposit_paid}</div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={reset}
                data-testid="book-another"
                className="px-6 py-3 rounded-full border border-charcoal/15 text-charcoal hover:border-charcoal transition"
              >
                Book another appointment
              </button>
              <Link
                to="/app/patient/history"
                data-testid="view-history"
                className="px-6 py-3 rounded-full bg-charcoal text-bone hover:bg-saffron transition inline-flex items-center justify-center gap-2"
              >
                View my bookings
                <ArrowRight className="w-4 h-4" strokeWidth={1.8} />
              </Link>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </DashboardShell>
  );
}

function Row({ label, value, mono, highlight }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-charcoal-soft">{label}</div>
      <div className={`${mono ? "font-mono" : ""} ${highlight ? "text-saffron text-xl font-medium" : "text-charcoal"}`}>{value}</div>
    </div>
  );
}

function SlotGrid({ slots, selected, onPick, doctorId }) {
  return (
    <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
      {slots.map((s) => (
        <div key={s.time} className="relative">
          <button
            disabled={!s.available}
            onClick={() => s.available && onPick(s.time)}
            data-testid={`slot-${s.time}`}
            className={`w-full px-3 py-2.5 rounded-xl text-center border transition ${
              !s.available
                ? "bg-charcoal/5 text-charcoal-soft/40 line-through cursor-not-allowed border-transparent"
                : selected === s.time
                ? "border-saffron bg-saffron/10 text-saffron"
                : "border-subtle hover:border-charcoal/40 text-charcoal"
            }`}
          >
            <span className="font-mono text-sm">{s.time}</span>
          </button>
          {!s.available && doctorId && (
            <div className="absolute -top-1 -right-1">
              <WaitlistButton slotTime={s.time} doctorId={doctorId} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center gap-2 text-charcoal-soft py-10">
      <Loader2 className="w-4 h-4 animate-spin" />
      Loading…
    </div>
  );
}
