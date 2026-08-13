import React, { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";

const stats = [
  { n: 87, suffix: "%", label: "fewer no-shows in pilot clinics" },
  { n: 42, suffix: "min", label: "avg. wait time cut per patient" },
  { n: 3.5, suffix: "×", label: "medicine adherence improvement" },
  { n: 30, suffix: "+", label: "clinics live across 4 cities" },
];

function Counter({ target, suffix }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [v, setV] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 1400;
    const start = performance.now();
    const isFloat = !Number.isInteger(target);
    let raf;
    const tick = (t) => {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(isFloat ? +(target * eased).toFixed(1) : Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target]);

  return (
    <span ref={ref} className="font-mono">
      {v}
      {suffix}
    </span>
  );
}

export default function Stats() {
  return (
    <section
      data-testid="stats-section"
      className="relative py-24 md:py-32 bg-saffron text-white overflow-hidden"
    >
      <div className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 10% 20%, rgba(255,255,255,0.15) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(0,0,0,0.15) 0%, transparent 40%)",
        }}
      />
      <div className="relative max-w-7xl mx-auto px-6 md:px-12">
        <div className="max-w-3xl">
          <div className="text-xs uppercase tracking-[0.3em] text-white/70 font-semibold">
            The numbers from our pilots
          </div>
          <h2 className="mt-4 font-display text-4xl md:text-5xl lg:text-6xl leading-[1.05] tracking-tight">
            Small changes to a screen.{" "}
            <span className="italic text-white/80">Massive changes</span> to a
            hospital's day.
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.6 }}
              className="border-t border-white/30 pt-6"
              data-testid={`stat-${i}`}
            >
              <div className="text-5xl md:text-6xl font-mono leading-none">
                <Counter target={s.n} suffix={s.suffix} />
              </div>
              <div className="mt-3 text-sm md:text-base text-white/85 leading-snug">
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
