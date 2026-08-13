// Usage: <RateVisitButton bookingId={id} doctorName={name} onReviewed={() => refresh()} />
// Integration pass will add this to BookingHistory.jsx for completed bookings
import { useState } from "react";
import { Star } from "lucide-react";
import ReviewModal from "./ReviewModal";

export default function RateVisitButton({ bookingId, doctorName, onReviewed }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        data-testid={`rate-visit-btn-${bookingId}`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-saffron/30 bg-saffron/5 text-saffron text-xs font-body hover:bg-saffron/10 transition-colors"
      >
        <Star className="w-3 h-3 fill-saffron" strokeWidth={2} />
        Rate visit
      </button>
      {open && (
        <ReviewModal
          bookingId={bookingId}
          doctorName={doctorName}
          onClose={() => setOpen(false)}
          onSubmitted={onReviewed}
        />
      )}
    </>
  );
}
