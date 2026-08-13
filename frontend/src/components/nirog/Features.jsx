import React from "react";
import { motion } from "framer-motion";
import {
  Radar,
  AlarmClock,
  Users,
  MapPin,
  BarChart3,
  RefreshCw,
  Wallet,
  FileText,
  BellRing,
  UserPlus,
} from "lucide-react";

const items = [
  {
    icon: Radar,
    title: "Real-time digital queue",
    body: "Live token, current-serving number, arrival confirmation, urgent-patient flags — all in one calm view.",
    size: "col-span-12 md:col-span-8 row-span-2 bg-charcoal text-bone",
    testId: "feature-queue",
    accent: "bg-saffron/20 text-saffron",
    illustration: (
      <div className="mt-8 flex items-end gap-2 h-24 md:h-32">
        {[8, 14, 10, 18, 22, 16, 24, 30, 20, 28, 34, 26].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-md bg-bone/15"
            style={{ height: `${h * 3}px` }}
          >
            <div
              className="w-full rounded-t-md bg-saffron"
              style={{ height: `${Math.min(h * 2, h * 3)}px` }}
            />
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: AlarmClock,
    title: "Smart medicine alarms",
    body: "Time, dose and food instructions baked into every reminder. Re-fires if you don't confirm.",
    size: "col-span-12 md:col-span-4 row-span-2 bg-saffron text-white",
    testId: "feature-alarms",
    accent: "bg-white/20 text-white",
    illustration: (
      <div className="mt-8 space-y-3">
        {[
          { t: "08:00", m: "Metformin · after breakfast" },
          { t: "14:00", m: "Amoxicillin · with water" },
          { t: "22:00", m: "Atorvastatin · before sleep" },
        ].map((r) => (
          <div
            key={r.t}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/15 backdrop-blur-sm"
          >
            <span className="font-mono text-sm">{r.t}</span>
            <span className="text-sm opacity-90">{r.m}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Users,
    title: "Family profiles",
    body: "Book for grandma, dad, or your kid — one tap.",
    size: "col-span-6 md:col-span-4 bg-white text-charcoal",
    testId: "feature-family",
    accent: "bg-teal/15 text-teal",
  },
  {
    icon: MapPin,
    title: "Directions to the cabin",
    body: "Once you arrive, the app guides you inside the hospital.",
    size: "col-span-6 md:col-span-4 bg-white text-charcoal",
    testId: "feature-directions",
    accent: "bg-sage/25 text-sage",
  },
  {
    icon: Wallet,
    title: "Outcome-based refunds",
    body: "Cancel? Full refund if the slot fills up. Fair to everyone.",
    size: "col-span-12 md:col-span-4 bg-teal text-white",
    testId: "feature-refunds",
    accent: "bg-white/20 text-white",
  },
  {
    icon: FileText,
    title: "Digital prescriptions",
    body: "Legible, timestamped, delivered to the patient's app the second the consultation ends. Tap to reorder, tap to print.",
    size: "col-span-12 md:col-span-4 bg-white text-charcoal",
    testId: "feature-prescription",
    accent: "bg-teal/15 text-teal",
    illustration: (
      <div className="mt-6 space-y-2">
        {[
          { name: "Metformin 500mg", note: "After breakfast · 30 days" },
          { name: "Atorvastatin 10mg", note: "Before sleep · 30 days" },
        ].map((m) => (
          <div key={m.name} className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-bone border border-subtle">
            <div className="w-2 h-2 rounded-full bg-teal mt-1.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-medium text-charcoal">{m.name}</div>
              <div className="text-xs text-charcoal-soft">{m.note}</div>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: UserPlus,
    title: "Walk-in & emergency queue",
    body: "Reception adds walk-ins in one tap. Urgent patients get flagged and queue-jumped. No paper, no shouting.",
    size: "col-span-12 md:col-span-4 bg-white text-charcoal",
    testId: "feature-walkin",
    accent: "bg-sage/25 text-sage",
  },
  {
    icon: BarChart3,
    title: "Daily hospital summary",
    body: "Bookings, arrivals, no-shows, avg. consultation time, idle minutes per doctor — auto-generated at close.",
    size: "col-span-12 md:col-span-4 bg-white text-charcoal",
    testId: "feature-analytics",
    accent: "bg-ochre/25 text-ochre",
  },
  {
    icon: RefreshCw,
    title: "Dynamic slot allocation",
    body: "First-timers get longer slots. Follow-ups get shorter. The schedule adapts to reality.",
    size: "col-span-12 md:col-span-6 bg-white text-charcoal",
    testId: "feature-dynamic",
    accent: "bg-saffron/15 text-saffron",
  },
  {
    icon: BellRing,
    title: "Waitlist & cancellation alerts",
    body: "Slot freed up? Every patient on the waitlist gets notified instantly. First to tap, first to book.",
    size: "col-span-12 md:col-span-6 bg-white text-charcoal",
    testId: "feature-waitlist",
    accent: "bg-charcoal/10 text-charcoal",
  },
];

export default function Features() {
  return (
    <section
      id="features"
      data-testid="features-section"
      className="relative py-24 md:py-32"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="max-w-3xl">
          <div className="text-xs uppercase tracking-[0.3em] text-saffron font-semibold">
            Everything we've built
          </div>
          <h2 className="mt-4 font-display text-4xl md:text-5xl lg:text-6xl text-charcoal tracking-tight leading-[1.05]">
            Booking. Queue. Prescriptions.{" "}
            <span className="italic">Everything, in one app.</span>
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-12 auto-rows-[minmax(160px,auto)] gap-4 md:gap-6">
          {items.map((it, i) => {
            const Icon = it.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                data-testid={it.testId}
                className={`relative overflow-hidden rounded-3xl p-6 md:p-8 border border-subtle ${it.size}`}
              >
                <div
                  className={`w-11 h-11 rounded-full grid place-items-center ${it.accent}`}
                >
                  <Icon className="w-5 h-5" strokeWidth={1.7} />
                </div>
                <h3 className="mt-5 font-display text-2xl md:text-3xl leading-tight tracking-tight">
                  {it.title}
                </h3>
                <p className="mt-3 text-sm md:text-base opacity-80 max-w-md leading-relaxed">
                  {it.body}
                </p>
                {it.illustration}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
