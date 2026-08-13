// Usage: <FamilyFilterChips selected={filterId} onChange={setFilterId} />
// Integration pass will add to BookingHistory.jsx and Medicines.jsx
import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";

export default function FamilyFilterChips({ selected, onChange }) {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    fetchApi("/api/family")
      .then((r) => (r.ok ? r.json() : { family_members: [] }))
      .then((d) => setMembers(d.family_members || []));
  }, []);

  if (members.length <= 1) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <button
        onClick={() => onChange(null)}
        data-testid="history-filter-all"
        className={`px-4 py-1.5 rounded-full text-sm font-body border transition-colors ${
          !selected
            ? "bg-charcoal text-bone border-charcoal"
            : "bg-white text-charcoal-soft border-subtle hover:border-charcoal/30"
        }`}
      >
        All
      </button>
      {members.map((m) => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          data-testid={`history-filter-${m.id}`}
          className={`px-4 py-1.5 rounded-full text-sm font-body border transition-colors ${
            selected === m.id
              ? "bg-charcoal text-bone border-charcoal"
              : "bg-white text-charcoal-soft border-subtle hover:border-charcoal/30"
          }`}
        >
          {m.name}
          {m.is_self ? " (You)" : ""}
        </button>
      ))}
    </div>
  );
}
