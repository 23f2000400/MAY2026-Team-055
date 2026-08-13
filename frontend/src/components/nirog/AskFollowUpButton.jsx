// Usage: <AskFollowUpButton prescriptionId={id} />
// Integration pass will add this to Medicines.jsx's prescription summary cards
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import PrescriptionQAModal from "./PrescriptionQAModal";

export default function AskFollowUpButton({ prescriptionId }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        data-testid={`rx-qa-btn-${prescriptionId}`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-subtle text-charcoal-soft text-xs font-body hover:border-saffron hover:text-saffron transition-colors"
      >
        <MessageCircle className="w-3 h-3" strokeWidth={2} />
        Ask follow-up
      </button>
      {open && (
        <PrescriptionQAModal
          prescriptionId={prescriptionId}
          userRole="patient"
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
