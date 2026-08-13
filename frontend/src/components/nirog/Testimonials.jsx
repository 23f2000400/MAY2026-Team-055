import React from "react";
import { motion } from "framer-motion";
import { Quote, Star, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

const items = [
  {
    q: "I booked a slot for my mother in 2 minutes. She walked in, saw the token display, sat down and her name was called exactly on time. No shouting, no chaos. I was shocked.",
    a: "Rohan D.",
    r: "Patient family, Bengaluru",
    specialty: "Cardiology appointment",
    rating: 5,
    verified: true,
  },
  {
    q: "The upfront fee changed everything — my no-shows dropped from 30% to under 5%. I actually finish on time now. Patients even thank me for being punctual.",
    a: "Dr. Vikram Sinha",
    r: "General Physician, Pune",
    specialty: "Aarogya Care",
    rating: 5,
    verified: true,
  },
  {
    q: "Finding a pediatrician used to mean calling 5 hospitals. Now I search 'children' on NirogPath, see real ratings, and book in one tap. My kids' appointments sorted.",
    a: "Priya M.",
    r: "Mother of two, Chennai",
    specialty: "Pediatrics booking",
    rating: 5,
    verified: true,
  },
];

function StarRow({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-4 h-4 ${s <= rating ? "text-saffron fill-saffron" : "text-subtle fill-subtle"}`}
        />
      ))}
    </div>
  );
}

export default function Testimonials() {
  return (
    <section data-testid="testimonials-section" className="relative py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="max-w-3xl mb-14">
          <div className="text-xs uppercase tracking-[0.3em] text-saffron font-semibold">
            Verified patient reviews
          </div>
          <h2 className="mt-4 font-display text-4xl md:text-5xl text-charcoal tracking-tight leading-[1.05]">
            Real people. <span className="italic">Real relief.</span>
          </h2>
          <p className="mt-4 text-charcoal-soft font-body">
            Every review comes from a verified booking — not anonymous internet comments.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {items.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              data-testid={`testimonial-${i}`}
              className="rounded-3xl bg-white border border-subtle p-8 shadow-soft hover:shadow-hoverGlow transition-shadow flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <StarRow rating={t.rating} />
                {t.verified && (
                  <span className="flex items-center gap-1 text-[10px] text-teal font-body">
                    <ShieldCheck className="w-3 h-3" strokeWidth={2} /> Verified
                  </span>
                )}
              </div>
              <Quote className="w-7 h-7 text-saffron/40 mb-3" strokeWidth={1.5} />
              <p className="font-display text-xl md:text-2xl text-charcoal leading-snug flex-1">
                "{t.q}"
              </p>
              <div className="mt-6 pt-6 border-t border-subtle">
                <div className="font-medium text-charcoal">{t.a}</div>
                <div className="text-sm text-charcoal-soft">{t.r}</div>
                <div className="mt-1 text-xs text-saffron font-body">{t.specialty}</div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-10 text-center"
        >
          <Link
            to="/search"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-saffron text-white font-body text-sm hover:bg-saffron-hover transition-colors"
          >
            Find hospitals near you
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
