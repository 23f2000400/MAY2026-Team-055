// ROUTE TO ADD IN App.js:
// import ResetPassword from "@/pages/ResetPassword";
// <Route path="/reset-password" element={<ResetPassword />} />

import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { formatApiError } from "@/lib/api";
import api from "@/lib/api";

// ── Password strength helpers ───────────────────────────────────────────────

const getStrength = (pw) => {
  if (pw.length < 6) return 0;
  if (pw.length < 8) return 1;
  if (pw.length < 10 || !/[0-9]/.test(pw)) return 2;
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) return 3;
  return 3;
};

const strengthColors = [
  "bg-red-400",
  "bg-ochre",
  "bg-ochre-DEFAULT",
  "bg-sage",
];

const strengthLabels = ["Too short", "Weak", "Fair", "Strong"];

// ── Component ────────────────────────────────────────────────────────────────

export default function ResetPassword() {
  const { search } = useLocation();
  const token = new URLSearchParams(search).get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const strength = getStrength(newPassword);

  // If there is no token in the URL, show an immediate error state
  if (!token) {
    return (
      <div className="min-h-screen bg-bone flex flex-col items-center justify-center px-6 py-16">
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
          <div
            data-testid="reset-error"
            className="text-sm px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700"
          >
            Invalid reset link. Please request a new password reset.
          </div>
          <div className="mt-6 text-center">
            <Link
              to="/forgot-password"
              className="text-sm text-saffron hover:underline"
            >
              Request a new link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/reset-password", {
        token,
        new_password: newPassword,
      });
      // Auto-login: store JWT and redirect
      localStorage.setItem("nirog_token", data.token);
      setSuccess(true);
      // Brief pause so user sees the success message before redirect
      setTimeout(() => {
        window.location.href = "/app/patient";
      }, 1800);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-bone flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-md rounded-3xl bg-white border border-subtle shadow-medium p-8 md:p-10 text-center">
          <div className="flex justify-center mb-5">
            <ShieldCheck
              className="w-14 h-14 text-sage"
              strokeWidth={1.5}
            />
          </div>
          <h2 className="font-display text-3xl text-charcoal leading-tight mb-3">
            Password updated!
          </h2>
          <p className="text-charcoal-soft text-sm leading-relaxed">
            You're being signed in to your dashboard…
          </p>
        </div>
      </div>
    );
  }

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

        <div className="text-xs uppercase tracking-[0.25em] text-saffron font-semibold mb-2">
          New password
        </div>
        <h2 className="font-display text-4xl text-charcoal leading-tight mb-3">
          Choose a new password
        </h2>
        <p className="text-charcoal-soft text-sm leading-relaxed mb-8">
          Pick a strong password you haven't used before.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* New password */}
          <label className="block">
            <span className="text-sm text-charcoal-soft">New password</span>
            <div className="relative mt-1.5">
              <input
                type={showNew ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                data-testid="reset-password-input"
                className="w-full px-4 py-3 pr-11 rounded-xl border border-subtle bg-white focus:outline-none focus:border-saffron text-charcoal font-body transition-colors"
                placeholder="Min. 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-charcoal-soft hover:text-charcoal transition"
                aria-label={showNew ? "Hide password" : "Show password"}
              >
                {showNew ? (
                  <EyeOff className="w-4 h-4" strokeWidth={1.8} />
                ) : (
                  <Eye className="w-4 h-4" strokeWidth={1.8} />
                )}
              </button>
            </div>

            {/* Strength meter */}
            {newPassword.length > 0 && (
              <div className="mt-2">
                <div data-testid="pw-strength" className="flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i <= strength
                          ? strengthColors[strength]
                          : "bg-subtle"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-charcoal-soft mt-1">
                  {strengthLabels[strength]}
                </p>
              </div>
            )}
          </label>

          {/* Confirm password */}
          <label className="block">
            <span className="text-sm text-charcoal-soft">Confirm password</span>
            <div className="relative mt-1.5">
              <input
                type={showConfirm ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                data-testid="reset-confirm-input"
                className="w-full px-4 py-3 pr-11 rounded-xl border border-subtle bg-white focus:outline-none focus:border-saffron text-charcoal font-body transition-colors"
                placeholder="Repeat your password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-charcoal-soft hover:text-charcoal transition"
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? (
                  <EyeOff className="w-4 h-4" strokeWidth={1.8} />
                ) : (
                  <Eye className="w-4 h-4" strokeWidth={1.8} />
                )}
              </button>
            </div>
            {/* Inline match feedback */}
            {confirmPassword.length > 0 && newPassword !== confirmPassword && (
              <p className="text-xs text-red-500 mt-1">Passwords don't match</p>
            )}
          </label>

          {/* Error message */}
          {error && (
            <div
              data-testid="reset-error"
              className="text-sm px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700"
            >
              {error}
            </div>
          )}

          <button
            data-testid="reset-submit"
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-saffron text-white font-body tracking-wide hover:bg-saffron-hover transition-colors disabled:opacity-50"
          >
            {loading ? "Saving…" : "Set new password"}
          </button>
        </form>

        <div className="mt-6 text-sm text-charcoal-soft text-center">
          Need a new link?{" "}
          <Link to="/forgot-password" className="text-saffron hover:underline">
            Request password reset
          </Link>
        </div>
      </div>
    </div>
  );
}
