// Usage: <ReviewModal bookingId={id} doctorName={name} onClose={() => setOpen(false)} onSubmitted={() => refresh()} />
// Integration pass will add "Rate your visit" button to BookingHistory.jsx and Medicines.jsx

import { useState } from "react";
import { Star, X, Loader2 } from "lucide-react";
import { fetchApi } from "@/lib/api";

const REVIEW_TAGS = [
  "Explained clearly", "Not rushed", "Friendly staff",
  "On time", "Long wait", "Clean clinic", "Professional"
];

export default function ReviewModal({ bookingId, doctorName, onClose, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [body, setBody] = useState("");
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleTag = (tag) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const submit = async () => {
    if (rating === 0) { setError("Please select a rating"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetchApi('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId, rating, body: body.trim() || undefined, tags }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to submit');
      onSubmitted?.();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" data-testid="review-modal">
      <div className="bg-white rounded-3xl shadow-medium w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-subtle">
          <div>
            <h2 className="font-display text-xl text-charcoal">How was your visit?</h2>
            <p className="font-body text-sm text-charcoal-soft mt-0.5">with {doctorName}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full border border-subtle grid place-items-center hover:border-saffron hover:text-saffron transition">
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        <div className="p-6">
          {/* Star rating */}
          <div className="flex justify-center gap-3 mb-6">
            {[1,2,3,4,5].map(s => (
              <button
                key={s}
                data-testid={`review-star-${s}`}
                onClick={() => setRating(s)}
                onMouseEnter={() => setHovered(s)}
                onMouseLeave={() => setHovered(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`w-10 h-10 transition-colors ${
                    s <= (hovered || rating)
                      ? 'text-saffron fill-saffron'
                      : 'text-subtle'
                  }`}
                  strokeWidth={1.5}
                />
              </button>
            ))}
          </div>

          {/* Tag chips */}
          <div className="flex flex-wrap gap-2 mb-5">
            {REVIEW_TAGS.map(tag => (
              <button
                key={tag}
                data-testid={`review-tag-${tag.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1.5 rounded-full text-sm font-body transition-colors border ${
                  tags.includes(tag)
                    ? 'bg-saffron/10 border-saffron/40 text-saffron'
                    : 'bg-white border-subtle text-charcoal-soft hover:border-saffron/30'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Text area */}
          <textarea
            value={body}
            onChange={e => setBody(e.target.value.slice(0, 280))}
            data-testid="review-body-input"
            placeholder="Share your experience (optional)"
            className="w-full px-4 py-3 rounded-xl border border-subtle bg-bone focus:outline-none focus:border-saffron font-body text-sm text-charcoal resize-none"
            rows={3}
          />
          <div className="text-right text-xs text-charcoal-soft mt-1 font-mono">{body.length}/280</div>

          {error && <p className="text-red-500 text-sm font-body mt-2">{error}</p>}

          <button
            onClick={submit}
            disabled={loading || rating === 0}
            data-testid="review-submit"
            className="mt-4 w-full py-3 rounded-full bg-saffron text-white font-body hover:bg-saffron-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Submitting…" : "Submit review"}
          </button>
        </div>
      </div>
    </div>
  );
}
