import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  ShieldCheck,
  Star,
  Clock,
  MapPin,
  CheckCircle2,
  ChevronRight,
  BellRing,
} from "lucide-react";

const DEMO_SLOTS = ["09:00", "09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45"];
const TAKEN_SLOTS = new Set(["09:00", "09:15", "09:45"]);

const QUICK_TAGS = ["Fever", "Heart", "Skin", "Children", "Diabetes", "Bone"];

export default function Hero() {
  const navigate = useNavigate();
  const [searchQ, setSearchQ] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("10:15");
  const [confirmed, setConfirmed] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/search${searchQ ? `?q=${encodeURIComponent(searchQ)}` : ""}`);
  };

  return (
    <section
      id="top"
      data-testid="hero-section"
      className="relative overflow-hidden pt-24 md:pt-32 pb-16 md:pb-24"
    >
      <div className="hero-blob bg-saffron w-[480px] h-[480px] -left-28 top-20 opacity-40" />
      <div className="hero-blob bg-teal w-[360px] h-[360px] right-0 top-52 opacity-25" />

      <div className="relative max-w-7xl mx-auto px-6 md:px-12 grid lg:grid-cols-2 gap-14 items-center">

        {/* Left — copy */}
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-subtle text-xs uppercase tracking-[0.2em] text-teal font-semibold shadow-soft"
            data-testid="hero-badge"
          >
            <ShieldCheck className="w-3.5 h-3.5" strokeWidth={2} />
            Booking · Queue · Prescriptions
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.7 }}
            className="mt-6 font-display text-5xl md:text-6xl lg:text-7xl text-charcoal leading-[0.94] tracking-tighter"
            data-testid="hero-heading"
          >
            Book the slot.
            <br />
            Skip the wait.
            <br />
            <span className="italic text-saffron">Heal faster.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.7 }}
            className="mt-5 text-lg text-charcoal-soft leading-relaxed max-w-lg"
            data-testid="hero-subheading"
          >
            Search verified hospitals, book your exact slot, track the live
            queue, and walk out with a digital prescription — all in one app.
          </motion.p>

          {/* Search bar */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34, duration: 0.7 }}
            onSubmit={handleSearch}
            className="mt-8 flex items-center gap-2 p-2 bg-white rounded-2xl border border-subtle shadow-medium"
          >
            <Search className="w-5 h-5 text-charcoal-soft ml-2 flex-shrink-0" strokeWidth={1.8} />
            <input
              type="text"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Hospital, doctor, disease, area..."
              className="flex-1 py-2 px-2 font-body text-charcoal bg-transparent focus:outline-none placeholder:text-charcoal-soft/60"
            />
            <button
              type="submit"
              data-testid="hero-primary-cta"
              className="px-5 py-2.5 rounded-xl bg-saffron text-white font-body text-sm hover:bg-saffron-hover transition-colors flex-shrink-0"
            >
              Search
            </button>
          </motion.form>

          {/* Quick disease tags */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.48 }}
            className="mt-3 flex flex-wrap gap-2"
          >
            {QUICK_TAGS.map((tag) => (
              <Link
                key={tag}
                to={`/search?q=${tag}`}
                className="px-3 py-1 rounded-full text-xs font-body border border-subtle text-charcoal-soft hover:border-saffron hover:text-saffron transition-colors bg-white"
              >
                {tag}
              </Link>
            ))}
          </motion.div>

          {/* Trust signals */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            data-testid="hero-stats"
            className="mt-10 flex flex-wrap gap-6"
          >
            {[
              { icon: ShieldCheck, label: "Verified hospitals", color: "text-teal" },
              { icon: Clock, label: "Live queue tracking", color: "text-sage" },
              { icon: Star, label: "Digital prescriptions", color: "text-saffron" },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center gap-2">
                <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} strokeWidth={1.8} />
                <span className="font-body text-sm text-charcoal-soft">{label}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right — booking mockup */}
        <div className="relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="bg-white rounded-3xl shadow-medium border border-subtle overflow-hidden"
            data-testid="hero-token-widget"
          >
            {/* Hospital image header */}
            <div className="relative h-44 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=70"
                alt="Aarogya Care Hospital"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              <div className="absolute top-3 left-3">
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-teal text-xs font-body shadow-sm">
                  <ShieldCheck className="w-3 h-3" strokeWidth={2} /> Verified
                </span>
              </div>
              <div className="absolute bottom-4 left-4 right-4">
                <h3 className="font-display text-xl text-white">Aarogya Care, Pune</h3>
                <div className="flex items-center gap-3 text-white/80 text-xs mt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Kothrud, Pune
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-saffron text-saffron" /> 4.8 · 1,204 reviews
                  </span>
                </div>
              </div>
            </div>

            {/* Slot picker */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="font-body text-xs text-charcoal-soft uppercase tracking-widest">
                  Today's slots · Dr. Priya Mehta
                </span>
                <span className="font-body text-xs text-teal">Cardiologist</span>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {DEMO_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => { setSelectedSlot(slot); setConfirmed(false); }}
                    disabled={TAKEN_SLOTS.has(slot)}
                    className={`py-2 rounded-xl font-mono text-xs transition-all ${
                      TAKEN_SLOTS.has(slot)
                        ? "bg-subtle text-charcoal-soft/40 cursor-not-allowed"
                        : selectedSlot === slot
                        ? "bg-saffron text-white shadow-sm scale-105"
                        : "bg-bone border border-subtle hover:border-saffron text-charcoal"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>

              <div className="flex gap-3 mt-3 text-[10px] font-body text-charcoal-soft">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-bone border border-subtle inline-block" /> Available
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-saffron inline-block" /> Selected
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-subtle inline-block" /> Booked
                </span>
              </div>

              <motion.button
                onClick={() => setConfirmed(true)}
                whileTap={{ scale: 0.97 }}
                className={`mt-4 w-full py-3 rounded-xl font-body text-sm transition-all flex items-center justify-center gap-2 ${
                  confirmed
                    ? "bg-sage text-white"
                    : "bg-saffron text-white hover:bg-saffron-hover"
                }`}
              >
                {confirmed ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
                    Slot confirmed! · Token #07
                  </>
                ) : (
                  <>Book {selectedSlot} · ₹120 deposit</>
                )}
              </motion.button>
            </div>
          </motion.div>

          {/* Floating: live queue */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="absolute -left-8 top-1/2 -translate-y-1/2 bg-charcoal text-bone rounded-2xl p-4 shadow-xl w-[180px]"
          >
            <div className="flex items-center gap-1.5 text-[10px] text-bone/60 mb-2 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-sage animate-pulse inline-block" />
              Live queue
            </div>
            <div className="font-mono text-4xl text-white leading-none">#07</div>
            <div className="text-xs text-bone/60 mt-1">Your token</div>
            <div className="mt-2.5 pt-2.5 border-t border-bone/10 text-xs text-bone/60">
              Serving <span className="font-mono text-bone">#04</span><br />
              Est. <span className="text-saffron font-medium">18 min</span>
            </div>
          </motion.div>

          {/* Floating: notification */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.6 }}
            className="absolute -right-4 bottom-6 bg-white border border-subtle rounded-2xl px-4 py-3 shadow-medium flex items-center gap-3 max-w-[220px]"
            data-testid="hero-notif-widget"
          >
            <div className="w-8 h-8 rounded-full bg-saffron/10 grid place-items-center flex-shrink-0">
              <BellRing className="w-4 h-4 text-saffron" strokeWidth={1.8} />
            </div>
            <div className="text-xs leading-snug">
              <div className="text-charcoal font-medium">You're next!</div>
              <div className="text-charcoal-soft">Dr. Mehta is ready · Cabin 2</div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Clinic trust bar */}
      <div className="relative mt-20 max-w-7xl mx-auto px-6 md:px-12">
        <div className="flex items-center gap-4 text-xs uppercase tracking-[0.3em] text-charcoal-soft mb-5">
          <span className="h-px flex-1 bg-subtle" />
          <span>Hospitals & clinics on NirogPath</span>
          <span className="h-px flex-1 bg-subtle" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 opacity-70">
          {[
            "Aarogya Clinic",
            "Sanjeevani Hospital",
            "Prakash Diagnostics",
            "Meera Multispeciality",
            "Ganga Care",
          ].map((n) => (
            <div key={n} className="font-display text-lg text-charcoal-soft text-center md:text-left">
              {n}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
