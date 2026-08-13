import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import NavSearch from "@/components/nirog/NavSearch";

const roleHome = {
  patient: "/app/patient",
  doctor: "/app/doctor",
  reception: "/app/reception",
  admin: "/app/reception",
};

const links = [
  { label: "Problem", href: "#problem" },
  { label: "Features", href: "#features" },
  { label: "Demo", href: "#demo" },
  { label: "Journey", href: "#journey" },
  { label: "For You", href: "#audience" },
  { label: "FAQ", href: "#faq" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const auth = useAuth();
  const user = auth?.user;
  const dashHref = user ? roleHome[user.role] || "/" : "/login";
  const dashLabel = user ? "My dashboard" : "Sign in";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      data-testid="site-nav"
      className={`fixed top-0 inset-x-0 z-50 transition-[background,box-shadow,backdrop-filter] duration-300 ${
        scrolled
          ? "backdrop-blur-xl bg-bone/75 border-b border-subtle/70 shadow-soft"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
        <a
          href="#top"
          data-testid="nav-logo"
          className="flex items-center gap-2 group"
        >
          <span className="w-9 h-9 rounded-full bg-charcoal text-bone grid place-items-center font-display text-xl leading-none pt-[2px]">
            न
          </span>
          <span className="font-display text-2xl tracking-tight text-charcoal">
            NirogPath
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              data-testid={`nav-link-${l.label.toLowerCase()}`}
              className="text-sm text-charcoal-soft hover:text-saffron transition-colors duration-200"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <NavSearch />
          <Link
            to={dashHref}
            data-testid="nav-cta-signin"
            className="text-sm px-4 py-2 rounded-full border border-charcoal/15 text-charcoal hover:border-charcoal transition-colors"
          >
            {dashLabel}
          </Link>
          <Link
            to={user ? dashHref : "/register"}
            data-testid="nav-cta-download"
            className="group text-sm px-4 py-2 rounded-full bg-saffron text-white hover:bg-saffron-hover transition-colors flex items-center gap-1.5"
          >
            {user ? "Open dashboard" : "Get started"}
            <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={1.8}/>
          </Link>
        </div>

        <button
          data-testid="nav-mobile-toggle"
          onClick={() => setOpen(!open)}
          className="md:hidden w-10 h-10 grid place-items-center rounded-full border border-subtle bg-white/70 backdrop-blur"
          aria-label="Menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden border-t border-subtle bg-bone"
          >
            <div className="px-6 py-6 flex flex-col gap-4">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  data-testid={`mobile-nav-${l.label.toLowerCase()}`}
                  className="text-charcoal text-lg font-display"
                >
                  {l.label}
                </a>
              ))}
              <Link
                to={user ? dashHref : "/register"}
                onClick={() => setOpen(false)}
                data-testid="mobile-nav-cta"
                className="mt-2 px-5 py-3 rounded-full bg-saffron text-white text-center"
              >
                {user ? "Open dashboard" : "Get started"}
              </Link>
              <Link
                to={user ? dashHref : "/login"}
                onClick={() => setOpen(false)}
                data-testid="mobile-nav-signin"
                className="mt-2 px-5 py-3 rounded-full border border-charcoal/20 text-charcoal text-center"
              >
                {dashLabel}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
