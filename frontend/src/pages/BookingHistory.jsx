import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardShell from "./DashboardShell";
import api from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { motion } from "framer-motion";
import {
  Loader2,
  Plus,
  MapPin,
  BellRing,
  Calendar,
  ArrowRight,
  Pill,
  Clock,
} from "lucide-react";
import DirectionsButton from "@/components/nirog/DirectionsButton";
import RateVisitButton from "@/components/nirog/RateVisitButton";
import FamilyFilterChips from "@/components/nirog/FamilyFilterChips";

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

export default function BookingHistory() {
  const { refreshUser } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [familyFilter, setFamilyFilter] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/bookings/me");
      setBookings(data.bookings);
    } catch (e) {
      // ignore (likely logged out)
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const arrive = async (id) => {
    await api.post(`/bookings/${id}/arrive`);
    load();
  };

  const cancel = async (id) => {
    if (!window.confirm("Cancel this booking? Your deposit will be refunded to your wallet.")) return;
    await api.post(`/bookings/${id}/cancel`);
    await Promise.all([load(), refreshUser()]);
  };

  return (
    <DashboardShell roles={["patient"]} subtitle="Your appointments" title="Every visit, in one place">
+

      <div className="mb-6 flex items-center justify-between">
        <div className="text-sm text-charcoal-soft">
          Showing all your NirogPath bookings, latest first.
        </div>
        <Link
          to="/app/patient"
          data-testid="new-booking-btn"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-saffron text-white text-sm hover:bg-saffron-hover transition"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          Book another
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-charcoal-soft">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading…
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-3xl bg-white border border-dashed border-subtle p-12 text-center" data-testid="empty-history">
          <div className="w-14 h-14 rounded-full bg-bone grid place-items-center mx-auto mb-4">
            <Calendar className="w-6 h-6 text-charcoal-soft" strokeWidth={1.6} />
          </div>
          <div className="font-display text-2xl text-charcoal">No bookings yet</div>
          <div className="mt-2 text-charcoal-soft">Start with a hospital and we'll walk you through the rest.</div>
          <Link
            to="/app/patient"
            className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-saffron text-white hover:bg-saffron-hover transition"
          >
            Book your first appointment
            <ArrowRight className="w-4 h-4" strokeWidth={1.8} />
          </Link>
        </div>
      ) : (
        <div className="space-y-3" data-testid="bookings-list">
          {bookings.filter(b => !familyFilter || b.family_member_id === familyFilter).map((b) => (
            <motion.div
              key={b.id}
              layout
              data-testid={`booking-${b.id}`}
              className="rounded-2xl bg-white border border-subtle p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-charcoal text-bone grid place-items-center flex-shrink-0">
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-widest text-bone/60">Token</div>
                  <div className="font-mono text-lg leading-none">#{b.token_number}</div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl text-charcoal">{b.doctor_name}</div>
                <div className="text-sm text-charcoal-soft">
                  {b.doctor_specialty} · <span className="font-mono">{b.slot_time}</span>
                </div>
                <div className="text-xs text-charcoal-soft flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" strokeWidth={2} />
                  {b.hospital}
                </div>
                {b.running_late && b.status !== "completed" && b.status !== "cancelled" && (
                  <div className="mt-2 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-ochre/15 text-ochre border border-ochre/30">
                    <BellRing className="w-3 h-3" />
                    Running {b.delay_minutes} min late
                  </div>
                )}
              </div>
              <div className={`text-xs px-3 py-1.5 rounded-full border ${statusStyles[b.status]}`}>
                {statusLabels[b.status]}
              </div>
              <div className="flex gap-2 flex-wrap">
                {(b.status === "booked" || b.status === "arrived" || b.status === "in_consult") && (
                  <Link
                    to={`/app/patient/queue?bookingId=${b.id}`}
                    data-testid={`live-queue-${b.id}`}
                    className="px-4 py-2 rounded-full border border-teal text-teal text-sm hover:bg-teal/10 transition inline-flex items-center gap-1.5 font-medium"
                  >
                    <Clock className="w-3.5 h-3.5" strokeWidth={2} />
                    Live Queue
                  </Link>
                )}
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
                {(b.status === "arrived" || b.status === "in_consult") && (
                  <DirectionsButton bookingId={b.id} />
                )}
                {b.status === "completed" && b.prescription_id && (
                  <Link
                    to="/app/patient/medicines"
                    data-testid={`rx-view-${b.id}`}
                    className="px-4 py-2 rounded-full border border-saffron text-saffron text-sm hover:bg-saffron/10 transition inline-flex items-center gap-1.5"
                  >
                    <Pill className="w-3.5 h-3.5" strokeWidth={2} />
                    View prescription
                  </Link>
                )}
                {b.status === "completed" && (
                  <RateVisitButton bookingId={b.id} />
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
