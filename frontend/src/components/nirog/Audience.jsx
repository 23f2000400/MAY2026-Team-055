import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";

const groups = {
  patients: {
    label: "For Patients",
    image:
      "https://images.unsplash.com/photo-1659352791100-d3b073625eb4?auto=format&fit=crop&w=900&q=80",
    tagline: "Predictable healthcare, finally.",
    body: "Skip the shouting, the guesswork, and the illegible slips. Get on-time consultations, digital prescriptions, and gentle medicine alarms — for your whole family.",
    points: [
      "Book confirmed slots for any family member",
      "Live queue with 'you'll be called in ~12 min'",
      "Digital prescription with in-app doctor Q&A",
      "Streak-tracked medicine adherence",
    ],
  },
  doctors: {
    label: "For Doctors",
    image:
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=900&q=80",
    tagline: "Fewer no-shows. More real patients.",
    body: "Every slot is committed. Every prescription is legible. Every idle minute is measured. Focus on medicine, not on managing chaos.",
    points: [
      "20% upfront filters out ghost bookings",
      "Dynamic slot lengths for first-time vs follow-up",
      "One-tap prescription with pre-loaded reminders",
      "Handle urgent walk-ins with queue-transfer offers",
    ],
  },
  hospitals: {
    label: "For Hospitals",
    image:
      "https://images.pexels.com/photos/8459996/pexels-photo-8459996.jpeg?auto=compress&cs=tinysrgb&w=900",
    tagline: "Run the hospital like a control room.",
    body: "Live queue across all cabins, urgent-patient flagging, receptionist tools for transfers, and a clean daily summary of what actually happened.",
    points: [
      "Live operational dashboard for reception",
      "Idle minutes tracked per doctor, per day",
      "Instant slot release on cancellation with 'Notify Me'",
      "Auto daily summary — bookings, no-shows, avg. consult time",
    ],
  },
};

export default function Audience() {
  const [active, setActive] = useState("patients");
  const g = groups[active];

  return (
    <section
      id="audience"
      data-testid="audience-section"
      className="relative py-24 md:py-32 bg-bone"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-12">
          <div className="max-w-2xl">
            <div className="text-xs uppercase tracking-[0.3em] text-saffron font-semibold">
              Built for everyone in the room
            </div>
            <h2 className="mt-4 font-display text-4xl md:text-5xl lg:text-6xl text-charcoal tracking-tight leading-[1.05]">
              One platform. <span className="italic">Three lives</span> improved.
            </h2>
          </div>
          <div
            className="flex flex-wrap gap-2 p-1 rounded-full bg-white border border-subtle"
            data-testid="audience-tabs"
          >
            {Object.entries(groups).map(([k, v]) => (
              <button
                key={k}
                data-testid={`audience-tab-${k}`}
                onClick={() => setActive(k)}
                className={`px-5 py-2.5 rounded-full text-sm transition-colors ${
                  active === k
                    ? "bg-charcoal text-bone"
                    : "text-charcoal-soft hover:text-charcoal"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="grid lg:grid-cols-12 gap-8 items-center"
          >
            <div className="lg:col-span-5">
              <div className="rounded-3xl overflow-hidden aspect-[4/5] border border-subtle shadow-medium">
                <img
                  src={g.image}
                  alt={g.label}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="lg:col-span-7 lg:pl-8">
              <div className="font-display text-3xl md:text-5xl text-charcoal leading-tight tracking-tight">
                {g.tagline}
              </div>
              <p className="mt-6 text-lg text-charcoal-soft leading-relaxed max-w-xl">
                {g.body}
              </p>
              <ul className="mt-8 space-y-4 max-w-lg">
                {g.points.map((p) => (
                  <li key={p} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-saffron/15 grid place-items-center flex-shrink-0 mt-0.5">
                      <Check
                        className="w-3.5 h-3.5 text-saffron"
                        strokeWidth={2.4}
                      />
                    </span>
                    <span className="text-charcoal leading-relaxed">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
