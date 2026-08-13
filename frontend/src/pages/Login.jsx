import React, { useState } from "react";
import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { formatApiError } from "@/lib/api";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft } from "lucide-react";

const demoAccounts = [
  { email: "patient@nirog.in", label: "Patient · Rahul", role: "patient" },
  { email: "kavya@nirog.in", label: "Doctor · Dr. Kavya", role: "doctor" },
  { email: "reception@nirog.in", label: "Receptionist · Clinic", role: "reception" },
  { email: "admin@nirog.in", label: "Admin · Superuser", role: "admin" },
];

const roleHome = {
  patient: "/app/patient",
  doctor: "/app/doctor",
  reception: "/app/reception",
  admin: "/app/reception",
};

export default function Login() {
  const { login, user } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={roleHome[user.role] || "/"} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const u = await login(email, password);
      const to = loc.state?.from || roleHome[u.role] || "/";
      nav(to, { replace: true });
    } catch (e) {
      setErr(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const applyDemo = (em) => {
    setEmail(em);
    setPassword("nirog1234");
  };

  return (
    <div className="min-h-screen bg-bone flex items-center justify-center px-6 py-16">
      <div className="max-w-5xl w-full grid md:grid-cols-2 rounded-3xl overflow-hidden border border-subtle shadow-medium bg-white">
        <div className="hidden md:flex md:flex-col justify-between bg-charcoal text-bone p-12 relative overflow-hidden min-h-[600px]">
          <div>
            <Link to="/" data-testid="auth-back-home" className="inline-flex items-center gap-2 text-bone/70 hover:text-saffron transition text-sm">
              <ArrowLeft className="w-4 h-4" strokeWidth={1.8} />
              Back to NirogPath
            </Link>
            <div className="mt-12">
              <div className="w-11 h-11 rounded-full bg-saffron grid place-items-center font-display text-2xl pt-[3px]">न</div>
              <h1 className="mt-8 font-display text-5xl leading-none tracking-tight">
                Welcome back.
              </h1>
              <p className="mt-6 text-bone/70 leading-relaxed max-w-xs">
                Sign in as a patient, doctor, or reception to try the live NirogPath dashboards.
              </p>
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-widest text-bone/50 mb-3">Try any role instantly</div>
            <div className="space-y-2">
              {demoAccounts.map((d) => (
                <button
                  key={d.email}
                  onClick={() => applyDemo(d.email)}
                  data-testid={`demo-account-${d.role}`}
                  className="w-full text-left flex items-center justify-between text-sm px-4 py-2.5 rounded-full bg-bone/10 hover:bg-saffron/20 border border-bone/10 transition"
                >
                  <span>{d.label}</span>
                  <span className="text-bone/50">
                    <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.8} />
                  </span>
                </button>
              ))}
            </div>
            <div className="text-xs text-bone/50 mt-3">password: nirog1234</div>
          </div>
        </div>

        <div className="p-8 md:p-12">
          <div className="text-xs uppercase tracking-[0.25em] text-saffron font-semibold">Sign in</div>
          <h2 className="mt-3 font-display text-4xl text-charcoal leading-tight">Continue to your dashboard</h2>

          <form onSubmit={submit} className="mt-10 space-y-5" data-testid="login-form">
            <label className="block">
              <span className="text-sm text-charcoal-soft">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="login-email-input"
                className="mt-1.5 w-full px-4 py-3 rounded-xl border border-subtle bg-bone/60 focus:bg-white focus:border-saffron outline-none transition"
                placeholder="you@nirogpath.in"
              />
            </label>
            <label className="block">
              <span className="text-sm text-charcoal-soft">Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="login-password-input"
                className="mt-1.5 w-full px-4 py-3 rounded-xl border border-subtle bg-bone/60 focus:bg-white focus:border-saffron outline-none transition"
                placeholder="••••••••"
              />
            </label>

            {err && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                data-testid="login-error"
                className="text-sm px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700"
              >
                {err}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={busy}
              data-testid="login-submit"
              className="w-full py-3.5 rounded-full bg-charcoal text-bone hover:bg-saffron disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {busy ? "Signing in..." : "Sign in"}
              {!busy && <ArrowRight className="w-4 h-4" strokeWidth={1.8} />}
            </button>
          </form>

          <div className="mt-8 text-sm text-charcoal-soft">
            New to NirogPath?{" "}
            <Link to="/register" data-testid="link-register" className="text-saffron hover:underline">
              Create a patient account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
