// ROUTE TO ADD IN App.js:
// import DoctorPublicProfile from "@/pages/DoctorPublicProfile";
// <Route path="/doctors/:id" element={<DoctorPublicProfile />} />

import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { fetchApi } from "@/lib/api";
import { Star, Clock, Award, MapPin, ChevronRight, Edit2 } from "lucide-react";

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default function DoctorPublicProfile() {
  const { id } = useParams();
  const { user } = useAuth();

  const [doctor, setDoctor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [related, setRelated] = useState([]);
  const [hospitalMeta, setHospitalMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  // SEO: set document title once doctor is loaded
  useEffect(() => {
    if (doctor) {
      document.title = `${doctor.name} – ${doctor.specialty} | NirogPath`;
    }
    return () => {
      document.title = "NirogPath";
    };
  }, [doctor]);

  // Fetch doctor profile on mount / id change
  useEffect(() => {
    setLoading(true);
    setError(null);

    fetchApi(`/api/public/doctors/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        setDoctor(data.doctor);
        setReviews(data.reviews || []);
        setRelated(data.related_doctors || []);
        setHospitalMeta(data.hospital_meta || {});
      })
      .catch((err) => {
        if (err === 404) {
          setError("Doctor not found");
        } else {
          setError("Something went wrong");
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div data-testid="public-doctor-profile" className="min-h-screen bg-bone">
        <nav className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-subtle">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link
              to="/"
              className="font-display text-xl text-charcoal flex items-center gap-2"
            >
              <span className="w-8 h-8 rounded-full bg-charcoal text-bone grid place-items-center text-lg pt-[2px]">
                न
              </span>
              NirogPath
            </Link>
          </div>
        </nav>
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="animate-pulse space-y-6">
            <div className="h-28 w-28 rounded-2xl bg-subtle" />
            <div className="h-10 w-72 rounded-xl bg-subtle" />
            <div className="h-5 w-48 rounded bg-subtle" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error || !doctor) {
    return (
      <div data-testid="public-doctor-profile" className="min-h-screen bg-bone">
        <nav className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-subtle">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link
              to="/"
              className="font-display text-xl text-charcoal flex items-center gap-2"
            >
              <span className="w-8 h-8 rounded-full bg-charcoal text-bone grid place-items-center text-lg pt-[2px]">
                न
              </span>
              NirogPath
            </Link>
          </div>
        </nav>
        <div className="max-w-6xl mx-auto px-6 py-24 text-center">
          <h1 className="font-display text-4xl text-charcoal mb-4">
            {error || "Doctor not found"}
          </h1>
          <Link
            to="/"
            className="inline-block mt-4 px-6 py-2.5 rounded-full bg-saffron text-white font-body text-sm hover:bg-saffron-hover transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const hospitalName = doctor.hospital || hospitalMeta.city || "";

  return (
    <div data-testid="public-doctor-profile" className="min-h-screen bg-bone">
      {/* ── Glassmorphic nav ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-subtle">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="font-display text-xl text-charcoal flex items-center gap-2"
          >
            <span className="w-8 h-8 rounded-full bg-charcoal text-bone grid place-items-center text-lg pt-[2px]">
              न
            </span>
            NirogPath
          </Link>
          <Link
            to={`/app/patient?doctor_id=${id}`}
            className="px-6 py-2.5 rounded-full bg-saffron text-white font-body text-sm hover:bg-saffron-hover transition-colors"
          >
            Book appointment
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div data-testid="doctor-hero" className="bg-white border-b border-subtle">
        <div className="max-w-6xl mx-auto px-6 py-16 flex flex-col md:flex-row gap-10 items-start">
          {/* Left: doctor info */}
          <div className="flex-1">
            <div className="flex items-start gap-6">
              {doctor.avatar ? (
                <img
                  src={doctor.avatar}
                  alt={doctor.name}
                  className="w-28 h-28 rounded-2xl object-cover border border-subtle shadow-soft"
                />
              ) : (
                <div className="w-28 h-28 rounded-2xl bg-saffron/10 border border-subtle flex items-center justify-center">
                  <span className="font-display text-4xl text-saffron">
                    {doctor.name?.[0] || "D"}
                  </span>
                </div>
              )}
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-saffron font-semibold">
                  {doctor.specialty}
                </div>
                <h1 className="mt-2 font-display text-4xl md:text-5xl text-charcoal">
                  {doctor.name}
                </h1>
                <div className="mt-3 flex flex-wrap gap-4 text-sm font-body text-charcoal-soft">
                  {hospitalName && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" strokeWidth={1.5} />
                      {hospitalName}
                    </span>
                  )}
                  {doctor.experience_years != null && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" strokeWidth={1.5} />
                      {doctor.experience_years} yrs experience
                    </span>
                  )}
                  {doctor.rating != null && (
                    <span className="flex items-center gap-1.5">
                      <Star
                        className="w-4 h-4 text-saffron fill-saffron"
                        strokeWidth={1.5}
                      />
                      {doctor.rating} &middot; {doctor.reviews_count || 0} reviews
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right: sticky booking card */}
          <div className="w-full md:w-72 bg-white rounded-2xl border border-subtle p-6 shadow-medium sticky top-24">
            <div className="text-xs uppercase tracking-[0.3em] text-saffron font-semibold">
              Consultation Fee
            </div>
            <div className="font-mono text-4xl text-charcoal mt-2">
              ₹{doctor.fee ?? "—"}
            </div>
            <div className="text-xs text-charcoal-soft mt-1 font-body">
              20% deposit at booking
            </div>
            <Link
              to={`/app/patient?doctor_id=${id}`}
              data-testid="doctor-book-cta"
              className="mt-6 block w-full py-3 rounded-full bg-saffron text-white text-center font-body hover:bg-saffron-hover transition-colors"
            >
              Book with {doctor.name?.split(" ")[0] || "Doctor"}
            </Link>
            {user?.role === "doctor" && user?.id === id && (
              <Link
                to="/app/doctor/settings"
                data-testid="doctor-edit-profile-btn"
                className="mt-3 flex items-center justify-center gap-1.5 text-sm text-charcoal-soft hover:text-saffron transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit profile
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
        <div className="md:col-span-2 space-y-10">
          {/* Bio */}
          {doctor.bio && (
            <section data-testid="doctor-bio">
              <h2 className="font-display text-2xl text-charcoal mb-4">About</h2>
              <p className="font-body text-charcoal/80 leading-relaxed">{doctor.bio}</p>
            </section>
          )}

          {/* Credentials */}
          {doctor.credentials?.length > 0 && (
            <section data-testid="doctor-credentials">
              <h2 className="font-display text-2xl text-charcoal mb-4">Credentials</h2>
              <div className="flex flex-wrap gap-2">
                {(doctor.credentials || []).map((c) => (
                  <span
                    key={c}
                    className="px-4 py-2 bg-white rounded-full border border-subtle font-body text-sm text-charcoal"
                  >
                    <Award
                      className="w-3.5 h-3.5 inline mr-1.5 text-saffron"
                      strokeWidth={1.8}
                    />
                    {c}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Weekly availability */}
          <section data-testid="doctor-weekly-availability">
            <h2 className="font-display text-2xl text-charcoal mb-4">Availability</h2>
            <div className="grid grid-cols-7 gap-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => {
                const key = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"][i];
                const ranges = doctor.weekly_schedule?.[key] || [];
                return (
                  <div
                    key={day}
                    className={`p-3 rounded-xl text-center border ${
                      ranges.length
                        ? "border-saffron/30 bg-saffron/5"
                        : "border-subtle bg-white opacity-50"
                    }`}
                  >
                    <div className="font-body text-xs uppercase tracking-widest text-charcoal-soft mb-2">
                      {day}
                    </div>
                    {ranges.length ? (
                      ranges.map((r, j) => (
                        <div key={j} className="font-mono text-xs text-saffron">
                          {r.start}–{r.end}
                        </div>
                      ))
                    ) : (
                      <div className="font-body text-xs text-charcoal-soft">Closed</div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Reviews */}
          {reviews.length > 0 && (
            <section data-testid="doctor-reviews-carousel">
              <h2 className="font-display text-2xl text-charcoal mb-4">
                Patient reviews
              </h2>
              <div className="space-y-4">
                {reviews.map((r) => (
                  <div
                    key={r.id}
                    className="p-5 bg-white rounded-2xl border border-subtle"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${
                            s <= r.rating
                              ? "text-saffron fill-saffron"
                              : "text-subtle"
                          }`}
                          strokeWidth={1.5}
                        />
                      ))}
                      <span className="font-mono text-xs text-charcoal-soft ml-auto">
                        {formatDate(r.created_at)}
                      </span>
                    </div>
                    {r.body && (
                      <p className="font-body text-sm text-charcoal">{r.body}</p>
                    )}
                    {r.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {r.tags.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 bg-sage-soft text-sage text-xs rounded-full font-body"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    {r.doctor_reply && (
                      <div className="mt-3 pl-3 border-l-2 border-saffron">
                        <p className="text-xs text-saffron font-semibold mb-1">
                          Doctor's response
                        </p>
                        <p className="font-body text-sm text-charcoal-soft">
                          {r.doctor_reply}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Related doctors sidebar */}
        {related.length > 0 && (
          <div>
            <h2 className="font-display text-xl text-charcoal mb-4">
              Other doctors at this hospital
            </h2>
            <div data-testid="doctor-related-list" className="space-y-3">
              {related.map((d) => (
                <Link
                  key={d.id}
                  to={`/doctors/${d.id}`}
                  className="block p-4 bg-white rounded-xl border border-subtle hover:border-saffron/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {d.avatar ? (
                      <img
                        src={d.avatar}
                        alt={d.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-saffron/10 flex items-center justify-center">
                        <span className="font-display text-lg text-saffron">
                          {d.name?.[0] || "D"}
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="font-body text-sm text-charcoal font-medium">
                        {d.name}
                      </div>
                      <div className="font-body text-xs text-charcoal-soft">
                        {d.specialty}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-charcoal-soft ml-auto" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
