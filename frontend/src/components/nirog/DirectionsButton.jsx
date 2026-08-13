// Usage: <DirectionsButton bookingId={id} />
// Add to BookingHistory.jsx for arrived bookings in integration pass
import { useState } from "react";
import { Navigation } from "lucide-react";
import DirectionsModal from "./DirectionsModal";

export default function DirectionsButton({ bookingId }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        data-testid={`arrived-directions-btn-${bookingId}`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-subtle text-charcoal-soft text-xs hover:border-saffron hover:text-saffron transition-colors"
      >
        <Navigation className="w-3 h-3" strokeWidth={2} />
        Directions
      </button>
      {open && (
        <DirectionsModal bookingId={bookingId} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
