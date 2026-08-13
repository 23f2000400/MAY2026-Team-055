import React, { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { formatApiError } from "@/lib/api";
import { ArrowRight, ArrowLeft } from "lucide-react";

export default function Register() {
  const { register, user } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/app/patient" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await register(form);
      nav("/app/patient");
    } catch (e) {
      setErr(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-bone flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full rounded-3xl bg-white border border-subtle shadow-medium p-8 md:p-10">
        <Link to="/" className="inline-flex items-center gap-2 text-charcoal-soft hover:text-saffron transition text-sm">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.8} />
          Back to NirogPath
        </Link>
        <div className="mt-6 text-xs uppercase tracking-[0.25em] text-saffron font-semibold">Get started</div>
        <h2 className="mt-2 font-display text-4xl text-charcoal leading-tight">Create your patient account</h2>
        <p className="mt-3 text-sm text-charcoal-soft">
          We'll add ₹2000 to your NirogPath wallet so you can try the 20% deposit booking flow.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4" data-testid="register-form">
          {[
            { k: "name", l: "Full name", t: "text", ph: "e.g., Ananya Reddy" },
            { k: "email", l: "Email", t: "email", ph: "you@nirogpath.in" },
            { k: "phone", l: "Phone (optional)", t: "text", ph: "+91 90000 00000" },
            { k: "password", l: "Password (min 6 chars)", t: "password", ph: "••••••••" },
          ].map((f) => (
            <label className="block" key={f.k}>
              <span className="text-sm text-charcoal-soft">{f.l}</span>
              <input
                type={f.t}
                required={f.k !== "phone"}
                value={form[f.k]}
                onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
                data-testid={`register-${f.k}`}
                placeholder={f.ph}
                className="mt-1.5 w-full px-4 py-3 rounded-xl border border-subtle bg-bone/60 focus:bg-white focus:border-saffron outline-none transition"
              />
            </label>
          ))}

          {err && (
            <div data-testid="register-error" className="text-sm px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            data-testid="register-submit"
            className="w-full py-3.5 rounded-full bg-saffron text-white hover:bg-saffron-hover disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
          >
            {busy ? "Creating..." : "Create account"}
            {!busy && <ArrowRight className="w-4 h-4" strokeWidth={1.8} />}
          </button>
        </form>

        <div className="mt-6 text-sm text-charcoal-soft text-center">
          Already have an account?{" "}
          <Link to="/login" data-testid="link-login" className="text-saffron hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
