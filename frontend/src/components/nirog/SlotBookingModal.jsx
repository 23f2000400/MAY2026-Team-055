import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { X, Loader2, CheckCircle } from "lucide-react";
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dateTabs] = useState(getDateTabs);
  const [selectedDate, setSelectedDate] = useState(() => getDateTabs()[0].date);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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

  const handleBook = async () => {
    if (!selectedSlot || !user) return;
    setBooking(true);
    setError("");
    try {
      await api.post("/bookings", {
        doctor_id: doctor.id,
        slot_time: selectedSlot,
        date: selectedDate,
      });
      setSuccess(true);
      onBooked?.();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBooking(false);
    }
  };

  if (!doctor) return null;

  const deposit = doctor.fee ? Math.round(doctor.fee * 0.2) : 0;
  const remaining = doctor.fee ? doctor.fee - deposit : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-subtle" />
        </div>

        {/* Doctor header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-subtle">
          <div className="flex items-center gap-3">
            <img
              src={
                doctor.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.name || "D")}&background=E26D5C&color=fff&size=48`
              }
              alt={doctor.name}
              className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
            />
            <div className="min-w-0">
              <h2 className="font-display text-lg text-charcoal leading-tight truncate">{doctor.name}</h2>
              <p className="font-body text-xs text-charcoal-soft">{doctor.specialty}</p>
              <p className="font-mono text-sm text-charcoal">
                ₹{doctor.fee}
                {doctor.experience ? ` · ${doctor.experience} yrs exp` : ""}
              </p>
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

        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-sage/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9 text-sage" />
            </div>
            <h3 className="font-display text-2xl text-charcoal">Booking Confirmed!</h3>
            <p className="font-body text-charcoal-soft mt-2 mb-2">
              {doctor.name} · {selectedSlot}
            </p>
            <p className="font-body text-sm text-charcoal-soft mb-6">
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", { dateStyle: "long" })}
            </p>
            <div className="bg-bone rounded-2xl p-4 mb-6 text-left">
              <div className="flex justify-between font-body text-sm">
                <span className="text-charcoal-soft">Deposit paid</span>
                <span className="text-charcoal font-medium">₹{deposit}</span>
              </div>
              <div className="flex justify-between font-body text-sm mt-1">
                <span className="text-charcoal-soft">Pay at clinic</span>
                <span className="text-charcoal font-medium">₹{remaining}</span>
              </div>
            </div>
            <button
              onClick={() => { onClose(); navigate("/app/patient"); }}
              className="px-8 py-3 rounded-full bg-saffron text-white font-body text-sm hover:bg-saffron-hover transition-colors"
            >
              View my bookings
            </button>
          </div>
        ) : (
          <>
            {/* Date tabs */}
            <div className="flex border-b border-subtle">
              {dateTabs.map((tab) => (
                <button
                  key={tab.date}
                  onClick={() => setSelectedDate(tab.date)}
                  className={`flex-1 py-3 text-center transition-colors ${
                    selectedDate === tab.date
                      ? "border-b-2 border-saffron text-saffron"
                      : "text-charcoal-soft hover:text-charcoal"
                  }`}
                >
                  <div className="font-body text-xs">{tab.label}</div>
                  <div className="font-body text-sm font-medium">{tab.formatted}</div>
                </button>
              ))}
            </div>

            {/* Slot grid */}
            <div className="p-6">
              {loadingSlots ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-saffron" />
                </div>
              ) : (
                <>
                  <p className="font-body text-xs text-charcoal-soft mb-3 uppercase tracking-widest">
                    Select a time
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {slots.map((slot) => (
                      <button
                        key={slot.time}
                        disabled={!slot.available}
                        onClick={() => slot.available && setSelectedSlot(slot.time)}
                        className={`py-2.5 rounded-xl font-mono text-sm transition-all ${
                          !slot.available
                            ? "bg-subtle text-charcoal-soft/40 cursor-not-allowed"
                            : selectedSlot === slot.time
                            ? "bg-saffron text-white shadow-md scale-105"
                            : "bg-bone border border-subtle hover:border-saffron text-charcoal"
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-5 mt-4 text-xs font-body text-charcoal-soft">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-bone border border-subtle inline-block" />
                      Available
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-saffron inline-block" />
                      Selected
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-subtle inline-block" />
                      Booked
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* CTA */}
            <div className="px-6 pb-6 border-t border-subtle pt-4">
              {error && (
                <p className="font-body text-sm text-red-500 mb-3">{error}</p>
              )}
              {!user ? (
                <div className="text-center py-2">
                  <p className="font-body text-sm text-charcoal-soft mb-4">
                    Login to complete your booking
                  </p>
                  <Link
                    to="/login"
                    className="inline-block px-8 py-3 rounded-full bg-saffron text-white font-body text-sm hover:bg-saffron-hover transition-colors"
                  >
                    Login / Register
                  </Link>
                </div>
              ) : selectedSlot ? (
                <>
                  <button
                    onClick={handleBook}
                    disabled={booking}
                    className="w-full py-3.5 rounded-full bg-saffron text-white font-body text-sm hover:bg-saffron-hover transition-colors disabled:opacity-60"
                  >
                    {booking
                      ? "Booking..."
                      : `Confirm · ${selectedSlot} · ₹${deposit} deposit`}
                  </button>
                  <p className="text-center font-body text-xs text-charcoal-soft mt-2">
                    Remaining ₹{remaining} paid at the clinic
                  </p>
                </>
              ) : (
                <button
                  disabled
                  className="w-full py-3.5 rounded-full bg-subtle text-charcoal-soft/60 font-body text-sm cursor-not-allowed"
                >
                  Select a time slot to continue
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
