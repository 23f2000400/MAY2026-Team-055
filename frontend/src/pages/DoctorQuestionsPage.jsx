// ROUTE TO ADD IN App.js:
// import DoctorQuestionsPage from "@/pages/DoctorQuestionsPage";
// <Route path="/app/doctor/questions" element={<DoctorQuestionsPage />} />
import { useState, useEffect } from "react";
import { MessageCircle, Loader2 } from "lucide-react";
import DashboardShell from "@/pages/DashboardShell";
import PrescriptionQAModal from "@/components/nirog/PrescriptionQAModal";
import { fetchApi } from "@/lib/api";

export default function DoctorQuestionsPage() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openPrescId, setOpenPrescId] = useState(null);

  const fetch_ = async () => {
    setLoading(true);
    try {
      const res = await fetchApi("/api/doctor/questions/unread");
      if (res.ok) {
        const d = await res.json();
        setPrescriptions(d.prescriptions || []);
        setTotal(d.total_unread || 0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch_();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DashboardShell roles={["doctor"]} title="Questions" subtitle="PATIENT QUERIES">
      {loading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-saffron" />
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="py-24 text-center">
          <MessageCircle
            className="w-10 h-10 text-charcoal-soft/30 mx-auto mb-4"
            strokeWidth={1.5}
          />
          <h2 className="font-display text-2xl text-charcoal">No unread questions</h2>
          <p className="font-body text-charcoal-soft mt-2">
            Patient questions about prescriptions will appear here
          </p>
        </div>
      ) : (
        <div data-testid="doctor-questions-list" className="space-y-4">
          <p className="font-body text-sm text-charcoal-soft mb-6">
            {total} unread question{total !== 1 ? "s" : ""}
          </p>
          {prescriptions.map((p) => (
            <button
              key={p.id}
              data-testid={`doctor-question-${p.id}`}
              onClick={() => setOpenPrescId(p.id)}
              className="w-full text-left p-5 bg-white rounded-2xl border border-subtle hover:shadow-hoverGlow transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-saffron/10 grid place-items-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-saffron" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-body font-medium text-charcoal">{p.patient_name}</h3>
                    {p.unread_count > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-saffron text-white text-xs font-mono">
                        {p.unread_count}
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-xs text-charcoal-soft mt-0.5">
                    {new Date(p.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {p.medications?.length > 0 &&
                      ` · ${p.medications[0].name}${
                        p.medications.length > 1 ? ` +${p.medications.length - 1}` : ""
                      }`}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {openPrescId && (
        <PrescriptionQAModal
          prescriptionId={openPrescId}
          userRole="doctor"
          onClose={() => {
            setOpenPrescId(null);
            fetch_();
          }}
        />
      )}
    </DashboardShell>
  );
}
