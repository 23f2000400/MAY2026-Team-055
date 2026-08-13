// Usage: <PrintPrescriptionLink prescriptionId={id} />
// Add this component to Medicines.jsx rx summary cards (integration pass will do this)
import { Link } from "react-router-dom";
import { Printer } from "lucide-react";

export default function PrintPrescriptionLink({ prescriptionId }) {
  return (
    <Link
      to={`/app/patient/prescriptions/${prescriptionId}/print`}
      data-testid={`print-open-${prescriptionId}`}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-subtle text-charcoal-soft text-xs hover:border-saffron hover:text-saffron transition-colors font-body"
      target="_blank"
    >
      <Printer className="w-3 h-3" strokeWidth={2} />
      Print Rx
    </Link>
  );
}
