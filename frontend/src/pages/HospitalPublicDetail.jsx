import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MapPin, Phone, Clock, Star, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import SlotBookingModal from "@/components/nirog/SlotBookingModal";
import { fetchApi } from "@/lib/api";

export default function HospitalPublicDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [hospital, setHospital] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [bookingDoctor, setBookingDoctor] = useState(null);

  useEffect(() => {
    fetchApi(`/api/public/hospitals/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        setHospital(data.hospital);
        setDoctors(data.doctors);
        setReviews(data.reviews || []);
        setSpecialties(["All", ...(data.specialties || [])]);
        document.title = `${data.hospital.name} | NirogPath`;
      })
      .catch((err) =>
        setError(err === 404 ? "Hospital not found" : "Something went wrong")
      )
      .finally(() => setLoading(false));
  }, [id]);

  const filteredDoctors =
    selectedSpecialty === "All"
      ? doctors
      : doctors.filter((d) => d.specialty === selectedSpecialty);

  if (loading) {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-saffron border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !hospital) {
    return (
      <div className="min-h-screen bg-bone flex flex-col items-center justify-center gap-4">
        <p className="font-display text-2xl text-charcoal italic">
          {error || "Hospital not found"}
        </p>
        <Link
          to="/"
          className="px-6 py-2.5 rounded-full bg-saffron text-white font-body text-sm hover:bg-saffron-hover transition-colors"
        >
          Go home
        </Link>
      </div>
    );
  }

  // Build carousel images: main image + gallery
  const allImages = [
    hospital.image,
    ...(hospital.gallery?.filter((g) => g !== hospital.image) || []),
  ].filter(Boolean);

  const prevSlide = () => setCarouselIdx((i) => Math.max(0, i - 1));
  const nextSlide = () => setCarouselIdx((i) => Math.min(allImages.length - 1, i + 1));

  return (
    <div data-testid="public-hospital-page" className="min-h-screen bg-bone">
      {/* Nav */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-subtle">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-display text-xl text-charcoal flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-charcoal text-bone grid place-items-center text-lg pt-[2px]">
              न
            </span>
            NirogPath
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/search" className="font-body text-sm text-charcoal-soft hover:text-charcoal transition-colors hidden sm:block">
              Find doctors
            </Link>
            {user ? (
              <Link
                to="/app/patient"
                className="px-5 py-2 rounded-full bg-saffron text-white font-body text-sm hover:bg-saffron-hover transition-colors"
              >
                My bookings
              </Link>
            ) : (
              <Link
                to="/login"
                className="px-5 py-2 rounded-full bg-saffron text-white font-body text-sm hover:bg-saffron-hover transition-colors"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Image Carousel */}
      <div data-testid="hospital-hero" className="relative h-72 md:h-[28rem] overflow-hidden bg-charcoal">
        {/* Track */}
        <div
          className="flex h-full transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${carouselIdx * 100}%)` }}
        >
          {allImages.map((img, i) => (
            <div key={i} className="flex-none w-full h-full">
              <img
                src={img}
                alt={`${hospital.name} photo ${i + 1}`}
                className="w-full h-full object-cover"
                loading={i === 0 ? "eager" : "lazy"}
              />
            </div>
          ))}
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

        {/* Navigation arrows */}
        {allImages.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              disabled={carouselIdx === 0}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/40 transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextSlide}
              disabled={carouselIdx === allImages.length - 1}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/40 transition-colors disabled:opacity-30"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Dot indicators */}
        {allImages.length > 1 && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-1.5">
            {allImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setCarouselIdx(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === carouselIdx ? "w-6 bg-white" : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        )}

        {/* Hospital name overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-wrap gap-2 mb-3">
              {hospital.tags?.map((t) => (
                <span
                  key={t}
                  className="px-3 py-1 rounded-full bg-white/20 backdrop-blur text-white text-xs font-body"
                >
                  {t}
                </span>
              ))}
            </div>
            <h1 className="font-display text-4xl md:text-5xl text-white">{hospital.name}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-white/80 text-sm font-body">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" strokeWidth={1.5} />
                {hospital.area}, {hospital.city}
              </span>
              <span className="flex items-center gap-1.5">
                <Star className="w-4 h-4 text-saffron fill-saffron" strokeWidth={1.5} />
                {hospital.rating} · {hospital.reviews} reviews
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* Main column */}
        <div className="md:col-span-2 space-y-10">
          {/* Specialty filter tabs */}
          <section data-testid="hospital-departments">
            <h2 className="font-display text-2xl text-charcoal mb-4">Departments</h2>
            <div className="flex flex-wrap gap-2">
              {specialties.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSpecialty(s)}
                  className={`px-4 py-2 rounded-full text-sm font-body transition-colors border ${
                    selectedSpecialty === s
                      ? "bg-saffron text-white border-saffron"
                      : "bg-white text-charcoal border-subtle hover:border-saffron/40"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </section>

          {/* Doctors grid */}
          <section data-testid="hospital-doctor-grid">
            <h2 className="font-display text-2xl text-charcoal mb-4">
              {selectedSpecialty === "All" ? "All Doctors" : `${selectedSpecialty} Doctors`}
              <span className="ml-2 text-base text-charcoal-soft">({filteredDoctors.length})</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredDoctors.map((doctor) => (
                <DoctorCard
                  key={doctor.id}
                  doctor={doctor}
                  onBook={() => setBookingDoctor(doctor)}
                />
              ))}
            </div>
          </section>

          {/* Gallery thumbnails */}
          {hospital.gallery?.length > 0 && (
            <section data-testid="hospital-gallery">
              <h2 className="font-display text-2xl text-charcoal mb-4">Gallery</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                {(hospital.gallery || []).map((url, i) => (
                  <button
                    key={i}
                    data-testid={`hospital-gallery-item-${i}`}
                    onClick={() => setCarouselIdx(allImages.indexOf(url) >= 0 ? allImages.indexOf(url) : 0)}
                    className="aspect-square rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-saffron"
                  >
                    <img
                      src={url}
                      alt={`Gallery ${i + 1}`}
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
              <p className="font-body text-xs text-charcoal-soft mt-2">
                Click a photo to view in the gallery above
              </p>
            </section>
          )}

          {/* Reviews */}
          {reviews.length > 0 && (
            <section>
              <h2 className="font-display text-2xl text-charcoal mb-4">Patient Reviews</h2>
              <div className="space-y-4">
                {reviews.map((r) => (
                  <div key={r.id} className="p-5 bg-white rounded-2xl border border-subtle">
                    <div className="flex items-center gap-2 mb-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${s <= r.rating ? "text-saffron fill-saffron" : "text-subtle"}`}
                          strokeWidth={1.5}
                        />
                      ))}
                      <span className="font-mono text-xs text-charcoal-soft ml-auto">
                        {new Date(r.created_at).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                    {r.body && <p className="font-body text-sm text-charcoal">{r.body}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right: Contact card */}
        <div>
          <div
            data-testid="hospital-contact-card"
            className="bg-white rounded-2xl border border-subtle p-6 sticky top-24"
          >
            <h3 className="font-display text-lg text-charcoal mb-4">Contact & Hours</h3>

            {hospital.phone && (
              <div className="flex items-center gap-3 mb-3">
                <Phone className="w-4 h-4 text-saffron flex-shrink-0" strokeWidth={1.5} />
                <span className="font-body text-sm text-charcoal">{hospital.phone}</span>
              </div>
            )}

            {hospital.address && (
              <div className="flex items-start gap-3 mb-4">
                <MapPin className="w-4 h-4 text-saffron mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                <span className="font-body text-sm text-charcoal">{hospital.address}</span>
              </div>
            )}

            {hospital.opening_hours && (
              <div className="mt-4 border-t border-subtle pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-saffron" strokeWidth={1.5} />
                  <span className="font-body text-sm font-medium text-charcoal">Opening hours</span>
                </div>
                <div className="space-y-1">
                  {Object.entries(hospital.opening_hours).map(([day, hours]) => (
                    <div key={day} className="flex justify-between">
                      <span className="font-body text-xs text-charcoal-soft capitalize">{day}</span>
                      <span className="font-mono text-xs text-charcoal">{hours}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(hospital.address || hospital.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-full border border-subtle text-charcoal text-sm font-body hover:border-saffron transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Get directions
            </a>

            <button
              data-testid="hospital-book-cta"
              onClick={() => filteredDoctors[0] && setBookingDoctor(filteredDoctors[0])}
              className="mt-3 w-full py-3 rounded-full bg-saffron text-white text-center font-body text-sm hover:bg-saffron-hover transition-colors"
            >
              Book appointment
            </button>

            {user?.role === "reception" && (
              <button
                data-testid="hospital-edit-btn"
                className="mt-3 w-full py-2 rounded-full border border-subtle text-sm text-charcoal-soft hover:border-saffron hover:text-saffron transition-colors"
              >
                Edit hospital info
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Slot booking modal */}
      {bookingDoctor && (
        <SlotBookingModal
          doctor={bookingDoctor}
          onClose={() => setBookingDoctor(null)}
          onBooked={() => {}}
        />
      )}
    </div>
  );
}

function DoctorCard({ doctor, onBook }) {
  return (
    <div className="p-5 bg-white rounded-2xl border border-subtle hover:shadow-hoverGlow transition-shadow flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <img
          src={
            doctor.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.name || "D")}&background=E26D5C&color=fff&size=56`
          }
          alt={doctor.name}
          className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg text-charcoal leading-tight">{doctor.name}</h3>
          <p className="font-body text-xs text-charcoal-soft">{doctor.specialty}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="font-mono text-sm text-charcoal">₹{doctor.fee}</span>
            {doctor.rating && (
              <span className="flex items-center gap-1 text-xs text-charcoal-soft">
                <Star className="w-3.5 h-3.5 text-saffron fill-saffron" />
                {Number(doctor.rating).toFixed(1)}
              </span>
            )}
            {doctor.experience && (
              <span className="text-xs text-charcoal-soft">{doctor.experience} yrs</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-auto">
        <Link
          to={`/doctors/${doctor.id}`}
          className="flex-1 py-2 rounded-full border border-subtle text-charcoal text-sm font-body text-center hover:border-saffron transition-colors"
        >
          Profile
        </Link>
        <button
          onClick={onBook}
          className="flex-1 py-2 rounded-full bg-saffron text-white text-sm font-body text-center hover:bg-saffron-hover transition-colors"
        >
          Book Now
        </button>
      </div>
    </div>
  );
}
