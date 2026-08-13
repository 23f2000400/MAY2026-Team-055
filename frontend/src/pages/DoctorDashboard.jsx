import React, { useEffect, useState } from "react";
import DashboardShell from "./DashboardShell";
import PrescriptionModal from "./PrescriptionModal";
import api from "@/lib/api";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  Loader2,
  Phone,
  UserRound,
  BellRing,
  RotateCcw,
  FileText,
  SkipForward,
} from "lucide-react";
import DoctorReviewsTab from "@/components/nirog/DoctorReviewsTab";
import UrgencyChip from "@/components/nirog/UrgencyChip";

const statusBadge = {
  booked: "bg-teal/10 text-teal border-teal/20",
  arrived: "bg-sage/15 text-sage border-sage/30",
  in_consult: "bg-saffron text-white border-saffron",
  completed: "bg-charcoal/5 text-charcoal-soft border-subtle",
  cancelled: "bg-red-50 text-red-600 border-red-100",
};

const labels = {
  booked: "Booked",
  arrived: "Arrived",
  in_consult: "In consult",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function DoctorDashboard() {
  const [queue, setQueue] = useState([]);
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runningLate, setRunningLate] = useState(false);
  const [rxFor, setRxFor] = useState(null);
  const [skipping, setSkipping] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/doctor/queue");
      setQueue(data?.queue || []);
      setDoctor(data?.doctor || null);
      setRunningLate((data?.queue || []).some((b) => b?.running_late));
    } catch (e) {
      // ignore transient polling errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const i = setInterval(load, 8000);
    return () => clearInterval(i);
  }, []);

  const act = async (id, path) => {
    await api.post(`/doctor/bookings/${id}/${path}`);
    load();
  };

  const skipPrescription = async (booking) => {
    if (!window.confirm(`Complete for ${booking.patient_name} without a prescription?`)) return;
    setSkipping(true);
    try {
      await api.post(`/doctor/bookings/${booking.id}/complete`);
      load();
    } finally {
      setSkipping(false);
    }
  };

  const toggleLate = async () => {
    const next = !runningLate;
    setRunningLate(next);
    await api.post("/doctor/set-late", { running_late: next, delay_minutes: 40 });
    load();
  };

  const stats = queue.reduce(
    (a, b) => ({ ...a, [b.status]: (a[b.status] || 0) + 1 }),
    {}
  );
  const inConsult = queue.find((b) => b.status === "in_consult");
  const nextUp = queue.find((b) => b.status === "arrived") || queue.find((b) => b.status === "booked");

  return (
    <DashboardShell roles={["doctor"]} subtitle="Today's clinic" title="Your live queue">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3" data-testid="doctor-stats">
        {[
          { k: "booked", label: "Booked", color: "text-teal" },
          { k: "arrived", label: "Arrived", color: "text-sage" },
          { k: "in_consult", label: "In consult", color: "text-saffron" },
          { k: "completed", label: "Completed", color: "text-charcoal" },
          { k: "cancelled", label: "Cancelled", color: "text-red-600" },
        ].map((s) => (
          <div key={s.k} className="rounded-2xl bg-white border border-subtle p-5">
            <div className="text-xs uppercase tracking-widest text-charcoal-soft">{s.label}</div>
            <div className={`font-mono text-3xl mt-2 ${s.color}`}>{stats[s.k] || 0}</div>
          </div>
        ))}
      </div>

      {/* Now serving + running late toggle */}
      <div className="mt-8 grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-3xl bg-charcoal text-bone p-8">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-bone/60">
            <span className="w-2 h-2 rounded-full bg-sage animate-pulseDot" />
            Now with you
          </div>
          {inConsult ? (
            <div className="mt-4 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <div className="font-mono text-5xl md:text-6xl leading-none">#{inConsult.token_number}</div>
                <div className="mt-3 font-display text-2xl">{inConsult.patient_name}</div>
                <div className="text-bone/60 text-sm flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {inConsult.patient_phone}</span>
                  <span>slot <span className="font-mono">{inConsult.slot_time}</span></span>
                </div>
              </div>
              <div className="flex flex-col gap-2 self-start md:self-end">
                <button
                  data-testid="complete-current"
                  onClick={() => setRxFor(inConsult)}
                  className="px-5 py-3 rounded-full bg-saffron text-white hover:bg-saffron-hover transition inline-flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" strokeWidth={2} />
                  Write prescription & complete
                </button>
                <button
                  data-testid="skip-prescription"
                  onClick={() => skipPrescription(inConsult)}
                  disabled={skipping}
                  className="px-5 py-3 rounded-full border border-bone/30 text-bone/70 hover:text-white hover:border-bone/60 transition inline-flex items-center gap-2 disabled:opacity-50 text-sm"
                >
                  <SkipForward className="w-4 h-4" strokeWidth={2} />
                  {skipping ? "Completing..." : "Skip prescription"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 text-bone/60">No consultation in progress. Call the next patient below.</div>
          )}
        </div>

        <div className="rounded-3xl bg-white border border-subtle p-8">
          <div className="text-xs uppercase tracking-widest text-charcoal-soft">Running late?</div>
          <p className="mt-2 text-sm text-charcoal-soft leading-relaxed">
            One tap tells every waiting patient their new arrival window.
          </p>
          <button
            onClick={toggleLate}
            data-testid="doctor-toggle-late"
            className={`mt-5 w-full px-4 py-3 rounded-full transition inline-flex items-center justify-center gap-2 ${
              runningLate ? "bg-ochre text-white" : "border border-subtle text-charcoal hover:border-charcoal"
            }`}
          >
            {runningLate ? (
              <>
                <RotateCcw className="w-4 h-4" strokeWidth={1.8} />
                Back on schedule
              </>
            ) : (
              <>
                <BellRing className="w-4 h-4" strokeWidth={1.8} />
                Notify: 40 min late
              </>
            )}
          </button>
        </div>
      </div>

      {/* Queue list */}
      <section className="mt-10">
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="font-display text-3xl text-charcoal">Full queue · today</h2>
          <button
            onClick={load}
            data-testid="refresh-queue"
            className="text-sm text-charcoal-soft hover:text-saffron transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.8} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-charcoal-soft">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading…
          </div>
        ) : queue.length === 0 ? (
          <div className="rounded-2xl bg-white border border-dashed border-subtle p-8 text-charcoal-soft">
            No bookings for today yet.
          </div>
        ) : (
          <div className="rounded-3xl bg-white border border-subtle overflow-hidden divide-y divide-subtle" data-testid="doctor-queue-list">
            {queue.map((b) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                data-testid={`queue-item-${b.id}`}
                className={`grid grid-cols-12 gap-4 items-center p-5 ${
                  b.id === (nextUp && nextUp.id) && !inConsult ? "bg-saffron/5" : ""
                }`}
              >
                <div className="col-span-2 md:col-span-1">
                  <div className="w-12 h-12 rounded-xl bg-bone border border-subtle grid place-items-center">
                    <span className="font-mono text-sm">#{b.token_number}</span>
                  </div>
                </div>
                <div className="col-span-6 md:col-span-4">
                  <div className="font-medium text-charcoal flex items-center gap-2 flex-wrap">
                    <UserRound className="w-4 h-4 text-charcoal-soft" strokeWidth={1.8} />
                    {b.patient_name}
                    <UrgencyChip walkin={b.walkin} urgent={b.urgent} />
                  </div>
                  <div className="text-xs text-charcoal-soft">{b.patient_phone}</div>
                </div>
                <div className="col-span-2 md:col-span-2 text-sm text-charcoal-soft">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" strokeWidth={1.8} />
                    <span className="font-mono">{b.slot_time}</span>
                  </div>
                </div>
                <div className="col-span-2 md:col-span-2">
                  <div className={`text-xs px-2.5 py-1 rounded-full border inline-block ${statusBadge[b.status]}`}>
                    {labels[b.status]}
                  </div>
                </div>
                <div className="col-span-12 md:col-span-3 flex md:justify-end gap-2">
                  {b.status === "arrived" && !inConsult && (
                    <button
                      onClick={() => act(b.id, "call-next")}
                      data-testid={`call-next-${b.id}`}
                      className="px-4 py-2 rounded-full bg-saffron text-white text-sm hover:bg-saffron-hover"
                    >
                      Call in
                    </button>
                  )}
                  {b.status === "booked" && (
                    <span className="text-xs text-charcoal-soft italic">waiting to arrive</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
      {rxFor && (
        <PrescriptionModal
          booking={rxFor}
          onClose={() => setRxFor(null)}
          onDone={load}
        />
      )}

      {doctor && (
        <section className="mt-16">
          <h2 className="font-display text-3xl text-charcoal mb-5">Patient reviews</h2>
          <DoctorReviewsTab doctorId={doctor.id} />
        </section>
      )}
    </DashboardShell>
  );
}
