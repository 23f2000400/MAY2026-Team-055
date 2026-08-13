// Usage: <DirectionsModal bookingId={id} onClose={() => setOpen(false)} />
// Integration pass will add this to BookingHistory.jsx
import { X, Navigation, QrCode } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";

export default function DirectionsModal({ bookingId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchApi(`/api/bookings/${bookingId}/directions`)
      .then((r) => {
        if (!r.ok) {
          return r.json().then((e) => {
            throw new Error(e.detail || "Failed to load directions");
          });
        }
        return r.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [bookingId]);

  // Close on backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      data-testid="directions-modal"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-3xl shadow-medium w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-saffron px-6 py-5 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-white/80 font-semibold">
              Your token
            </div>
            <div className="font-mono text-4xl text-white font-bold mt-1">
              {loading ? (
                <span className="opacity-50">—</span>
              ) : (
                `#${data?.token_number ?? "—"}`
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            data-testid="directions-close"
            className="w-10 h-10 rounded-full bg-white/20 grid place-items-center hover:bg-white/30 transition"
            aria-label="Close directions"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-saffron border-t-transparent animate-spin" />
              <p className="font-body text-sm text-charcoal-soft">
                Loading directions…
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="py-6 text-center">
              <p className="font-body text-sm text-red-500">{error}</p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 rounded-full border border-subtle text-charcoal font-body text-sm hover:border-charcoal transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* Directions card */}
              <div className="bg-bone rounded-2xl p-5 mb-5">
                <div className="text-xs uppercase tracking-[0.3em] text-saffron font-semibold mb-3">
                  Head to
                </div>
                <div
                  data-testid="directions-cabin"
                  className="font-display text-4xl text-charcoal"
                >
                  {data.cabin || "Reception"}
                </div>
                <div
                  data-testid="directions-floor"
                  className="font-body text-charcoal-soft mt-1 flex items-center gap-2"
                >
                  <Navigation
                    className="w-4 h-4 text-saffron"
                    strokeWidth={1.5}
                  />
                  {data.floor || "Ground Floor"}
                </div>
                {data.landmark && (
                  <div
                    data-testid="directions-landmark"
                    className="font-body text-sm text-charcoal-soft mt-1 pl-6"
                  >
                    {data.landmark}
                  </div>
                )}
              </div>

              {/* Hospital map with pulsing dot */}
              {data.map_image_url ? (
                <div
                  data-testid="directions-map"
                  className="relative mb-5 rounded-2xl overflow-hidden border border-subtle"
                >
                  <img
                    src={data.map_image_url}
                    alt="Hospital map"
                    className="w-full h-48 object-cover"
                  />
                  <div
                    className="absolute w-4 h-4 rounded-full bg-saffron animate-pulseDot border-2 border-white shadow-lg"
                    style={{
                      left: `${data.map_x ?? 50}%`,
                      top: `${data.map_y ?? 50}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  />
                </div>
              ) : (
                <div
                  data-testid="directions-map"
                  className="relative mb-5 rounded-2xl bg-bone border border-subtle h-32 flex items-center justify-center"
                >
                  <p className="font-body text-sm text-charcoal-soft">
                    Map not available
                  </p>
                </div>
              )}

              {/* QR Code */}
              {data.qr_payload && (
                <div
                  data-testid="directions-qr"
                  className="flex flex-col items-center gap-2"
                >
                  <p className="text-xs uppercase tracking-widest text-charcoal-soft font-semibold">
                    Show at reception
                  </p>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=128x128&data=${encodeURIComponent(
                      data.qr_payload
                    )}`}
                    alt="Your QR code"
                    className="w-32 h-32 rounded-xl"
                  />
                  <p className="text-xs text-charcoal-soft font-mono">
                    Token #{data.token_number}
                  </p>
                </div>
              )}

              <button
                onClick={onClose}
                className="mt-5 w-full py-3 rounded-full border border-subtle text-charcoal font-body text-sm hover:border-charcoal transition-colors"
              >
                Got it
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
