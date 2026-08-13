import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Search, MapPin, Star, Loader2, X, ChevronRight } from "lucide-react";
import Nav from "@/components/nirog/Nav";
import SlotBookingModal from "@/components/nirog/SlotBookingModal";
import api, { formatApiError, fetchApi } from "@/lib/api";

const SPECIALTY_CHIPS = [
  { label: "General Physician", emoji: "🩺", disease: "fever" },
  { label: "Cardiologist", emoji: "❤️", disease: "heart" },
  { label: "Dermatologist", emoji: "✨", disease: "skin" },
  { label: "ENT Specialist", emoji: "👂", disease: "ear" },
  { label: "Endocrinologist", emoji: "💉", disease: "diabetes" },
  { label: "Pediatrician", emoji: "👶", disease: "child" },
  { label: "Orthopedic", emoji: "🦴", disease: "bone" },
];

const DISEASE_SPECIALTY_MAP = {
  fever: "General Physician", cold: "General Physician", cough: "General Physician",
  flu: "General Physician", headache: "General Physician", fatigue: "General Physician",
  diabetes: "Endocrinologist", thyroid: "Endocrinologist", sugar: "Endocrinologist",
  heart: "Cardiologist", "chest pain": "Cardiologist", bp: "Cardiologist",
  cardiac: "Cardiologist", palpitation: "Cardiologist",
  skin: "Dermatologist", acne: "Dermatologist", rash: "Dermatologist",
  eczema: "Dermatologist", psoriasis: "Dermatologist",
  ear: "ENT Specialist", nose: "ENT Specialist", throat: "ENT Specialist",
  tonsil: "ENT Specialist", sinus: "ENT Specialist",
  child: "Pediatrician", baby: "Pediatrician", infant: "Pediatrician",
  kids: "Pediatrician", vaccination: "Pediatrician",
  bone: "Orthopedic", joint: "Orthopedic", knee: "Orthopedic",
  "back pain": "Orthopedic", fracture: "Orthopedic", spine: "Orthopedic",
};

function detectSpecialtyFromQuery(q) {
  const lower = q.toLowerCase();
  for (const [disease, spec] of Object.entries(DISEASE_SPECIALTY_MAP)) {
    if (lower.includes(disease)) return spec;
  }
  return null;
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [q, setQ] = useState(searchParams.get("q") || "");
  const [inputValue, setInputValue] = useState(searchParams.get("q") || "");
  const [city, setCity] = useState(searchParams.get("city") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "rating");

  const [hospitals, setHospitals] = useState([]);
  const [doctorResults, setDoctorResults] = useState([]);
  const [totalDoctors, setTotalDoctors] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hospitalsLoading, setHospitalsLoading] = useState(true);
  const [error, setError] = useState("");
  const [nearbyMode, setNearbyMode] = useState(false);
  const [geoCity, setGeoCity] = useState("");
  const [bookingDoctor, setBookingDoctor] = useState(null);

  // Load hospitals on mount (always shown)
  useEffect(() => {
    fetchApi("/api/public/hospitals")
      .then((r) => r.json())
      .then((data) => setHospitals(data.hospitals || []))
      .catch(() => {})
      .finally(() => setHospitalsLoading(false));
  }, []);

  const fetchDoctors = useCallback(async (query, cityFilter, sortBy) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (cityFilter) params.set("city", cityFilter);
      params.set("sort", sortBy || "rating");

      const { data } = await api.get(`/search/doctors?${params.toString()}`);
      setDoctorResults(data.results || []);
      setTotalDoctors(data.total || 0);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch doctors when q or city changes (only when there's a query)
  useEffect(() => {
    if (q || city) {
      fetchDoctors(q, city, sort);
    } else {
      setDoctorResults([]);
      setTotalDoctors(0);
    }
  }, [q, city, sort, fetchDoctors]);

  // Sync URL
  useEffect(() => {
    const params = {};
    if (q) params.q = q;
    if (city) params.city = city;
    if (sort !== "rating") params.sort = sort;
    setSearchParams(params, { replace: true });
  }, [q, city, sort, setSearchParams]);

  const handleSearch = (e) => {
    e.preventDefault();
    setQ(inputValue.trim());
  };

  const handleNearMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      () => {
        // We don't have actual geocoding, so just show all hospitals with "Near you" label
        setNearbyMode(true);
        setGeoCity("your location");
        setQ("");
        setCity("");
        setInputValue("");
      },
      () => {
        setNearbyMode(true);
        setGeoCity("your location");
      }
    );
  };

  const handleSpecialtyChip = (chip) => {
    setInputValue(chip.label);
    setQ(chip.label);
    setNearbyMode(false);
  };

  const clearSearch = () => {
    setQ("");
    setInputValue("");
    setCity("");
    setNearbyMode(false);
    setDoctorResults([]);
  };

  const filteredHospitals = hospitals.filter((h) => {
    if (!q && !city) return true;
    const lower = (q || "").toLowerCase();
    const cityLower = (city || h.city || "").toLowerCase();
    const nameMatch = !lower || h.name?.toLowerCase().includes(lower) || h.city?.toLowerCase().includes(lower) || h.area?.toLowerCase().includes(lower);
    const cityMatch = !city || h.city?.toLowerCase().includes(cityLower);
    return nameMatch && cityMatch;
  });

  const showDoctors = q || city;
  const detectedSpecialty = q ? detectSpecialtyFromQuery(q) : null;

  return (
    <div className="min-h-screen bg-bone">
      <Nav />

      {/* Hero search */}
      <div className="pt-16 bg-gradient-to-b from-charcoal via-charcoal/95 to-charcoal/80">
        <div className="max-w-4xl mx-auto px-6 py-12 pb-8">
          <h1 className="font-display text-4xl md:text-5xl text-white mb-2 text-center">
            Find Doctors & Clinics
          </h1>
          <p className="font-body text-white/70 text-center mb-8">
            Search by name, disease, specialty, city or area
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="relative">
            <div className="flex items-center bg-white rounded-2xl overflow-hidden shadow-xl">
              <div className="flex items-center pl-5 text-charcoal-soft flex-shrink-0">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Doctor name, disease (fever, diabetes...), hospital, area..."
                className="flex-1 px-4 py-4 font-body text-charcoal text-base focus:outline-none bg-transparent placeholder:text-charcoal-soft/60"
                autoFocus
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="px-3 text-charcoal-soft hover:text-charcoal"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                className="mx-2 px-6 py-2.5 rounded-xl bg-saffron text-white font-body text-sm hover:bg-saffron-hover transition-colors flex-shrink-0"
              >
                Search
              </button>
            </div>
          </form>

          {/* Near Me + city tabs row */}
          <div className="flex items-center gap-3 mt-4 flex-wrap justify-center">
            <button
              onClick={handleNearMe}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-body text-sm transition-colors ${
                nearbyMode
                  ? "bg-teal text-white"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              <MapPin className="w-4 h-4" />
              {nearbyMode ? `Near ${geoCity}` : "Near Me"}
            </button>
            {["Bengaluru", "Pune", "Chennai"].map((c) => (
              <button
                key={c}
                onClick={() => { setCity(city === c ? "" : c); setNearbyMode(false); }}
                className={`px-4 py-2 rounded-full font-body text-sm transition-colors ${
                  city === c
                    ? "bg-saffron text-white"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {c}
              </button>
            ))}
            {(q || city || nearbyMode) && (
              <button
                onClick={clearSearch}
                className="px-4 py-2 rounded-full font-body text-sm text-white/70 hover:text-white border border-white/20 hover:border-white/40 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Specialty chips */}
        <div className="pb-6 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {SPECIALTY_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => handleSpecialtyChip(chip)}
                  className={`flex-none flex items-center gap-2 px-4 py-2.5 rounded-xl font-body text-sm transition-colors whitespace-nowrap ${
                    q === chip.label
                      ? "bg-saffron text-white"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  <span>{chip.emoji}</span>
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Disease detection hint */}
        {detectedSpecialty && (
          <div className="mb-6 flex items-center gap-3 bg-teal/10 border border-teal/20 rounded-xl px-5 py-3">
            <span className="text-teal text-sm font-body">
              Showing <strong>{detectedSpecialty}</strong> specialists for "{q}"
            </span>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-saffron" />
          </div>
        )}

        {error && (
          <div className="py-8 text-center">
            <p className="font-body text-charcoal-soft">{error}</p>
            <button
              onClick={() => fetchDoctors(q, city, sort)}
              className="mt-4 px-5 py-2 rounded-full bg-saffron text-white text-sm font-body"
            >
              Try again
            </button>
          </div>
        )}

        {/* Doctor results (when searching) */}
        {!loading && showDoctors && doctorResults.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-2xl text-charcoal">
                Doctors
                <span className="ml-2 text-base font-body text-charcoal-soft">({totalDoctors})</span>
              </h2>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-subtle bg-white font-body text-sm text-charcoal focus:outline-none"
              >
                <option value="rating">Top rated</option>
                <option value="fee">Lowest fee</option>
                <option value="experience">Most experienced</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {doctorResults.map((doctor) => (
                <DoctorResultCard
                  key={doctor.id}
                  doctor={doctor}
                  onBook={() => setBookingDoctor(doctor)}
                />
              ))}
            </div>
          </section>
        )}

        {/* No doctor results when searching */}
        {!loading && showDoctors && doctorResults.length === 0 && !error && (
          <div className="mb-8 p-6 bg-white rounded-2xl border border-subtle text-center">
            <p className="font-display text-xl text-charcoal italic mb-2">No doctors found</p>
            <p className="font-body text-sm text-charcoal-soft">Try a different search term or specialty</p>
          </div>
        )}

        {/* Hospital cards */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-2xl text-charcoal">
              {nearbyMode ? "Hospitals Near You" : showDoctors ? "Also in these hospitals" : "Hospitals"}
              <span className="ml-2 text-base font-body text-charcoal-soft">({filteredHospitals.length})</span>
            </h2>
            {!showDoctors && (
              <span className="font-body text-xs text-charcoal-soft">3 cities · {hospitals.reduce((a, h) => a + (h.doctor_count || 0), 0)}+ doctors</span>
            )}
          </div>

          {hospitalsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-saffron" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredHospitals.map((h) => (
                <HospitalCard key={h.id} hospital={h} nearbyMode={nearbyMode} />
              ))}
            </div>
          )}

          {!hospitalsLoading && filteredHospitals.length === 0 && (
            <CityRequestPanel />
          )}
        </section>
      </div>

      {bookingDoctor && (
        <SlotBookingModal
          doctor={bookingDoctor}
          onClose={() => setBookingDoctor(null)}
          onBooked={() => setBookingDoctor(null)}
        />
      )}
    </div>
  );
}

function HospitalCard({ hospital, nearbyMode }) {
  return (
    <Link
      to={`/hospitals/${hospital.id}`}
      className="group bg-white rounded-2xl border border-subtle overflow-hidden hover:shadow-hoverGlow transition-all duration-200"
    >
      <div className="relative h-40 overflow-hidden">
        <img
          src={hospital.image}
          alt={hospital.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {nearbyMode && (
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-teal text-white text-xs px-2 py-1 rounded-full font-body">
            <MapPin className="w-3 h-3" /> Near you
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
          <div className="flex gap-1.5 flex-wrap">
            {hospital.tags?.slice(0, 2).map((tag) => (
              <span key={tag} className="px-2 py-0.5 text-xs text-white bg-white/20 backdrop-blur rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-display text-lg text-charcoal leading-tight">{hospital.name}</h3>
        <p className="font-body text-sm text-charcoal-soft flex items-center gap-1 mt-0.5">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.5} />
          {hospital.area}, {hospital.city}
        </p>

        <div className="flex items-center gap-3 mt-2">
          <span className="flex items-center gap-1 text-sm">
            <Star className="w-3.5 h-3.5 text-saffron fill-saffron" />
            <span className="font-mono text-charcoal">{hospital.rating}</span>
          </span>
          <span className="text-charcoal-soft text-xs">{hospital.reviews} reviews</span>
          <span className="ml-auto font-body text-xs text-teal font-medium">
            {hospital.doctor_count} doctors
          </span>
        </div>

        <div className="flex flex-wrap gap-1 mt-3">
          {hospital.specialties?.slice(0, 3).map((s) => (
            <span key={s} className="px-2 py-0.5 text-xs bg-bone text-charcoal-soft rounded-full">
              {s}
            </span>
          ))}
        </div>

        <div className="mt-3 flex items-center text-saffron text-sm font-body gap-1">
          View hospital <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
  );
}

function DoctorResultCard({ doctor, onBook }) {
  return (
    <div className="p-5 bg-white rounded-2xl border border-subtle hover:shadow-hoverGlow transition-shadow">
      <div className="flex gap-4">
        <img
          src={
            doctor.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.name || "D")}&background=E26D5C&color=fff&size=56`
          }
          className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
          alt={doctor.name}
          loading="lazy"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-display text-lg text-charcoal leading-tight">{doctor.name}</h3>
              <p className="font-body text-sm text-charcoal-soft">{doctor.specialty}</p>
              <p className="font-body text-xs text-charcoal-soft mt-0.5 truncate">{doctor.hospital}</p>
            </div>
            <div className="text-right flex-shrink-0">
              {doctor.fee != null && (
                <div className="font-mono text-base text-charcoal font-medium">₹{doctor.fee}</div>
              )}
              {doctor.rating != null && (
                <div className="flex items-center gap-1 justify-end mt-0.5">
                  <Star className="w-3.5 h-3.5 text-saffron fill-saffron" />
                  <span className="font-mono text-sm text-charcoal-soft">{Number(doctor.rating).toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
          {doctor.experience && (
            <p className="mt-1 font-body text-xs text-charcoal-soft">{doctor.experience} yrs experience</p>
          )}
          <div className="mt-3 flex gap-2">
            <Link
              to={`/hospitals/${(doctor.hospital || "").toLowerCase().replace(/,/g, "").replace(/\s+/g, "-")}`}
              className="px-4 py-2 rounded-full border border-subtle text-charcoal text-sm font-body hover:border-saffron transition-colors"
            >
              View profile
            </Link>
            <button
              onClick={onBook}
              className="px-4 py-2 rounded-full bg-saffron text-white text-sm font-body hover:bg-saffron-hover transition-colors"
            >
              Book Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CityRequestPanel() {
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !city) return;
    setLoading(true);
    try {
      await api.post("/city-requests", { email, city });
      setMsg("Thank you! We'll notify you when we expand there.");
      setEmail("");
      setCity("");
    } catch {
      setMsg("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-16 text-center">
      <p className="font-display text-2xl text-charcoal italic mb-2">
        No hospitals found in this area yet
      </p>
      <p className="font-body text-charcoal-soft mb-8">
        We're expanding fast. Let us know where you need us.
      </p>
      <form onSubmit={handleSubmit} className="max-w-sm mx-auto space-y-3" data-testid="city-request-form">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          data-testid="city-request-email"
          className="w-full px-4 py-2.5 rounded-xl border border-subtle font-body text-sm focus:outline-none focus:border-saffron transition-colors"
        />
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City name"
          required
          data-testid="city-request-city"
          className="w-full px-4 py-2.5 rounded-xl border border-subtle font-body text-sm focus:outline-none focus:border-saffron transition-colors"
        />
        <button
          type="submit"
          disabled={loading}
          data-testid="city-request-submit"
          className="w-full py-2.5 rounded-full bg-saffron text-white font-body text-sm hover:bg-saffron-hover transition-colors disabled:opacity-60"
        >
          {loading ? "Sending..." : "Request my city"}
        </button>
        {msg && <p className="font-body text-sm text-charcoal-soft">{msg}</p>}
      </form>
    </div>
  );
}
