// Usage: <UrgencyChip walkin={true} urgency="urgent" />
import { Zap, UserCheck } from "lucide-react";

export default function UrgencyChip({ walkin, urgency }) {
  return (
    <div className="flex gap-1.5">
      {walkin && (
        <span data-testid="walkin-chip" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal/10 text-teal text-xs font-body border border-teal/20">
          <UserCheck className="w-3 h-3" strokeWidth={2} /> Walk-in
        </span>
      )}
      {urgency === "urgent" && (
        <span data-testid="urgent-chip" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ochre/10 text-ochre text-xs font-body border border-ochre/20">
          <Zap className="w-3 h-3" strokeWidth={2} /> Urgent
        </span>
      )}
    </div>
  );
}
