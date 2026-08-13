import React from "react";
import { motion } from "framer-motion";
import {
  FileX,
  Volume2,
  Clock,
  ClipboardX,
  Pill,
  Ban,
  CheckCircle2,
  Calendar,
  BellRing,
  FileText,
  RefreshCcw,
} from "lucide-react";

const pairs = [
  {
    problem: {
      icon: Volume2,
      title: "Someone shouting your name in a crowded hall.",
      body: "You arrive at 10, but so did 40 others. Nobody knows who's next. You wait 3 hours, guessing.",
    },
    solution: {
      icon: BellRing,
      title: "A calm, digital queue that texts you when it's time.",
      body: "Tap 'I have arrived'. Watch a live token move. Get a phone-vibrating alert exactly when the doctor calls you next.",
    },
  },
  {
    problem: {
      icon: FileX,
      title: "Paper prescriptions no one can read.",
      body: "Illegible handwriting, lost slips, wrong medication, missed doses — a compounding disaster.",
    },
    solution: {
      icon: FileText,
      title: "Clean digital prescriptions with built-in alarms.",
      body: "Walk out with your prescription in the app. Every medicine has its own smart alarm — dose, time, and food instructions included.",
    },
  },
  {
    problem: {
      icon: Ban,
      title: "Ghost bookings that steal doctor time.",
      body: "Half the booked slots don't show up. Doctors sit idle. Real patients get turned away.",
    },
    solution: {
      icon: Calendar,
      title: "20% upfront confirms the slot — refunded outcome-based.",
      body: "Cancel? The slot goes live instantly. If it gets filled, you get a full refund. Everyone wins.",
    },
  },
  {
    problem: {
      icon: Pill,
      title: "You forget your evening dose. Again.",
      body: "No follow-up. No accountability. Adherence drops. The illness lingers.",
    },
    solution: {
      icon: CheckCircle2,
      title: "Streak-tracked adherence with dose confirmations.",
      body: "Each medicine has its own alarm. Miss it, we re-fire. Confirm it, your streak grows. Simple, humane, effective.",
    },
  },
  {
    problem: {
      icon: Clock,
      title: "Doctor's running 40 minutes late. Nobody tells you.",
      body: "You're stuck in a chair, phone dead, missing lunch. Frustration compounds.",
    },
    solution: {
      icon: RefreshCcw,
      title: "Running-late alerts with a new arrival time.",
      body: "The moment the schedule shifts, everyone in the queue gets a fresh ETA. Go grab a coffee. Come back on time.",
    },
  },
  {
    problem: {
      icon: ClipboardX,
      title: "Reception juggling paper, phones, and walk-ins.",
      body: "Impossible to prioritise emergencies. Impossible to see what's actually happening.",
    },
    solution: {
      icon: ClipboardX,
      title: "One dashboard. Live queue, walk-ins, and emergencies.",
      body: "Flag urgent patients. Offer queue transfers. See idle minutes per doctor. End every day with a clean summary.",
    },
  },
];

export default function ProblemSolution() {
  return (
    <section
      id="problem"
      data-testid="problem-solution-section"
      className="relative py-24 md:py-32 bg-bone"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="max-w-3xl">
          <div className="text-xs uppercase tracking-[0.3em] text-saffron font-semibold">
            Problems → NirogPath
          </div>
          <h2 className="mt-4 font-display text-4xl md:text-5xl lg:text-6xl text-charcoal tracking-tight leading-[1.05]">
            Every friction in Indian healthcare,{" "}
            <span className="italic text-saffron">designed away</span>.
          </h2>
          <p className="mt-6 text-lg text-charcoal-soft max-w-2xl">
            We didn't build a hospital app. We rebuilt the patient's day —
            problem by problem — into something quiet, dignified, and
            predictable.
          </p>
        </div>

        <div className="mt-16 md:mt-24 space-y-16 md:space-y-24">
          {pairs.map((p, i) => {
            const PIcon = p.problem.icon;
            const SIcon = p.solution.icon;
            const reverse = i % 2 === 1;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6 }}
                className={`grid md:grid-cols-2 gap-6 md:gap-10 items-stretch ${
                  reverse ? "md:[&>*:first-child]:order-2" : ""
                }`}
                data-testid={`problem-pair-${i}`}
              >
                {/* Problem card */}
                <div className="relative rounded-3xl p-8 md:p-10 bg-white/40 border border-dashed border-charcoal/15">
                  <div className="text-xs uppercase tracking-[0.25em] text-charcoal-soft/70 mb-6">
                    The way it is
                  </div>
                  <PIcon
                    className="w-8 h-8 text-charcoal/40 mb-6"
                    strokeWidth={1.5}
                  />
                  <h3 className="font-display text-2xl md:text-3xl text-charcoal/70 leading-snug">
                    {p.problem.title}
                  </h3>
                  <p className="mt-4 text-charcoal-soft/80 leading-relaxed">
                    {p.problem.body}
                  </p>
                </div>

                {/* Solution card */}
                <div className="relative rounded-3xl p-8 md:p-10 bg-white border border-subtle shadow-soft hover:shadow-hoverGlow transition-shadow">
                  <div className="text-xs uppercase tracking-[0.25em] text-saffron font-semibold mb-6">
                    The NirogPath way
                  </div>
                  <div className="w-12 h-12 rounded-full bg-saffron/10 grid place-items-center mb-6">
                    <SIcon
                      className="w-5 h-5 text-saffron"
                      strokeWidth={1.8}
                    />
                  </div>
                  <h3 className="font-display text-2xl md:text-3xl text-charcoal leading-snug">
                    {p.solution.title}
                  </h3>
                  <p className="mt-4 text-charcoal-soft leading-relaxed">
                    {p.solution.body}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
