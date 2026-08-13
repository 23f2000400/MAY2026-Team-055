// Part of the /find-doctors/:city and /find-doctors/:city/:specialty routes
import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Star, Loader2 } from "lucide-react";
import Nav from "@/components/nirog/Nav";
import api, { formatApiError } from "@/lib/api";

const SPECIALTIES = [
  "General Physician",
  "Dermatologist",
  "ENT Specialist",
  "Cardiologist",
  "Endocrinologist",
  "Pediatrician",
  "Orthopedic",
];

export default function CityLandingPage() {
  const { city, specialty } = useParams();

  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // City request form state
  const [crEmail, setCrEmail] = useState("");
  const [crCity, setCrCity] = useState(city || "");
  const [crMsg, setCrMsg] = useState("");
  const [crLoading, setCrLoading] = useState(false);

  // Update document title for SEO
  useEffect(() => {
    if (city) {
      document.title = `Book a doctor in ${city} | NirogPath`;
    }
    return () => {
      document.title = "NirogPath";
    };
  }, [city]);

  const fetchDoctors = useCallback(async () => {
    if (!city) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("city", city);
      if (specialty) params.append("specialty", specialty);
      params.set("sort", "rating");

      const { data } = await api.get(`/search/doctors?${params.toString()}`);
      setResults(data.results || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [city, specialty]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const handleCityRequest = async (e) => {
    e.preventDefault();
    if (!crEmail || !crCity) return;
    setCrLoading(true);
    setCrMsg("");
    try {
      await api.post("/city-requests", { email: crEmail, city: crCity });
      setCrMsg("Thank you! We'll notify you when we expand there.");
      setCrEmail("");
    } catch (err) {
      setCrMsg(formatApiError(err));
    } finally {
      setCrLoading(false);
    }
  };

  const showEmpty = !loading && results.length === 0;

  return (
    <div className="min-h-screen bg-bone">
      <Nav />

      {/* Hero section */}
      <div className="pt-28 pb-12 px-6 md:px-12 max-w-7xl mx-auto">
        <h1 className="font-display text-5xl text-charcoal">
          Book a doctor in {city}
        </h1>
        {specialty && (
          <p className="mt-2 font-body text-charcoal-soft text-lg">
            Showing{" "}
            <span className="text-saffron font-semibold">{specialty}</span>{" "}
            specialists
          </p>
        )}
        <p className="mt-3 font-body text-charcoal-soft">
          {loading
            ? "Finding available doctors..."
            : `${total} doctor${total !== 1 ? "s" : ""} available`}
        </p>

        {/* Specialty chips (only visible when showing all specialties for a city) */}
        {!specialty && (
          <div className="mt-6 flex flex-wrap gap-2">
            {SPECIALTIES.map((s) => (
              <Link
                key={s}
                to={`/find-doctors/${encodeURIComponent(city)}/${encodeURIComponent(s)}`}
                className="px-4 py-2 rounded-full bg-white border border-subtle text-charcoal text-sm font-body hover:border-saffron hover:text-saffron transition-colors"
              >
                {s}
              </Link>
            ))}
          </div>
        )}

        {/* Back link when viewing a specific specialty */}
        {specialty && (
          <div className="mt-4">
            <Link
              to={`/find-doctors/${encodeURIComponent(city)}`}
              className="font-body text-sm text-saffron hover:underline"
            >
              ← All specialties in {city}
            </Link>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="pb-20 px-6 md:px-12 max-w-7xl mx-auto">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-saffron" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="py-12 text-center">
            <p className="font-body text-charcoal-soft">{error}</p>
            <button
              onClick={fetchDoctors}
              className="mt-4 px-5 py-2 rounded-full bg-saffron text-white text-sm font-body"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty state */}
        {showEmpty && !error && (
          <div className="py-24 text-center" data-testid="search-empty-state">
            <p className="font-display text-2xl text-charcoal italic">
              "No matches, but we're listening."
            </p>
            <p className="font-body text-charcoal-soft mt-3">
              We don't have doctors in {city} yet.
            </p>

            <form
              onSubmit={handleCityRequest}
              data-testid="city-request-form"
              className="mt-8 max-w-sm mx-auto"
            >
              <p className="font-body text-sm text-charcoal-soft mb-4">
                Let us know where you need us:
              </p>
              <input
                type="email"
                data-testid="city-request-email"
                value={crEmail}
                onChange={(e) => setCrEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-subtle mb-2 font-body text-sm focus:outline-none focus:border-saffron transition-colors"
              />
              <input
                type="text"
                data-testid="city-request-city"
                value={crCity}
                onChange={(e) => setCrCity(e.target.value)}
                placeholder="City name"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-subtle mb-4 font-body text-sm focus:outline-none focus:border-saffron transition-colors"
              />
              <button
                type="submit"
                data-testid="city-request-submit"
                disabled={crLoading}
                className="w-full py-2.5 rounded-full bg-saffron text-white font-body text-sm hover:bg-saffron-hover transition-colors disabled:opacity-60"
              >
                {crLoading ? "Sending..." : "Request my city"}
              </button>
              {crMsg && (
                <p className="mt-3 font-body text-sm text-charcoal-soft">{crMsg}</p>
              )}
            </form>
          </div>
        )}

        {/* Results grid */}
        {!loading && results.length > 0 && (
          <div
            data-testid="search-results-list"
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {results.map((doctor) => (
              <CityDoctorCard key={doctor.id} doctor={doctor} />
            ))}
          </div>
        )}

        {/* CTA to see all specialties */}
        {!loading && results.length > 0 && specialty && (
          <div className="mt-10 text-center">
            <p className="font-body text-charcoal-soft mb-4">
              Need a different specialist?
            </p>
            <Link
              to={`/find-doctors/${encodeURIComponent(city)}`}
              className="px-6 py-3 rounded-full border border-subtle text-charcoal font-body text-sm hover:border-saffron transition-colors"
            >
              Browse all specialties in {city}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function CityDoctorCard({ doctor }) {
  return (
    <div
      data-testid={`search-result-${doctor.id}`}
      className="p-6 bg-white rounded-2xl border border-subtle hover:shadow-hoverGlow transition-shadow"
    >
      <div className="flex gap-4">
        <img
          src={
            doctor.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              doctor.name || "D"
            )}&background=E26D5C&color=fff&size=64`
          }
          className="w-16 h-16 rounded-full object-cover flex-shrink-0"
          alt={doctor.name}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-display text-xl text-charcoal">{doctor.name}</h3>
              <p className="font-body text-sm text-charcoal-soft">
                {doctor.specialty}
              </p>
              <p className="font-body text-xs text-charcoal-soft mt-0.5 truncate">
                {doctor.hospital}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              {doctor.fee != null && (
                <div className="font-mono text-lg text-charcoal font-medium">
                  ₹{doctor.fee}
                </div>
              )}
              {doctor.rating != null && (
                <div className="flex items-center gap-1 justify-end mt-0.5">
                  <Star className="w-3.5 h-3.5 text-saffron fill-saffron" />
                  <span className="font-mono text-sm text-charcoal-soft">
                    {Number(doctor.rating).toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Link
              to={`/doctors/${doctor.id}`}
              className="px-4 py-2 rounded-full border border-subtle text-charcoal text-sm font-body hover:border-saffron transition-colors"
            >
              View profile
            </Link>
            <Link
              to={`/app/patient?doctor_id=${doctor.id}`}
              className="px-4 py-2 rounded-full bg-saffron text-white text-sm font-body hover:bg-saffron-hover transition-colors"
            >
              Book now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
