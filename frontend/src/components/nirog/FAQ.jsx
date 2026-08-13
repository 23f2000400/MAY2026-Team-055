import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    q: "How does the 20% upfront fee actually work?",
    a: "When you book a confirmed slot, you pay 20% of the consultation fee via the app. This upfront commitment eliminates ghost bookings. If you cancel, the slot is released instantly and offered to the waitlist. If it gets filled, you receive a full refund automatically. If it stays empty, the deposit is retained — fair to the doctor whose time was blocked.",
  },
  {
    q: "What happens if the doctor is running late?",
    a: "Every patient in the queue receives an updated arrival-time notification the moment the schedule shifts. You'll know exactly when to return, so you can grab a chai, run an errand, or just wait comfortably.",
  },
  {
    q: "Can I book for my parents or children?",
    a: "Yes. You can save profiles for every family member and book on their behalf. Their medical history, prescriptions, and medicine alarms stay separate but accessible from your single account.",
  },
  {
    q: "How do medicine alarms work?",
    a: "The moment the doctor finalises your prescription, the app auto-configures alarms for every medicine — time, dose, and food instructions included. If you don't confirm within a few minutes of an alarm, it re-fires. Every confirmation grows your adherence streak.",
  },
  {
    q: "What do hospitals need to install?",
    a: "Nothing on the patient side beyond the app. Hospitals get a lightweight web dashboard for reception and doctors — no new hardware, no complex EHR migration. Full onboarding takes under a day.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. All patient records are encrypted at rest and in transit. NirogPath follows Indian DPDP-Act norms and hospital-grade compliance. Only you and your treating clinician can see your prescriptions.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <section
      id="faq"
      data-testid="faq-section"
      className="relative py-24 md:py-32 bg-bone"
    >
      <div className="max-w-4xl mx-auto px-6 md:px-12">
        <div className="max-w-2xl mb-12">
          <div className="text-xs uppercase tracking-[0.3em] text-saffron font-semibold">
            Frequently asked
          </div>
          <h2 className="mt-4 font-display text-4xl md:text-5xl text-charcoal tracking-tight leading-[1.05]">
            Answers to what you're wondering.
          </h2>
        </div>

        <div className="divide-y divide-subtle border-y border-subtle">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={i} data-testid={`faq-${i}`}>
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  data-testid={`faq-toggle-${i}`}
                  className="w-full flex items-center justify-between gap-6 py-6 md:py-7 text-left group"
                >
                  <span className="font-display text-xl md:text-2xl text-charcoal group-hover:text-saffron transition-colors">
                    {f.q}
                  </span>
                  <span
                    className={`w-9 h-9 rounded-full grid place-items-center flex-shrink-0 transition-colors ${
                      isOpen
                        ? "bg-saffron text-white"
                        : "bg-white border border-subtle text-charcoal"
                    }`}
                  >
                    {isOpen ? (
                      <Minus className="w-4 h-4" strokeWidth={2} />
                    ) : (
                      <Plus className="w-4 h-4" strokeWidth={2} />
                    )}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <p className="pb-6 md:pb-8 max-w-2xl text-charcoal-soft leading-relaxed">
                        {f.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
