import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  X,
  Loader2,
  CheckCircle2,
  Calendar,
  Clock,
  Wallet,
  Building2,
  Stethoscope,
  User,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import api, { formatApiError } from "@/lib/api";

function getDateTabs() {
  const labels = ["Today", "Tomorrow", "Day after"];
  return labels.map((label, i) => {
    const d = new Date(Date.now() + i * 86400000);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return {
      label,
      date: `${yyyy}-${mm}-${dd}`,
      formatted: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    };
  });
}

export default function SlotBookingModal({ doctor, onClose, onBooked }) {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  // Step state: 0 = Pick Slot, 1 = Review & Confirm, 2 = Success Ticket
  const [modalStep, setModalStep] = useState(0);

  const [dateTabs] = useState(getDateTabs);
  const [selectedDate, setSelectedDate] = useState(() => getDateTabs()[0].date);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Symptoms & notes
  const [symptoms, setSymptoms] = useState("");
  const [notes, setNotes] = useState("");

  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  useEffect(() => {
    if (!doctor) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    setError("");
    api.get(`/doctors/${doctor.id}/slots?date=${selectedDate}`)
      .then((res) => setSlots(res.data.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [doctor, selectedDate]);

  const handleProceedToReview = () => {
    if (!selectedSlot) return;
    setError("");
    setModalStep(1); // Go to review & confirmation step
  };

  const handleConfirmBooking = async () => {
    if (!selectedSlot || !user) return;
    setBooking(true);
    setError("");
    try {
      const { data } = await api.post("/bookings", {
        doctor_id: doctor.id,
        slot_time: selectedSlot,
        date: selectedDate,
        symptoms: symptoms.trim() || undefined,
        patient_notes: notes.trim() || undefined,
      });

      const newBooking = data.booking || data;
      setConfirmedBooking(newBooking);
      setModalStep(2); // Go to success ticket
      await refreshUser?.();
      onBooked?.();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBooking(false);
    }
  };

  if (!doctor) return null;

  const deposit = doctor.fee ? Math.round(doctor.fee * 0.2) : 100;
  const remaining = doctor.fee ? doctor.fee - deposit : 0;
  const userWallet = user?.wallet_balance ?? 0;
  const hasSufficientBalance = userWallet >= deposit;

  const selectedDateFormatted = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl border border-subtle flex flex-col">
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-subtle" />
        </div>

        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-subtle bg-bone/30">
          <div className="flex items-center gap-3">
            <img
              src={
                doctor.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.name || "D")}&background=0284c7&color=fff&size=48`
              }
              alt={doctor.name}
              className="w-11 h-11 rounded-xl object-cover flex-shrink-0 border border-subtle"
            />
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold text-charcoal leading-tight truncate">{doctor.name}</h2>
              <p className="text-xs text-charcoal-soft">{doctor.specialty} · {doctor.hospital || "Sanjeevani Clinic"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full border border-subtle flex items-center justify-center text-charcoal-soft hover:bg-bone transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* STEP 0: TIME SLOT SELECTION */}
        {/* ========================================================================= */}
        {modalStep === 0 && (
          <div className="flex-1 flex flex-col">
            {/* Date Tabs */}
            <div className="flex border-b border-subtle bg-white">
              {dateTabs.map((tab) => (
                <button
                  key={tab.date}
                  onClick={() => setSelectedDate(tab.date)}
                  className={`flex-1 py-3 text-center transition-all ${
                    selectedDate === tab.date
                      ? "border-b-2 border-saffron text-saffron font-semibold bg-saffron/5"
                      : "text-charcoal-soft hover:text-charcoal"
                  }`}
                >
                  <div className="text-[11px] uppercase tracking-wider">{tab.label}</div>
                  <div className="text-sm font-medium">{tab.formatted}</div>
                </button>
              ))}
            </div>

            {/* Slots Grid */}
            <div className="p-6 flex-1">
              {loadingSlots ? (
                <div className="flex flex-col items-center justify-center py-12 text-charcoal-soft">
                  <Loader2 className="w-7 h-7 animate-spin text-saffron mb-2" />
                  <span className="text-xs">Fetching available OPD slots…</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-charcoal-soft uppercase tracking-widest font-semibold">
                      Select consultation slot
                    </p>
                    <span className="text-xs text-charcoal-soft">
                      {slots.filter((s) => s.available).length} available
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                    {slots.map((s) => (
                      <button
                        key={s.time}
                        disabled={!s.available}
                        onClick={() => s.available && setSelectedSlot(s.time)}
                        className={`py-3 rounded-xl font-mono text-sm font-medium transition-all ${
                          !s.available
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed line-through text-xs"
                            : selectedSlot === s.time
                            ? "bg-saffron text-white shadow-md scale-105 ring-2 ring-saffron/30"
                            : "bg-bone border border-subtle hover:border-saffron text-charcoal"
                        }`}
                      >
                        {s.time}
                      </button>
                    ))}
                  </div>

                  {slots.length === 0 && (
                    <div className="text-center py-8 text-charcoal-soft text-sm">
                      No consultation slots scheduled for this date.
                    </div>
                  )}

                  {/* Slot Legend */}
                  <div className="flex items-center gap-4 mt-5 text-[11px] text-charcoal-soft pt-3 border-t border-subtle">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-bone border border-subtle inline-block" /> Available
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-saffron inline-block" /> Selected
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-gray-200 inline-block" /> Booked
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="p-6 border-t border-subtle bg-bone/20">
              {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
              {!user ? (
                <div className="text-center py-1">
                  <p className="text-xs text-charcoal-soft mb-3">Please sign in to proceed with booking</p>
                  <Link
                    to="/login"
                    className="inline-block w-full py-3 rounded-full bg-saffron text-white font-medium text-sm text-center hover:bg-saffron-hover transition-colors shadow-sm"
                  >
                    Login / Register to Book
                  </Link>
                </div>
              ) : selectedSlot ? (
                <button
                  onClick={handleProceedToReview}
                  className="w-full py-3.5 rounded-full bg-saffron text-white font-medium text-sm hover:bg-saffron-hover transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Review Booking Details</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  disabled
                  className="w-full py-3.5 rounded-full bg-gray-100 text-gray-400 font-medium text-sm cursor-not-allowed"
                >
                  Select a time slot to continue
                </button>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: REVIEW BOOKING DETAILS & CONFIRMATION */}
        {/* ========================================================================= */}
        {modalStep === 1 && (
          <div className="p-6 flex-1 flex flex-col">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-saffron font-bold mb-1">
              <span>Step 2 of 2</span>
              <span>·</span>
              <span>Review Details</span>
            </div>
            <h3 className="font-display text-2xl font-bold text-charcoal mb-4">
              Confirm Appointment
            </h3>

            {/* Appointment Summary Box */}
            <div className="rounded-2xl border border-subtle bg-bone/40 p-4 mb-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 text-charcoal text-sm font-semibold">
                  <Calendar className="w-4 h-4 text-saffron" />
                  <span>{selectedDateFormatted}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold bg-white border border-subtle px-2.5 py-1 rounded-md text-charcoal">
                  <Clock className="w-3.5 h-3.5 text-saffron" />
                  <span>{selectedSlot}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-charcoal-soft">
                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                <span>{doctor.hospital || "Sanjeevani Clinic, Indiranagar"}</span>
              </div>

              <div className="flex items-center gap-2 text-xs text-charcoal-soft">
                <User className="w-3.5 h-3.5 text-gray-400" />
                <span>Patient: <strong>{user?.name}</strong> ({user?.phone || user?.email})</span>
              </div>
            </div>

            {/* Symptoms Input (Optional) */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-charcoal mb-1">
                Reason for visit / Symptoms (Optional):
              </label>
              <input
                type="text"
                placeholder="e.g. Mild fever, persistent cough, regular follow-up"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-subtle bg-white focus:outline-none focus:border-saffron"
              />
            </div>

            {/* Financial / Deposit Breakdown Card */}
            <div className="rounded-2xl bg-charcoal text-bone p-4 mb-4">
              <div className="flex items-center justify-between text-xs text-bone/70 pb-2 border-b border-white/10">
                <span>Total Consultation Fee</span>
                <span className="font-mono font-bold text-bone">₹{doctor.fee}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-bone/90 pt-2 pb-1">
                <span className="flex items-center gap-1.5 text-saffron font-semibold">
                  <Wallet className="w-3.5 h-3.5" />
                  Deposit Due Now (20%)
                </span>
                <span className="font-mono font-bold text-saffron text-sm">₹{deposit}</span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-bone/60 pb-2">
                <span>Remaining balance at clinic visit</span>
                <span className="font-mono">₹{remaining}</span>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-bone/70">Your Wallet Balance:</span>
                <span className="font-mono font-bold text-bone">₹{userWallet}</span>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mb-3 px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-100 text-xs text-red-700">
                {error}
              </div>
            )}

            {!hasSufficientBalance && (
              <div className="mb-3 px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
                <span>Insufficient wallet balance for ₹{deposit} deposit.</span>
                <Link to="/app/patient/wallet" className="font-bold underline text-amber-900 ml-2">
                  Top up wallet &rarr;
                </Link>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2.5 mt-auto pt-2">
              <button
                type="button"
                onClick={() => setModalStep(0)}
                disabled={booking}
                className="py-3 px-4 rounded-full border border-subtle text-xs font-semibold text-charcoal hover:bg-bone transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmBooking}
                disabled={booking || !hasSufficientBalance}
                className="flex-1 py-3 px-6 rounded-full bg-saffron text-white text-xs font-bold hover:bg-saffron-hover transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
              >
                {booking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Confirming Appointment…</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Pay ₹{deposit} Deposit</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: BOOKING SUCCESS TICKET & QUEUE LINK */}
        {/* ========================================================================= */}
        {modalStep === 2 && confirmedBooking && (
          <div className="p-6 md:p-8 text-center flex-1 flex flex-col justify-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="font-display text-2xl font-bold text-charcoal">
              Booking Confirmed!
            </h3>
            <p className="text-xs text-charcoal-soft mt-1 mb-5">
              Your appointment has been registered in the live OPD system.
            </p>

            {/* Token Ticket Box */}
            <div className="rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#0d9488] to-[#10b981] p-5 text-white shadow-lg mb-5 text-left relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-white/80 font-bold">
                    OPD TOKEN NUMBER
                  </div>
                  <div className="font-mono text-4xl font-extrabold my-1">
                    #{String(confirmedBooking.token_number || 1).padStart(2, "0")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-widest text-white/80 font-bold">
                    SLOT TIME
                  </div>
                  <div className="font-mono text-lg font-bold">
                    {confirmedBooking.slot_time || selectedSlot}
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-white/20 text-xs flex justify-between items-center text-white/90">
                <span>{doctor.name} ({doctor.specialty})</span>
                <span className="font-mono text-[11px] text-white/70">Ref: {confirmedBooking.id.slice(0, 8).toUpperCase()}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              <button
                onClick={() => {
                  onClose();
                  navigate(`/app/patient/queue?bookingId=${confirmedBooking.id}`);
                }}
                className="w-full py-3.5 rounded-full bg-saffron text-white text-xs font-bold hover:bg-saffron-hover transition-all flex items-center justify-center gap-2 shadow-md"
              >
                <Sparkles className="w-4 h-4" />
                <span>Track Live Queue Position Now &rarr;</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  navigate("/app/patient");
                }}
                className="w-full py-2.5 rounded-full border border-subtle text-xs font-semibold text-charcoal hover:bg-bone transition-colors"
              >
                Go to Patient Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
