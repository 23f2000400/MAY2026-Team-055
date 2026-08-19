import { useState, useEffect, useRef } from "react";
import { ArrowRightLeft, Loader2, Check, AlertCircle } from "lucide-react";
import { fetchApi } from "@/lib/api";

export default function TransferOfferButton({ bookingId, doctorId, altDoctors, onOffered }) {
  const [open, setOpen] = useState(false);
  const [targetDoctorId, setTargetDoctorId] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [doctorsList, setDoctorsList] = useState(altDoctors || []);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const popoverRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handler);
    }
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Load available doctors when opening
  useEffect(() => {
    if (open) {
      setSuccess(false);
      setErrorMsg("");
      if (altDoctors && altDoctors.length > 0) {
        setDoctorsList(altDoctors);
      } else {
        setLoadingDocs(true);
        fetchApi("/api/doctors")
          .then((res) => res.json())
          .then((data) => {
            const docs = (data.doctors || [])
              .filter((d) => !doctorId || d.id !== doctorId)
              .map((d) => ({
                doctor: d,
                active_patient_count: d.active_patient_count ?? 0,
              }));
            setDoctorsList(docs);
          })
          .catch(() => {
            setErrorMsg("Failed to load doctor list");
          })
          .finally(() => {
            setLoadingDocs(false);
          });
      }
    }
  }, [open, altDoctors, doctorId]);

  const confirm = async () => {
    if (!targetDoctorId) return;
    setSending(true);
    setErrorMsg("");
    try {
      const res = await fetchApi("/api/reception/offer-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId, target_doctor_id: targetDoctorId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to offer transfer");
      }
      setSuccess(true);
      onOffered?.();
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
      }, 1500);
    } catch (e) {
      setErrorMsg(e.message || "An error occurred");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        onClick={() => setOpen(!open)}
        data-testid={`transfer-offer-btn-${bookingId}`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-saffron/10 border border-saffron/30 text-saffron text-xs font-body hover:bg-saffron/20 transition-colors"
      >
        <ArrowRightLeft className="w-3 h-3" strokeWidth={2} />
        Offer transfer
      </button>

      {open && (
        <div
          data-testid="transfer-target-select"
          className="absolute bottom-full mb-2 right-0 w-80 bg-white rounded-2xl border border-subtle shadow-medium p-4 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="font-body text-sm font-semibold text-charcoal">Offer Queue Transfer</p>
          </div>

          <p className="font-body text-xs text-charcoal-soft mb-3">
            Transfer patient to an available doctor of the same clinic / specialty:
          </p>

          {loadingDocs ? (
            <div className="py-4 text-center text-xs text-charcoal-soft flex items-center justify-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-saffron" />
              Loading available doctors…
            </div>
          ) : doctorsList.length === 0 ? (
            <div className="py-3 text-center text-xs text-charcoal-soft">
              No alternate doctors available right now.
            </div>
          ) : (
            <>
              <select
                value={targetDoctorId}
                onChange={(e) => setTargetDoctorId(e.target.value)}
                disabled={sending || success}
                className="w-full px-3 py-2 rounded-xl border border-subtle bg-white font-body text-xs mb-3 focus:outline-none focus:border-saffron"
              >
                <option value="">Select target doctor…</option>
                {doctorsList.map((a) => (
                  <option key={a.doctor.id} value={a.doctor.id}>
                    {a.doctor.name} — {a.doctor.specialty || "General"} ({a.doctor.hospital || "Clinic"})
                  </option>
                ))}
              </select>

              {errorMsg && (
                <div className="mb-3 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {success ? (
                <div className="w-full py-2 rounded-full bg-emerald-50 text-emerald-700 text-xs font-body font-medium flex items-center justify-center gap-1.5 border border-emerald-200">
                  <Check className="w-3.5 h-3.5" />
                  Offer sent to patient!
                </div>
              ) : (
                <button
                  onClick={confirm}
                  disabled={!targetDoctorId || sending}
                  data-testid="transfer-confirm"
                  className="w-full py-2 rounded-full bg-saffron text-white font-body text-xs hover:bg-saffron-hover transition-colors disabled:opacity-40 flex items-center justify-center gap-2 shadow-sm"
                >
                  {sending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Send offer to patient
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
