import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, MapPin, ShieldCheck, ChevronRight, Loader2, BadgeCheck } from "lucide-react";
import { fetchApi } from "@/lib/api";

export default function HospitalsSection() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi("/api/public/hospitals")
      .then((r) => r.json())
      .then((data) => setHospitals(data.hospitals || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="py-20 md:py-28 bg-bone" data-testid="hospitals-section">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-saffron font-semibold mb-3">
              Verified & ready to book
            </div>
            <h2 className="font-display text-4xl md:text-5xl text-charcoal tracking-tight leading-tight">
              Hospitals on NirogPath
            </h2>
            <p className="mt-3 text-charcoal-soft font-body max-w-xl">
              Every clinic is audited before going live. Real ratings from real patients — no fake reviews.
            </p>
          </div>
          <Link
            to="/search"
            className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-subtle font-body text-sm text-charcoal hover:border-saffron hover:text-saffron transition-colors"
          >
            See all hospitals <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Hospital cards */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-saffron" />
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {hospitals.slice(0, 3).map((h, i) => (
              <motion.div
                key={h.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.1, duration: 0.55 }}
              >
                <Link
                  to={`/hospitals/${h.id}`}
                  className="group block bg-white rounded-3xl border border-subtle overflow-hidden hover:shadow-hoverGlow transition-all duration-200 h-full"
                >
                  {/* Image */}
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={h.image}
                      alt={h.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-teal text-xs font-body shadow-sm">
                        <ShieldCheck className="w-3 h-3" strokeWidth={2} /> Verified
                      </span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                      <div className="flex gap-1.5 flex-wrap">
                        {h.tags?.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] text-white bg-white/20 backdrop-blur px-2 py-0.5 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-display text-xl text-charcoal leading-tight">{h.name}</h3>
                    <p className="flex items-center gap-1.5 text-sm text-charcoal-soft mt-1">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.5} />
                      {h.area}, {h.city}
                    </p>

                    {/* Rating row */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= Math.round(h.rating)
                                ? "text-saffron fill-saffron"
                                : "text-subtle fill-subtle"
                            }`}
                          />
                        ))}
                        <span className="font-mono text-sm text-charcoal ml-1.5">{h.rating}</span>
                        <span className="text-xs text-charcoal-soft ml-1">({h.reviews?.toLocaleString()})</span>
                      </div>
                      <span className="text-xs font-body text-teal font-medium">
                        {h.doctor_count} doctor{h.doctor_count !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Specialties */}
                    <div className="flex flex-wrap gap-1 mt-3">
                      {h.specialties?.slice(0, 3).map((s) => (
                        <span
                          key={s}
                          className="text-[10px] px-2 py-0.5 bg-bone rounded-full text-charcoal-soft"
                        >
                          {s}
                        </span>
                      ))}
                    </div>

                    {/* CTA link */}
                    <div className="mt-4 pt-4 border-t border-subtle flex items-center justify-between">
                      <span className="font-body text-sm text-saffron group-hover:gap-2 flex items-center gap-1 transition-all">
                        View & book slots
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                      <div className="flex items-center gap-1 text-xs text-charcoal-soft">
                        <BadgeCheck className="w-3.5 h-3.5 text-teal" />
                        Verified reviews
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Mobile CTA */}
        <div className="mt-8 text-center md:hidden">
          <Link
            to="/search"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-saffron text-white font-body text-sm hover:bg-saffron-hover transition-colors"
          >
            See all hospitals <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Bottom trust strip */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: ShieldCheck,
              color: "text-teal bg-teal/10",
              title: "Every hospital is verified",
              body: "We audit each clinic's facilities, licensing, and staff before they go live on NirogPath.",
            },
            {
              icon: Star,
              color: "text-saffron bg-saffron/10",
              title: "Only real patient reviews",
              body: "Ratings come from patients who completed a consultation — no anonymous reviews, no fake stars.",
            },
            {
              icon: BadgeCheck,
              color: "text-sage bg-sage/10",
              title: "Slot availability in real-time",
              body: "What you see is what's actually free. Slots update live as other patients book or cancel.",
            },
          ].map(({ icon: Icon, color, title, body }) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex gap-4"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-5 h-5" strokeWidth={1.8} />
              </div>
              <div>
                <h4 className="font-display text-lg text-charcoal">{title}</h4>
                <p className="mt-1 text-sm text-charcoal-soft leading-relaxed">{body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
