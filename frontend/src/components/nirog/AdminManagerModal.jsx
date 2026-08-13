import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, UserPlus, Building2, Check, AlertCircle, Loader2, Upload, Image as ImageIcon, Trash2 } from "lucide-react";
import api, { formatApiError } from "@/lib/api";

export default function AdminManagerModal({ isOpen, onClose, onRefresh }) {
  const [tab, setTab] = useState("doctor"); // "doctor" | "hospital"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Registered Hospitals list for dropdown
  const [registeredHospitals, setRegisteredHospitals] = useState([]);
  const [hospitalsLoading, setHospitalsLoading] = useState(false);

  // Doctor Form State
  const [docName, setDocName] = useState("");
  const [docEmail, setDocEmail] = useState("");
  const [docPassword, setDocPassword] = useState("nirog1234");
  const [docSpecialty, setDocSpecialty] = useState("General Physician");
  const [selectedHospital, setSelectedHospital] = useState("");
  const [customHospital, setCustomHospital] = useState("");
  const [docFee, setDocFee] = useState(600);
  const [docExp, setDocExp] = useState(10);
  const [docRating, setDocRating] = useState(4.8);
  const [docPhone, setDocPhone] = useState("+919876543210");
  const [docAvatar, setDocAvatar] = useState("");

  // Hospital Form State
  const [hospName, setHospName] = useState("");
  const [hospCity, setHospCity] = useState("Bengaluru");
  const [hospArea, setHospArea] = useState("Indiranagar");
  const [hospRating, setHospRating] = useState(4.8);
  const [hospReviews, setHospReviews] = useState(250);
  const [hospImage, setHospImage] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [hospTags, setHospTags] = useState("Multi-speciality, 24x7 Pharmacy");
  const [hospSpecialties, setHospSpecialties] = useState("Cardiology, Neurology, Pediatrics");
  const [hospMinFee, setHospMinFee] = useState(500);

  const fetchRegisteredHospitals = async () => {
    setHospitalsLoading(true);
    try {
      const { data } = await api.get("/hospitals");
      const list = data?.hospitals || [];
      setRegisteredHospitals(list);
      if (list.length > 0) {
        setSelectedHospital(list[0].full_name || list[0].name);
      } else {
        setSelectedHospital("other");
      }
    } catch (e) {
      console.error("Failed to fetch hospitals:", e);
    } finally {
      setHospitalsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRegisteredHospitals();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Photo File Upload
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Image file size should be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setHospImage(reader.result);
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const finalHospital = selectedHospital === "other" ? customHospital : selectedHospital;
      if (!finalHospital) {
        throw new Error("Please select or specify a hospital");
      }

      const payload = {
        name: docName,
        email: docEmail,
        password: docPassword,
        specialty: docSpecialty,
        hospital: finalHospital,
        fee: Number(docFee),
        experience_years: Number(docExp),
        rating: Number(docRating),
        phone: docPhone,
        avatar: docAvatar,
      };
      await api.post("/admin/doctors", payload);
      setSuccess(`Doctor ${docName} registered under ${finalHospital}!`);
      setDocName("");
      setDocEmail("");
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHospital = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const payload = {
        name: hospName,
        city: hospCity,
        area: hospArea,
        rating: Number(hospRating),
        reviews: Number(hospReviews),
        image: hospImage,
        tags: hospTags.split(",").map((s) => s.trim()).filter(Boolean),
        specialties: hospSpecialties.split(",").map((s) => s.trim()).filter(Boolean),
        min_fee: Number(hospMinFee),
      };
      await api.post("/admin/hospitals", payload);
      setSuccess(`Hospital ${hospName} registered with photo successfully!`);
      setHospName("");
      setHospImage("");
      setImagePreview("");
      fetchRegisteredHospitals(); // Refresh dropdown list
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl border border-subtle relative max-h-[90vh] overflow-y-auto"
        >
          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-9 h-9 rounded-full bg-bone grid place-items-center text-charcoal-soft hover:bg-subtle transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-xs uppercase tracking-widest text-saffron font-semibold">Superuser Administration</div>
          <h2 className="text-2xl font-display text-charcoal mt-1">Management Portal</h2>

          {/* Tabs */}
          <div className="flex gap-2 mt-6 p-1 rounded-full bg-bone border border-subtle">
            <button
              onClick={() => { setTab("doctor"); setError(""); setSuccess(""); }}
              className={`flex-1 py-2 px-4 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition ${
                tab === "doctor" ? "bg-charcoal text-bone" : "text-charcoal-soft hover:text-charcoal"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Add Doctor
            </button>
            <button
              onClick={() => { setTab("hospital"); setError(""); setSuccess(""); }}
              className={`flex-1 py-2 px-4 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition ${
                tab === "hospital" ? "bg-charcoal text-bone" : "text-charcoal-soft hover:text-charcoal"
              }`}
            >
              <Building2 className="w-4 h-4" />
              Add Hospital
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 p-3 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              {success}
            </div>
          )}

          {/* Doctor Form */}
          {tab === "doctor" && (
            <form onSubmit={handleCreateDoctor} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal-soft uppercase mb-1">Doctor Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Ananya Sen"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-subtle focus:border-saffron outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-soft uppercase mb-1">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="doctor@nirog.in"
                    value={docEmail}
                    onChange={(e) => setDocEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-subtle focus:border-saffron outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-soft uppercase mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={docPassword}
                    onChange={(e) => setDocPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-subtle focus:border-saffron outline-none text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-soft uppercase mb-1">Specialty</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cardiologist"
                    value={docSpecialty}
                    onChange={(e) => setDocSpecialty(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-subtle focus:border-saffron outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-soft uppercase mb-1">Select Hospital</label>
                  {hospitalsLoading ? (
                    <div className="w-full px-4 py-2.5 rounded-xl border border-subtle bg-bone text-sm text-charcoal-soft flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading hospitals…
                    </div>
                  ) : (
                    <select
                      value={selectedHospital}
                      onChange={(e) => setSelectedHospital(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-subtle focus:border-saffron outline-none text-sm bg-white"
                    >
                      {registeredHospitals.map((h) => {
                        const val = h.full_name || `${h.name}, ${h.city}`;
                        return (
                          <option key={h.id} value={val}>
                            {val}
                          </option>
                        );
                      })}
                      <option value="other">+ Enter Custom Hospital</option>
                    </select>
                  )}
                </div>
              </div>

              {selectedHospital === "other" && (
                <div>
                  <label className="block text-xs font-semibold text-charcoal-soft uppercase mb-1">Custom Hospital Name & City</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. City General Hospital, Mumbai"
                    value={customHospital}
                    onChange={(e) => setCustomHospital(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-subtle focus:border-saffron outline-none text-sm"
                  />
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-soft uppercase mb-1">Consult Fee (₹)</label>
                  <input
                    type="number"
                    required
                    value={docFee}
                    onChange={(e) => setDocFee(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-subtle focus:border-saffron outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-soft uppercase mb-1">Experience (Yrs)</label>
                  <input
                    type="number"
                    required
                    value={docExp}
                    onChange={(e) => setDocExp(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-subtle focus:border-saffron outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-soft uppercase mb-1">Rating</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={docRating}
                    onChange={(e) => setDocRating(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-subtle focus:border-saffron outline-none text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-full bg-charcoal text-bone font-semibold hover:bg-saffron transition flex items-center justify-center gap-2 mt-4"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Doctor Account
              </button>
            </form>
          )}

          {/* Hospital Form */}
          {tab === "hospital" && (
            <form onSubmit={handleCreateHospital} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal-soft uppercase mb-1">Hospital Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fortis Healthcare"
                  value={hospName}
                  onChange={(e) => setHospName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-subtle focus:border-saffron outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-soft uppercase mb-1">City</label>
                  <input
                    type="text"
                    required
                    placeholder="Bengaluru"
                    value={hospCity}
                    onChange={(e) => setHospCity(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-subtle focus:border-saffron outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-soft uppercase mb-1">Area / Locality</label>
                  <input
                    type="text"
                    required
                    placeholder="Indiranagar"
                    value={hospArea}
                    onChange={(e) => setHospArea(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-subtle focus:border-saffron outline-none text-sm"
                  />
                </div>
              </div>

              {/* Upload Hospital Photo Section */}
              <div>
                <label className="block text-xs font-semibold text-charcoal-soft uppercase mb-1">Upload Hospital Photos / Image</label>
                
                {imagePreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-subtle max-h-48 group bg-charcoal">
                    <img src={imagePreview} alt="Hospital Preview" className="w-full h-48 object-cover opacity-90" />
                    <button
                      type="button"
                      onClick={() => { setHospImage(""); setImagePreview(""); }}
                      className="absolute top-3 right-3 p-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition"
                      title="Remove Photo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-3 text-xs text-white/90 bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">
                      Photo Uploaded
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-subtle rounded-2xl cursor-pointer hover:border-saffron hover:bg-saffron/5 transition">
                    <div className="w-12 h-12 rounded-full bg-bone grid place-items-center mb-2">
                      <Upload className="w-6 h-6 text-saffron" />
                    </div>
                    <span className="text-sm font-semibold text-charcoal">Click to upload hospital photo</span>
                    <span className="text-xs text-charcoal-soft mt-1">PNG, JPG, WEBP up to 5MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}

                <div className="mt-2 text-xs text-charcoal-soft flex items-center gap-1">
                  <span>Or enter image URL:</span>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={hospImage}
                    onChange={(e) => { setHospImage(e.target.value); setImagePreview(e.target.value); }}
                    className="flex-1 px-3 py-1 text-xs rounded-lg border border-subtle outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-soft uppercase mb-1">Specialties (comma separated)</label>
                <input
                  type="text"
                  placeholder="Cardiology, Neurology, Pediatrics"
                  value={hospSpecialties}
                  onChange={(e) => setHospSpecialties(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-subtle focus:border-saffron outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-soft uppercase mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  placeholder="Multi-speciality, 24x7 Pharmacy"
                  value={hospTags}
                  onChange={(e) => setHospTags(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-subtle focus:border-saffron outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-soft uppercase mb-1">Min Consult Fee (₹)</label>
                  <input
                    type="number"
                    required
                    value={hospMinFee}
                    onChange={(e) => setHospMinFee(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-subtle focus:border-saffron outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-soft uppercase mb-1">Rating</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={hospRating}
                    onChange={(e) => setHospRating(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-subtle focus:border-saffron outline-none text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-full bg-charcoal text-bone font-semibold hover:bg-saffron transition flex items-center justify-center gap-2 mt-4"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Register Hospital
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
