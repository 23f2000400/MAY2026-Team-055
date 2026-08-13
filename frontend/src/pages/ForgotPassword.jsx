// LOGIN PAGE CHANGE NEEDED: Add <Link to="/forgot-password" data-testid="forgot-password-link">Forgot password?</Link> below the password field in Login.jsx
//
// ROUTE TO ADD IN App.js:
// import ForgotPassword from "@/pages/ForgotPassword";
// <Route path="/forgot-password" element={<ForgotPassword />} />

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { formatApiError } from "@/lib/api";
import api from "@/lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSubmitted(true);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bone flex flex-col items-center justify-center px-6 py-16">
      {/* Back link */}
      <div className="w-full max-w-md mb-6">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-charcoal-soft hover:text-saffron transition text-sm"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.8} />
          Back to login
        </Link>
      </div>

      <div className="w-full max-w-md rounded-3xl bg-white border border-subtle shadow-medium p-8 md:p-10">
        {/* Logomark */}
        <div className="w-10 h-10 rounded-full bg-saffron grid place-items-center font-display text-xl text-white pt-[2px] mb-6">
          न
        </div>

        {submitted ? (
          /* ── Success state ── */
          <div data-testid="forgot-success" className="text-center py-4">
            <div className="flex justify-center mb-5">
              <CheckCircle2
                className="w-14 h-14 text-sage"
                strokeWidth={1.5}
              />
            </div>
            <h2 className="font-display text-3xl text-charcoal leading-tight mb-3">
              Check your inbox
            </h2>
            <p className="text-charcoal-soft text-sm leading-relaxed mb-2">
              We've sent a reset link to{" "}
              <span className="font-semibold text-charcoal">{email}</span>.
            </p>
            <p className="text-charcoal-soft text-sm mb-8">
              It expires in 1 hour.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-saffron hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.8} />
              Back to login
            </Link>
          </div>
        ) : (
          /* ── Request form ── */
          <>
            <div className="text-xs uppercase tracking-[0.25em] text-saffron font-semibold mb-2">
              Account recovery
            </div>
            <h2 className="font-display text-4xl text-charcoal leading-tight mb-3">
              Reset your password
            </h2>
            <p className="text-charcoal-soft text-sm leading-relaxed mb-8">
              Enter your email and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <label className="block">
                <span className="text-sm text-charcoal-soft">Email address</span>
                <div className="relative mt-1.5">
                  <Mail
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-soft pointer-events-none"
                    strokeWidth={1.8}
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="forgot-email-input"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-subtle bg-white focus:outline-none focus:border-saffron text-charcoal font-body transition-colors"
                    placeholder="your@email.com"
                  />
                </div>
              </label>

              {error && (
                <div className="text-sm px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700">
                  {error}
                </div>
              )}

              <button
                data-testid="forgot-submit"
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-full bg-saffron text-white font-body tracking-wide hover:bg-saffron-hover transition-colors disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>

            <div className="mt-6 text-sm text-charcoal-soft text-center">
              Remember your password?{" "}
              <Link to="/login" className="text-saffron hover:underline">
                Sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
