// Usage: <TransferOfferButton bookingId={id} altDoctors={[]} onOffered={() => refresh()} />
// Integration pass will add this to ReceptionDashboard.jsx queue rows
import { useState } from "react";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { fetchApi } from "@/lib/api";

export default function TransferOfferButton({ bookingId, altDoctors, onOffered }) {
  const [open, setOpen] = useState(false);
  const [targetDoctorId, setTargetDoctorId] = useState("");
  const [sending, setSending] = useState(false);

  const confirm = async () => {
    if (!targetDoctorId) return;
    setSending(true);
    try {
      const res = await fetchApi('/api/reception/offer-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId, target_doctor_id: targetDoctorId }),
      });
      if (res.ok) {
        setOpen(false);
        onOffered?.();
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        data-testid={`transfer-offer-btn-${bookingId}`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-saffron/10 border border-saffron/30 text-saffron text-xs font-body hover:bg-saffron/20 transition-colors"
      >
        <ArrowRightLeft className="w-3 h-3" strokeWidth={2} />
        Offer transfer
      </button>

      {open && (
        <div data-testid="transfer-target-select" className="absolute bottom-full mb-2 right-0 w-72 bg-white rounded-2xl border border-subtle shadow-medium p-4 z-20">
          <p className="font-body text-sm text-charcoal mb-3">Transfer to:</p>
          <select
            value={targetDoctorId}
            onChange={e => setTargetDoctorId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-subtle bg-white font-body text-sm mb-3 focus:outline-none focus:border-saffron"
          >
            <option value="">Select doctor…</option>
            {altDoctors.map(a => (
              <option key={a.doctor.id} value={a.doctor.id}>
                {a.doctor.name} ({a.active_patient_count} waiting)
              </option>
            ))}
          </select>
          <button
            onClick={confirm}
            disabled={!targetDoctorId || sending}
            data-testid="transfer-confirm"
            className="w-full py-2 rounded-full bg-saffron text-white font-body text-sm hover:bg-saffron-hover transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {sending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Send offer to patient
          </button>
        </div>
      )}
    </div>
  );
}
