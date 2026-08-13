// Usage: <FamilySelector selectedId={familyId} onChange={setFamilyId} />
// Integration pass will add this to BookingFlow.jsx Step 1
import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { fetchApi } from "@/lib/api";

export default function FamilySelector({ selectedId, onChange }) {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    fetchApi("/api/family")
      .then((r) => (r.ok ? r.json() : { family_members: [] }))
      .then((d) => {
        setMembers(d.family_members || []);
        // Auto-select self if nothing selected
        if (!selectedId) {
          const self = (d.family_members || []).find((m) => m.is_self);
          if (self) onChange(self.id);
        }
      });
  }, []);

  if (members.length <= 1) return null; // hide if only self

  return (
    <div className="relative">
      <label className="text-xs uppercase tracking-[0.25em] text-saffron font-semibold mb-2 block">
        Booking for
      </label>
      <div className="relative">
        <select
          value={selectedId || ""}
          onChange={(e) => onChange(e.target.value)}
          data-testid="booking-for-selector"
          className="w-full px-4 py-2.5 pr-10 rounded-xl border border-subtle bg-white focus:outline-none focus:border-saffron font-body text-sm appearance-none"
        >
          {members.map((m) => (
            <option key={m.id} value={m.id} data-testid={`booking-for-${m.id}`}>
              {m.name}
              {m.is_self ? " (You)" : ` (${m.relationship})`}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-soft pointer-events-none" />
      </div>
    </div>
  );
}
