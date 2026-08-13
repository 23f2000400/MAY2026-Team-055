import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Stethoscope,
  Calendar,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  MapPin,
  BellRing,
} from "lucide-react";

const doctors = [
  {
    id: "d1",
    name: "Dr. Kavya Iyer",
    specialty: "General Physician",
    fee: 500,
    slot: "10:15 AM",
    hospital: "Sanjeevani Clinic, Bengaluru",
  },
  {
    id: "d2",
    name: "Dr. Arjun Mehta",
    specialty: "Cardiologist",
    fee: 900,
    slot: "11:40 AM",
    hospital: "Aarogya Care, Pune",
  },
  {
    id: "d3",
    name: "Dr. Nisha Rao",
    specialty: "Pediatrician",
    fee: 600,
    slot: "12:20 PM",
    hospital: "Meera Multispeciality, Chennai",
  },
];

const slots = ["09:45", "10:15", "10:45", "11:15", "11:40", "12:00"];

export default function QueueDemo() {
  const [step, setStep] = useState(0); // 0 pick doctor, 1 pick slot, 2 token issued
  const [doctor, setDoctor] = useState(null);
  const [slot, setSlot] = useState(null);
  const [current, setCurrent] = useState(11);
  const [runningLate, setRunningLate] = useState(false);

  useEffect(() => {
    if (step !== 2) return;
    const id = setInterval(() => {
      setCurrent((c) => (c >= 13 ? 11 : c + 1));
    }, 2200);
    return () => clearInterval(id);
  }, [step]);

  const reset = () => {
    setStep(0);
    setDoctor(null);
    setSlot(null);
    setRunningLate(false);
    setCurrent(11);
  };

  const myToken = 14;

  return (
    <section
      id="demo"
      data-testid="queue-demo-section"
      className="relative py-24 md:py-32 bg-charcoal text-bone overflow-hidden"
    >
      <div className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, #E26D5C 0%, transparent 40%), radial-gradient(circle at 80% 70%, #477998 0%, transparent 40%)",
        }}
      />
      <div className="relative max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5">
            <div className="text-xs uppercase tracking-[0.3em] text-saffron font-semibold">
              Try it live
            </div>
            <h2 className="mt-4 font-display text-4xl md:text-5xl lg:text-6xl leading-[1.05] tracking-tight">
              Book. Arrive. Walk in{" "}
              <span className="italic text-saffron">on time</span>.
            </h2>
            <p className="mt-6 text-bone/70 text-lg leading-relaxed max-w-md">
              Move through the actual patient flow — from picking a doctor to
              watching your live token move. Toggle "Running late" to see how
              NirogPath adapts in real-time.
            </p>

            <div className="mt-8 space-y-3">
              {[
                { n: "01", t: "Choose doctor & slot" },
                { n: "02", t: "Confirm with 20% upfront fee" },
                { n: "03", t: "Live queue + notifications" },
              ].map((s, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-4 py-2 border-b border-bone/10 ${
                    step >= i ? "opacity-100" : "opacity-40"
                  }`}
                >
                  <span
                    className={`font-mono text-sm ${
                      step >= i ? "text-saffron" : "text-bone/40"
                    }`}
                  >
                    {s.n}
                  </span>
                  <span className="text-sm">{s.t}</span>
                  {step > i && (
                    <CheckCircle2
                      className="w-4 h-4 text-sage ml-auto"
                      strokeWidth={2}
                    />
                  )}
                </div>
              ))}
            </div>

            {step > 0 && (
              <button
                onClick={reset}
                data-testid="demo-reset"
                className="mt-8 inline-flex items-center gap-2 text-sm text-bone/70 hover:text-saffron transition"
              >
                <RotateCcw className="w-4 h-4" strokeWidth={1.8} />
                Reset demo
              </button>
            )}
          </div>

          <div className="lg:col-span-7">
            <div className="relative rounded-3xl bg-bone text-charcoal shadow-medium overflow-hidden">
              {/* App-like top bar */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-subtle">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-saffron" />
                  <span className="w-2.5 h-2.5 rounded-full bg-ochre" />
                  <span className="w-2.5 h-2.5 rounded-full bg-sage" />
                </div>
                <div className="font-display text-sm text-charcoal-soft">
                  nirogpath.app
                </div>
                <div className="w-8" />
              </div>

              <div className="p-6 md:p-10 min-h-[520px]">
                <AnimatePresence mode="wait">
                  {step === 0 && (
                    <motion.div
                      key="s0"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.35 }}
                    >
                      <div className="text-xs uppercase tracking-[0.25em] text-charcoal-soft">
                        Step 1
                      </div>
                      <h3 className="mt-2 font-display text-3xl md:text-4xl leading-tight">
                        Choose your doctor
                      </h3>
                      <div className="mt-6 space-y-3">
                        {doctors.map((d) => (
                          <button
                            key={d.id}
                            data-testid={`demo-doctor-${d.id}`}
                            onClick={() => {
                              setDoctor(d);
                              setStep(1);
                            }}
                            className="w-full text-left flex items-center gap-4 p-4 md:p-5 rounded-2xl border border-subtle bg-white hover:border-saffron hover:shadow-hoverGlow transition-all group"
                          >
                            <div className="w-12 h-12 rounded-full bg-saffron/10 grid place-items-center flex-shrink-0">
                              <Stethoscope
                                className="w-5 h-5 text-saffron"
                                strokeWidth={1.8}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-display text-lg md:text-xl">
                                {d.name}
                              </div>
                              <div className="text-sm text-charcoal-soft">
                                {d.specialty} · {d.hospital}
                              </div>
                            </div>
                            <div className="text-right hidden sm:block">
                              <div className="font-mono text-sm">₹{d.fee}</div>
                              <div className="text-xs text-charcoal-soft">
                                next: {d.slot}
                              </div>
                            </div>
                            <ArrowRight
                              className="w-5 h-5 text-charcoal-soft group-hover:text-saffron group-hover:translate-x-1 transition"
                              strokeWidth={1.5}
                            />
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {step === 1 && doctor && (
                    <motion.div
                      key="s1"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.35 }}
                    >
                      <div className="text-xs uppercase tracking-[0.25em] text-charcoal-soft">
                        Step 2 · {doctor.name}
                      </div>
                      <h3 className="mt-2 font-display text-3xl md:text-4xl leading-tight">
                        Pick a slot
                      </h3>
                      <div className="mt-6 grid grid-cols-3 gap-3">
                        {slots.map((s) => (
                          <button
                            key={s}
                            data-testid={`demo-slot-${s}`}
                            onClick={() => setSlot(s)}
                            className={`p-4 rounded-2xl border transition-all ${
                              slot === s
                                ? "border-saffron bg-saffron/10 text-saffron"
                                : "border-subtle bg-white hover:border-charcoal/40"
                            }`}
                          >
                            <div className="font-mono text-lg">{s}</div>
                            <div className="text-xs text-charcoal-soft">
                              {slot === s ? "selected" : "available"}
                            </div>
                          </button>
                        ))}
                      </div>

                      <div className="mt-8 flex items-center justify-between p-5 rounded-2xl bg-white border border-subtle">
                        <div>
                          <div className="text-xs uppercase tracking-widest text-charcoal-soft">
                            Confirmation fee (20%)
                          </div>
                          <div className="font-mono text-2xl mt-1">
                            ₹{Math.round(doctor.fee * 0.2)}
                          </div>
                          <div className="text-xs text-charcoal-soft mt-1">
                            Balance ₹{doctor.fee - Math.round(doctor.fee * 0.2)}{" "}
                            due at visit · refundable if slot fills on cancel
                          </div>
                        </div>
                        <button
                          disabled={!slot}
                          onClick={() => setStep(2)}
                          data-testid="demo-confirm-booking"
                          className={`px-5 py-3 rounded-full text-sm transition-all ${
                            slot
                              ? "bg-charcoal text-bone hover:bg-saffron"
                              : "bg-subtle text-charcoal-soft/60 cursor-not-allowed"
                          }`}
                        >
                          Confirm slot
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {step === 2 && doctor && (
                    <motion.div
                      key="s2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.35 }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-xs uppercase tracking-[0.25em] text-sage">
                            Booked · Token issued
                          </div>
                          <h3 className="mt-2 font-display text-3xl md:text-4xl leading-tight">
                            You're #{myToken} for {doctor.name.split(" ")[1]}
                          </h3>
                          <div className="text-sm text-charcoal-soft mt-1">
                            {doctor.hospital} · slot {slot || doctor.slot}
                          </div>
                        </div>
                        <button
                          data-testid="demo-toggle-late"
                          onClick={() => setRunningLate((v) => !v)}
                          className={`text-xs px-3 py-2 rounded-full border transition ${
                            runningLate
                              ? "border-ochre bg-ochre/10 text-ochre"
                              : "border-subtle text-charcoal-soft hover:border-charcoal"
                          }`}
                        >
                          {runningLate ? "Doctor is late" : "Toggle: running late"}
                        </button>
                      </div>

                      <div className="mt-8 grid md:grid-cols-2 gap-4">
                        <div className="p-6 rounded-2xl bg-charcoal text-bone">
                          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-bone/60">
                            <span className="w-2 h-2 rounded-full bg-sage animate-pulseDot" />
                            Live queue
                          </div>
                          <div className="mt-4 font-mono text-5xl">
                            #{String(current).padStart(2, "0")}
                          </div>
                          <div className="text-sm text-bone/70 mt-1">
                            Now serving · you are 3 ahead
                          </div>

                          <div className="mt-6 flex gap-1.5">
                            {Array.from({ length: 8 }).map((_, i) => {
                              const tokenNum = current - 2 + i;
                              const isMine = tokenNum === myToken;
                              const past = tokenNum < current;
                              return (
                                <div
                                  key={i}
                                  className={`flex-1 h-10 rounded-md grid place-items-center font-mono text-xs ${
                                    isMine
                                      ? "bg-saffron text-white"
                                      : past
                                      ? "bg-bone/10 text-bone/40 line-through"
                                      : "bg-bone/15 text-bone/80"
                                  }`}
                                >
                                  {tokenNum}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="p-6 rounded-2xl bg-white border border-subtle">
                          {runningLate ? (
                            <>
                              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-ochre font-semibold">
                                <BellRing className="w-3.5 h-3.5" />
                                Running late alert
                              </div>
                              <div className="mt-3 font-display text-2xl leading-snug text-charcoal">
                                Dr. {doctor.name.split(" ")[1]} is 40 minutes
                                behind.
                              </div>
                              <div className="text-sm text-charcoal-soft mt-2">
                                Your new arrival time:{" "}
                                <span className="font-mono text-charcoal">
                                  {slot ? shift(slot, 40) : "11:00"}
                                </span>
                                . We'll ping you when it's time.
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-saffron font-semibold">
                                <MapPin className="w-3.5 h-3.5" />
                                On arrival
                              </div>
                              <div className="mt-3 font-display text-2xl leading-snug text-charcoal">
                                Tap "I have arrived" — head to Cabin 3.
                              </div>
                              <div className="text-sm text-charcoal-soft mt-2">
                                Phone will vibrate when you're called. Meanwhile,
                                sit anywhere. No shouting.
                              </div>
                              <button
                                data-testid="demo-i-arrived"
                                className="mt-5 w-full px-5 py-3 rounded-full bg-saffron text-white hover:bg-saffron-hover transition"
                              >
                                I have arrived
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function shift(t, minutes) {
  const [h, m] = t.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}
