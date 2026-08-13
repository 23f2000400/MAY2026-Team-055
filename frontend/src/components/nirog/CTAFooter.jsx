import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Star,
  Clock,
} from "lucide-react";

export default function CTAFooter() {
  return (
    <>
      <section
        id="cta"
        data-testid="cta-section"
        className="relative py-24 md:py-32 bg-charcoal text-bone overflow-hidden"
      >
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, #E26D5C 0%, transparent 35%), radial-gradient(circle at 85% 70%, #477998 0%, transparent 40%)",
          }}
        />
        <div className="relative max-w-5xl mx-auto px-6 md:px-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-xs uppercase tracking-[0.3em] text-saffron font-semibold">
              Book in 30 seconds
            </div>
            <h2 className="mt-4 font-display text-4xl md:text-6xl lg:text-7xl leading-[0.98] tracking-tighter">
              Stop waiting.{" "}
              <span className="italic text-saffron">Start booking.</span>
            </h2>
            <p className="mt-6 max-w-xl mx-auto text-bone/70 text-lg leading-relaxed">
              Find a verified hospital near you, pick your slot, and walk in at
              your time. No more guessing how long the queue is.
            </p>

            {/* Patient-facing CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/search"
                data-testid="cta-find-hospitals"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-full bg-saffron text-white hover:bg-saffron-hover transition-colors text-base font-body"
              >
                <Search className="w-4 h-4" strokeWidth={2} />
                Find hospitals near you
                <ArrowUpRight
                  className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  strokeWidth={1.8}
                />
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-bone/30 text-bone hover:border-saffron hover:text-saffron transition-colors text-base font-body"
              >
                Create free account
              </Link>
            </div>

            {/* Mini trust strip */}
            <div className="mt-10 flex flex-wrap gap-6 justify-center text-sm text-bone/50">
              {[
                { icon: ShieldCheck, label: "Verified hospitals" },
                { icon: Star, label: "Real patient reviews" },
                { icon: Clock, label: "Live queue tracking" },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-saffron" strokeWidth={1.8} />
                  {label}
                </span>
              ))}
            </div>

            <p className="mt-4 text-xs text-bone/30">
              Currently live in Bengaluru · Pune · Chennai
            </p>
          </motion.div>
        </div>
      </section>

      <footer
        data-testid="site-footer"
        className="bg-charcoal text-bone/70 border-t border-bone/10"
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-14 grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-full bg-saffron text-white grid place-items-center font-display text-xl pt-[2px]">
                न
              </span>
              <span className="font-display text-2xl text-bone">NirogPath</span>
            </div>
            <p className="mt-4 max-w-md leading-relaxed">
              India's hospital slot booking platform. Search verified hospitals,
              see real ratings, book your exact slot — and walk in at your time.
            </p>
          </div>

          <div>
            <div className="text-xs uppercase tracking-widest text-bone mb-4">
              For patients
            </div>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/search" className="hover:text-saffron transition">
                  Find hospitals
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-saffron transition">
                  Create account
                </Link>
              </li>
              <li>
                <a href="#journey" className="hover:text-saffron transition">
                  How it works
                </a>
              </li>
              <li>
                <a href="#audience" className="hover:text-saffron transition">
                  For hospitals
                </a>
              </li>
            </ul>
          </div>

          <div>
            <div className="text-xs uppercase tracking-widest text-bone mb-4">
              Contact
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5" strokeWidth={1.8} />
                hello@nirogpath.in
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5" strokeWidth={1.8} />
                +91 80-4567 8900
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" strokeWidth={1.8} />
                Bengaluru, India
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-bone/10">
          <div className="max-w-7xl mx-auto px-6 md:px-12 py-6 flex flex-wrap items-center justify-between gap-4 text-xs text-bone/50">
            <div>© {new Date().getFullYear()} NirogPath. All rights reserved.</div>
            <div className="flex gap-6">
              <a href="#" className="hover:text-saffron transition">Privacy</a>
              <a href="#" className="hover:text-saffron transition">Terms</a>
              <a href="#" className="hover:text-saffron transition">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
