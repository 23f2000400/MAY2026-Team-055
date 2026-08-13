// Usage: <WaitlistButton doctorId={id} date={date} slotTime={time} />
// Integration pass will add this to BookingFlow.jsx's slot picker
import { useState } from "react";
import { BellPlus, BellRing, Loader2 } from "lucide-react";
import { fetchApi } from "@/lib/api";

export default function WaitlistButton({ doctorId, date, slotTime }) {
  const [waitlisted, setWaitlisted] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    try {
      if (!waitlisted) {
        const res = await fetchApi('/api/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ doctor_id: doctorId, date, slot_time: slotTime }),
        });
        if (res.ok) setWaitlisted(true);
      } else {
        const meRes = await fetchApi('/api/waitlist/me');
        if (meRes.ok) {
          const data = await meRes.json();
          const entry = data.waitlist.find(e => e.doctor_id === doctorId && e.slot_time === slotTime && e.date === date);
          if (entry) {
            await fetchApi(`/api/waitlist/${entry.id}`, {
              method: 'DELETE',
            });
            setWaitlisted(false);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      data-testid={`slot-notify-${slotTime.replace(':', '')}`}
      title={waitlisted ? "Remove from waitlist" : "Notify me when this slot opens"}
      className={`absolute bottom-0.5 right-0.5 w-5 h-5 rounded-full grid place-items-center transition-colors ${
        waitlisted
          ? 'bg-saffron text-white'
          : 'bg-white border border-subtle text-charcoal-soft hover:border-saffron hover:text-saffron'
      }`}
    >
      {loading ? (
        <Loader2 className="w-2.5 h-2.5 animate-spin" />
      ) : waitlisted ? (
        <BellRing className="w-2.5 h-2.5" />
      ) : (
        <BellPlus className="w-2.5 h-2.5" />
      )}
    </button>
  );
}
