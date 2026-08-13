// Usage: Import and use as a tab in DoctorDashboard.jsx (integration pass)
// Shows doctor's own reviews with ability to reply
import { useState, useEffect } from "react";
import { Star, MessageSquare, Flag } from "lucide-react";
import { fetchApi } from "@/lib/api";

export default function DoctorReviewsTab() {
  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ratingFilter, setRatingFilter] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const params = ratingFilter ? `?rating=${ratingFilter}` : '';
      const res = await fetchApi(`/api/doctor/reviews${params}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReviews(); }, [ratingFilter]);

  const submitReply = async (reviewId) => {
    if (!replyText.trim()) return;
    const res = await fetchApi(`/api/reviews/${reviewId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply: replyText }),
    });
    if (res.ok) {
      setReplyingTo(null);
      setReplyText("");
      fetchReviews();
    }
  };

  const report = async (reviewId) => {
    await fetchApi(`/api/reviews/${reviewId}/report`, {
      method: 'POST',
    });
  };

  return (
    <div>
      {/* Rating filter */}
      <div className="flex items-center gap-2 mb-6">
        <span className="font-body text-sm text-charcoal-soft">Filter by:</span>
        {["", "5", "4", "3", "2", "1"].map(r => (
          <button
            key={r}
            onClick={() => setRatingFilter(r)}
            data-testid={`doctor-reviews-filter-${r || 'all'}`}
            className={`px-3 py-1 rounded-full text-sm font-body border transition-colors ${
              ratingFilter === r
                ? 'bg-saffron text-white border-saffron'
                : 'bg-white text-charcoal-soft border-subtle hover:border-saffron/30'
            }`}
          >
            {r ? `${r}★` : 'All'}
          </button>
        ))}
        <span className="ml-auto font-mono text-sm text-charcoal-soft">{total} review{total !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className="py-16 text-center text-charcoal-soft font-body">Loading reviews…</div>
      ) : reviews.length === 0 ? (
        <div className="py-16 text-center">
          <Star className="w-10 h-10 text-charcoal-soft/30 mx-auto mb-3" />
          <p className="font-display text-2xl text-charcoal">No reviews yet</p>
          <p className="font-body text-charcoal-soft mt-2">Reviews will appear here after patient visits</p>
        </div>
      ) : (
        <div className="space-y-4" data-testid="review-list">
          {reviews.map(review => (
            <div key={review.id} data-testid={`review-item-${review.id}`} className="bg-white rounded-2xl border border-subtle p-5">

              {/* Review header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-4 h-4 ${s <= review.rating ? 'text-saffron fill-saffron' : 'text-subtle'}`} strokeWidth={1.5} />
                    ))}
                    <span className="font-body text-sm font-medium text-charcoal ml-1">{review.patient_name}</span>
                  </div>
                  <p className="font-mono text-xs text-charcoal-soft mt-0.5">
                    {new Date(review.created_at).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})}
                  </p>
                </div>
                <button onClick={() => report(review.id)} data-testid={`review-report-${review.id}`} title="Report this review" className="text-charcoal-soft/40 hover:text-charcoal-soft transition-colors">
                  <Flag className="w-3.5 h-3.5" strokeWidth={1.8} />
                </button>
              </div>

              {review.body && <p className="font-body text-sm text-charcoal mb-3">{review.body}</p>}

              {review.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {review.tags.map(t => <span key={t} className="px-2.5 py-1 bg-sage-soft text-sage text-xs rounded-full font-body">{t}</span>)}
                </div>
              )}

              {/* Doctor's existing reply */}
              {review.doctor_reply && (
                <div className="mt-3 pl-4 border-l-2 border-saffron bg-saffron/5 rounded-r-xl p-3">
                  <p className="text-xs text-saffron font-semibold mb-1">Your response</p>
                  <p className="font-body text-sm text-charcoal">{review.doctor_reply}</p>
                </div>
              )}

              {/* Reply UI */}
              {!review.doctor_reply && (
                <>
                  {replyingTo === review.id ? (
                    <div className="mt-3">
                      <textarea
                        value={replyText}
                        onChange={e => setReplyText(e.target.value.slice(0, 240))}
                        data-testid="review-reply-input"
                        placeholder="Write a response… (max 240 chars)"
                        className="w-full px-3 py-2 rounded-xl border border-subtle bg-bone text-sm font-body text-charcoal focus:outline-none focus:border-saffron resize-none"
                        rows={2}
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => submitReply(review.id)}
                          data-testid="review-reply-submit"
                          className="px-4 py-1.5 rounded-full bg-saffron text-white text-xs font-body hover:bg-saffron-hover transition-colors"
                        >
                          Post reply
                        </button>
                        <button onClick={() => { setReplyingTo(null); setReplyText(""); }} className="px-4 py-1.5 rounded-full border border-subtle text-charcoal-soft text-xs font-body">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setReplyingTo(review.id)}
                      data-testid={`review-reply-btn-${review.id}`}
                      className="mt-2 flex items-center gap-1.5 text-sm text-charcoal-soft hover:text-saffron transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.8} />
                      Reply to review
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
