import React from "react";
import { Compass, ShieldOff, ServerCrash } from "lucide-react";

const roleHome = {
  patient: "/app/patient",
  doctor: "/app/doctor",
  reception: "/app/reception",
};

const configs = {
  404: {
    Icon: Compass,
    title: "Lost in the wards",
    message: "We couldn't find that page. Even our best doctors are stumped.",
    primaryLabel: "Back to homepage",
    primaryAction: () => { window.location.href = "/"; },
    testId: "error-page-404",
  },
  403: {
    Icon: ShieldOff,
    title: "Access denied",
    message: "You're not authorized to see this. Doctor-patient confidentiality extends to web routes too.",
    primaryLabel: "Go back",
    primaryAction: () => { window.history.back(); },
    testId: "error-page-403",
  },
  500: {
    Icon: ServerCrash,
    title: "Something went wrong",
    message: "Something broke on our end. Our engineers are already embarrassed.",
    primaryLabel: "Refresh the page",
    primaryAction: () => { window.location.reload(); },
    testId: "error-page-500",
  },
};

export default function ErrorState({ kind = "404", error = null }) {
  const config = configs[kind] || configs["404"];
  const { Icon, title, message, primaryLabel, primaryAction, testId } = config;

  return (
    <div
      className="min-h-screen bg-bone flex flex-col items-center justify-center px-6 py-12 text-center"
      data-testid={testId}
    >
      {/* Icon halo */}
      <div className="w-24 h-24 rounded-full bg-saffron/10 grid place-items-center mb-8">
        <Icon className="w-12 h-12 text-saffron" strokeWidth={1.5} />
      </div>

      {/* Large ghost number */}
      <div className="font-display text-8xl md:text-9xl text-charcoal/10 font-medium select-none leading-none">
        {kind}
      </div>

      {/* Title */}
      <h1 className="mt-2 font-display text-3xl md:text-4xl text-charcoal tracking-tight">
        {title}
      </h1>

      {/* Message */}
      <p className="mt-4 font-body text-charcoal-soft max-w-md leading-relaxed">
        {message}
      </p>

      {error && (
        <div className="mt-6 w-full max-w-xl p-4 rounded-2xl bg-red-50 border border-red-200 text-left font-mono text-xs overflow-auto">
          <div className="font-bold text-red-600 mb-1">Uncaught Exception:</div>
          <div className="text-red-800 font-semibold">{error?.toString()}</div>
          {error?.stack && <pre className="mt-2 text-gray-500 whitespace-pre-wrap text-[11px] max-h-48 overflow-y-auto">{error.stack}</pre>}
        </div>
      )}

      {/* CTAs */}
      <div className="mt-10 flex flex-wrap gap-3 justify-center">
        <button
          onClick={primaryAction}
          className="px-8 py-3 rounded-full bg-saffron text-white font-body text-sm tracking-wide hover:bg-saffron-hover transition-colors"
          data-testid="error-cta-home"
        >
          {primaryLabel}
        </button>
        <button
          onClick={() => { window.location.href = "/"; }}
          className="px-8 py-3 rounded-full border border-subtle text-charcoal font-body text-sm hover:border-charcoal transition-colors"
          data-testid="error-cta-dashboard"
        >
          Go to home
        </button>
      </div>

      {/* Subtle brand footer */}
      <div className="mt-16 flex items-center gap-2 text-charcoal/30">
        <span className="w-6 h-6 rounded-full bg-charcoal/10 grid place-items-center font-display text-sm pt-px">
          न
        </span>
        <span className="font-display text-sm">NirogPath</span>
      </div>
    </div>
  );
}
