import React from "react";
import { motion } from "framer-motion";
import {
  CalendarCheck,
  MapPinned,
  Radar,
  Stethoscope,
  FileText,
  AlarmClock,
} from "lucide-react";

const steps = [
  {
    icon: CalendarCheck,
    title: "Book with confidence",
    body: "Pick a hospital, specialty, doctor, time. Pay 20% upfront to confirm — the slot is truly yours.",
  },
  {
    icon: MapPinned,
    title: "Arrive & check in",
    body: "Tap 'I have arrived'. The app hands you a digital token and shows you the way to the right cabin.",
  },
  {
    icon: Radar,
    title: "Watch the queue move",
    body: "Live position, running-late alerts, walk-in flags. Grab a chai, we'll ping you when it's time.",
  },
  {
    icon: Stethoscope,
    title: "Walk into the consultation",
    body: "The doctor sees your digital history. You see a calm, prepared clinician.",
  },
  {
    icon: FileText,
    title: "Digital prescription",
    body: "Legible. Organised. Timestamped. Delivered to your app the second consultation ends.",
  },
  {
    icon: AlarmClock,
    title: "Medicine alarms & follow-up",
    body: "Auto-set alarms per medicine. Streak-tracked adherence. Ask the doctor a question, right from the prescription.",
  },
];

export default function Journey() {
  return (
    <section
      id="journey"
      data-testid="journey-section"
      className="relative py-24 md:py-32"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="max-w-3xl">
          <div className="text-xs uppercase tracking-[0.3em] text-saffron font-semibold">
            The patient journey
          </div>
          <h2 className="mt-4 font-display text-4xl md:text-5xl lg:text-6xl text-charcoal tracking-tight leading-[1.05]">
            Six steps.{" "}
            <span className="italic">Zero paper.</span> One quiet day.
          </h2>
        </div>

        <div className="relative mt-16 md:mt-24">
          {/* Center dashed line for desktop */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-px dashed-line" />

          <div className="space-y-14 md:space-y-24">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const left = i % 2 === 0;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.6 }}
                  data-testid={`journey-step-${i + 1}`}
                  className={`relative grid md:grid-cols-2 items-center gap-6 md:gap-16 ${
                    !left && "md:[&>*:first-child]:order-2"
                  }`}
                >
                  <div className={`${left ? "md:text-right" : "md:text-left"}`}>
                    <div className="font-mono text-xs text-saffron tracking-widest">
                      STEP {String(i + 1).padStart(2, "0")}
                    </div>
                    <h3 className="mt-3 font-display text-3xl md:text-4xl text-charcoal leading-tight">
                      {s.title}
                    </h3>
                    <p className="mt-3 text-charcoal-soft leading-relaxed max-w-md md:ml-auto">
                      {s.body}
                    </p>
                  </div>

                  <div
                    className={`flex ${
                      left ? "justify-start" : "justify-end"
                    } md:${left ? "justify-start" : "justify-end"}`}
                  >
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white border border-subtle shadow-soft grid place-items-center relative">
                      <Icon
                        className="w-10 h-10 md:w-12 md:h-12 text-saffron"
                        strokeWidth={1.4}
                      />
                      <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-charcoal text-bone font-mono text-xs grid place-items-center">
                        {i + 1}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
