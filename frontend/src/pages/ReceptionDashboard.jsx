import React, { useEffect, useState } from "react";
import DashboardShell from "./DashboardShell";
import api from "@/lib/api";
import { Loader2, RotateCcw, Stethoscope, UserPlus } from "lucide-react";
import WalkinModal from "@/components/nirog/WalkinModal";
import TransferOfferButton from "@/components/nirog/TransferOfferButton";
import UrgencyChip from "@/components/nirog/UrgencyChip";

const statusBadge = {
  booked: "bg-teal/10 text-teal",
  arrived: "bg-sage/15 text-sage",
  in_consult: "bg-saffron text-white",
  completed: "bg-charcoal/5 text-charcoal-soft",
  cancelled: "bg-red-50 text-red-600",
};

export default function ReceptionDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWalkin, setShowWalkin] = useState(false);

  const load = async () => {
    const { data } = await api.get("/reception/overview");
    setData(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const i = setInterval(load, 8000);
    return () => clearInterval(i);
  }, []);

  return (
    <DashboardShell roles={["reception"]} subtitle="Live operations" title="Reception control room">
      {loading || !data ? (
        <div className="flex items-center gap-2 text-charcoal-soft">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading overview…
        </div>
      ) : (
        <>
          {/* Global stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3" data-testid="reception-stats">
            {[
              { k: "booked", l: "Booked", c: "text-teal" },
              { k: "arrived", l: "Arrived", c: "text-sage" },
              { k: "in_consult", l: "In consult", c: "text-saffron" },
              { k: "completed", l: "Completed", c: "text-charcoal" },
              { k: "cancelled", l: "Cancelled", c: "text-red-600" },
            ].map((s) => (
              <div key={s.k} className="rounded-2xl bg-white border border-subtle p-5">
                <div className="text-xs uppercase tracking-widest text-charcoal-soft">{s.l}</div>
                <div className={`font-mono text-3xl mt-2 ${s.c}`}>{data?.total?.[s.k] || 0}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-charcoal-soft">
              Snapshot for <span className="font-mono">{data.date}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowWalkin(true)}
                data-testid="add-walkin-btn"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-charcoal text-bone text-sm hover:bg-saffron transition"
              >
                <UserPlus className="w-4 h-4" strokeWidth={1.8} />
                Add walk-in
              </button>
              <button
                onClick={load}
                data-testid="reception-refresh"
                className="text-sm text-charcoal-soft hover:text-saffron transition flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.8} />
                Refresh
              </button>
            </div>
          </div>

          {/* Per doctor */}
          <div className="mt-10 space-y-8" data-testid="reception-doctor-grid">
            {data.doctors.map((d) => (
              <section key={d.doctor.id} data-testid={`reception-doctor-${d.doctor.id}`} className="rounded-3xl bg-white border border-subtle overflow-hidden">
                <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-4 border-b border-subtle">
                  <div className="w-12 h-12 rounded-full bg-saffron/10 grid place-items-center">
                    <Stethoscope className="w-5 h-5 text-saffron" strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-2xl text-charcoal">{d.doctor.name}</div>
                    <div className="text-sm text-charcoal-soft">
                      {d.doctor.specialty} · {d.doctor.hospital}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(d.stats).map(([k, v]) =>
                      v ? (
                        <span
                          key={k}
                          className={`text-xs px-2.5 py-1 rounded-full ${statusBadge[k] || "bg-subtle"}`}
                        >
                          {k}: {v}
                        </span>
                      ) : null
                    )}
                  </div>
                </div>

                {d.queue.length === 0 ? (
                  <div className="p-6 md:p-8 text-charcoal-soft text-sm">No bookings today.</div>
                ) : (
                  <div className="divide-y divide-subtle">
                    {d.queue.map((b) => (
                      <div key={b.id} className="grid grid-cols-12 gap-4 items-center p-5">
                        <div className="col-span-2 md:col-span-1 font-mono text-sm">#{b.token_number}</div>
                        <div className="col-span-6 md:col-span-4">
                          <div className="font-medium text-charcoal flex items-center gap-1.5 flex-wrap">
                            {b.patient_name}
                            <UrgencyChip walkin={b.walkin} urgent={b.urgent} />
                          </div>
                          <div className="text-xs text-charcoal-soft">{b.patient_phone}</div>
                        </div>
                        <div className="col-span-2 md:col-span-3 text-sm text-charcoal-soft font-mono">
                          {b.slot_time}
                        </div>
                        <div className="col-span-2 md:col-span-2 flex md:justify-end">
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full ${statusBadge[b.status]}`}
                          >
                            {b.status.replace("_", " ")}
                          </span>
                        </div>
                        <div className="col-span-12 md:col-span-2 flex md:justify-end">
                          {(b.status === "arrived" || b.status === "booked") && (
                            <TransferOfferButton bookingId={b.id} doctorId={d.doctor.id} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        </>
      )}
      {showWalkin && (
        <WalkinModal
          onClose={() => setShowWalkin(false)}
          onAdded={() => { setShowWalkin(false); load(); }}
        />
      )}
    </DashboardShell>
  );
}
