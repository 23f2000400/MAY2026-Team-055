import React, { useState, useEffect } from "react";
import DashboardShell from "./DashboardShell";
import api, { formatApiError } from "@/lib/api";
import {
  Building2, Stethoscope, Users, TrendingUp, Search, Plus, Edit3, Trash2,
  BarChart3, Star, MapPin, Tag, IndianRupee, Loader2, Check, AlertCircle, RefreshCw,
  UserPlus, ClipboardList
} from "lucide-react";
import AdminManagerModal from "@/components/nirog/AdminManagerModal";

export default function AdminHospitalsDashboard() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createTab, setCreateTab] = useState("hospital");

  // Analytics & Detail Modal state
  const [selectedHospitalAnalytics, setSelectedHospitalAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Edit Modal State
  const [editHospital, setEditHospital] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editSuccess, setEditSuccess] = useState("");
  const [editError, setEditError] = useState("");

  const loadHospitals = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/admin/hospitals");
      setHospitals(data.hospitals || []);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHospitals();
  }, []);

  const openAnalytics = async (h) => {
    setAnalyticsLoading(true);
    try {
      const { data } = await api.get(`/admin/hospitals/${h.id}/analytics`);
      setSelectedHospitalAnalytics({ ...data, meta: h });
    } catch (err) {
      alert("Failed to load hospital analytics: " + formatApiError(err));
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleDelete = async (hid, hname) => {
    if (!window.confirm(`Are you sure you want to remove ${hname}?`)) return;
    try {
      await api.delete(`/admin/hospitals/${hid}`);
      loadHospitals();
    } catch (err) {
      alert("Failed to delete hospital: " + formatApiError(err));
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError("");
    setEditSuccess("");
    try {
      const payload = {
        name: editHospital.name,
        city: editHospital.city,
        area: editHospital.area,
        rating: Number(editHospital.rating),
        reviews: Number(editHospital.reviews),
        image: editHospital.image,
        tags: Array.isArray(editHospital.tags)
          ? editHospital.tags
          : String(editHospital.tags || "").split(",").map((s) => s.trim()).filter(Boolean),
        specialties: Array.isArray(editHospital.specialties)
          ? editHospital.specialties
          : String(editHospital.specialties || "").split(",").map((s) => s.trim()).filter(Boolean),
        min_fee: Number(editHospital.min_fee),
      };
      await api.put(`/admin/hospitals/${editHospital.id}`, payload);
      setEditSuccess("Hospital details updated successfully!");
      setTimeout(() => {
        setEditHospital(null);
        loadHospitals();
      }, 1000);
    } catch (err) {
      setEditError(formatApiError(err));
    } finally {
      setEditLoading(false);
    }
  };

  // Filtered List
  const cities = Array.from(new Set(hospitals.map((h) => h.city))).filter(Boolean);
  const filtered = hospitals.filter((h) => {
    const matchesSearch =
      (h.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (h.city || "").toLowerCase().includes(search.toLowerCase()) ||
      (h.area || "").toLowerCase().includes(search.toLowerCase()) ||
      (h.tags || []).some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesCity = selectedCity === "all" || h.city === selectedCity;
    return matchesSearch && matchesCity;
  });

  // Global KPIs
  const totalHospitals = hospitals.length;
  const totalDoctors = hospitals.reduce((acc, h) => acc + (h.doctor_count || 0), 0);
  const totalBookings = hospitals.reduce((acc, h) => acc + (h.total_bookings || 0), 0);
  const totalRevenue = hospitals.reduce((acc, h) => acc + (h.revenue || 0), 0);

  return (
    <DashboardShell roles={["admin"]} subtitle="Superuser Control Panel" title="Hospital Network & Analytics">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => { setCreateTab("hospital"); setIsCreateOpen(true); }}
            className="px-4 py-2.5 rounded-full bg-saffron text-bone font-semibold text-xs md:text-sm hover:bg-charcoal transition flex items-center gap-2 shadow-md"
          >
            <Building2 className="w-4 h-4" />
            <span>Register Hospital</span>
          </button>
          <button
            onClick={() => { setCreateTab("doctor"); setIsCreateOpen(true); }}
            className="px-4 py-2.5 rounded-full bg-charcoal text-bone font-semibold text-xs md:text-sm hover:bg-saffron transition flex items-center gap-2 shadow-md"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Doctor</span>
          </button>
          <button
            onClick={() => { setCreateTab("receptionist"); setIsCreateOpen(true); }}
            className="px-4 py-2.5 rounded-full bg-bone border border-subtle text-charcoal font-semibold text-xs md:text-sm hover:bg-charcoal hover:text-bone transition flex items-center gap-2 shadow-sm"
          >
            <ClipboardList className="w-4 h-4 text-saffron" />
            <span>Add Receptionist</span>
          </button>
          <button
            onClick={loadHospitals}
            className="p-2.5 rounded-full border border-subtle bg-white text-charcoal-soft hover:text-charcoal transition"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-charcoal-soft" />
            <input
              type="text"
              placeholder="Search hospital, city, tag…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-full border border-subtle bg-white text-sm outline-none focus:border-saffron w-64"
            />
          </div>

          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="px-4 py-2 rounded-full border border-subtle bg-white text-sm outline-none focus:border-saffron"
          >
            <option value="all">All Cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Global Network KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="p-5 rounded-2xl bg-white border border-subtle shadow-sm">
          <div className="flex items-center justify-between text-charcoal-soft text-xs uppercase tracking-wider font-semibold">
            <span>Partner Hospitals</span>
            <Building2 className="w-4 h-4 text-saffron" />
          </div>
          <div className="text-3xl font-display text-charcoal mt-2">{totalHospitals}</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-subtle shadow-sm">
          <div className="flex items-center justify-between text-charcoal-soft text-xs uppercase tracking-wider font-semibold">
            <span>Affiliated Doctors</span>
            <Stethoscope className="w-4 h-4 text-teal" />
          </div>
          <div className="text-3xl font-display text-charcoal mt-2">{totalDoctors}</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-subtle shadow-sm">
          <div className="flex items-center justify-between text-charcoal-soft text-xs uppercase tracking-wider font-semibold">
            <span>Total Consultations</span>
            <Users className="w-4 h-4 text-sage" />
          </div>
          <div className="text-3xl font-display text-charcoal mt-2">{totalBookings}</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-subtle shadow-sm">
          <div className="flex items-center justify-between text-charcoal-soft text-xs uppercase tracking-wider font-semibold">
            <span>Network Revenue</span>
            <TrendingUp className="w-4 h-4 text-saffron" />
          </div>
          <div className="text-3xl font-mono text-saffron mt-2">₹{totalRevenue.toLocaleString("en-IN")}</div>
        </div>
      </div>

      {/* Hospital Cards Grid */}
      {loading ? (
        <div className="py-20 flex items-center justify-center gap-3 text-charcoal-soft">
          <Loader2 className="w-6 h-6 animate-spin text-saffron" />
          <span>Loading hospital network data…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-subtle p-8">
          <Building2 className="w-12 h-12 text-charcoal-soft/40 mx-auto mb-3" />
          <h3 className="text-lg font-display text-charcoal">No hospitals found</h3>
          <p className="text-sm text-charcoal-soft mt-1">Try resetting your search filter or add a new hospital.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((h) => (
            <div
              key={h.id}
              className="rounded-3xl bg-white border border-subtle overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between group"
            >
              <div>
                <div className="relative h-44 bg-charcoal overflow-hidden">
                  <img
                    src={h.image || "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=800&q=70"}
                    alt={h.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-xs font-semibold text-charcoal flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-saffron text-saffron" />
                    <span>{h.rating || 4.8}</span>
                    <span className="text-charcoal-soft">({h.reviews || 100})</span>
                  </div>
                  <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs font-semibold text-bone flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-saffron" />
                    <span>{h.city} · {h.area}</span>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="font-display text-xl text-charcoal">{h.name}</h3>
                  <p className="text-xs text-charcoal-soft mt-0.5">{h.full_name}</p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {(h.tags || []).map((t, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-full bg-bone border border-subtle text-[11px] text-charcoal-soft">
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-subtle grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <div className="text-charcoal-soft">Doctors</div>
                      <div className="font-semibold text-charcoal mt-0.5">{h.doctor_count || 0}</div>
                    </div>
                    <div>
                      <div className="text-charcoal-soft">Min Fee</div>
                      <div className="font-mono font-semibold text-charcoal mt-0.5">₹{h.min_fee || 500}</div>
                    </div>
                    <div>
                      <div className="text-charcoal-soft">Bookings</div>
                      <div className="font-semibold text-teal mt-0.5">{h.total_bookings || 0}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Action Footer */}
              <div className="p-4 bg-bone/60 border-t border-subtle flex items-center justify-between gap-2">
                <button
                  onClick={() => openAnalytics(h)}
                  className="px-3.5 py-1.5 rounded-full bg-charcoal text-bone hover:bg-saffron text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Analytics</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditHospital({ ...h, tags: (h.tags || []).join(", "), specialties: (h.specialties || []).join(", ") })}
                    className="p-2 rounded-full hover:bg-subtle text-charcoal-soft hover:text-charcoal transition"
                    title="Edit Hospital"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(h.id, h.name)}
                    className="p-2 rounded-full hover:bg-red-50 text-charcoal-soft hover:text-red-600 transition"
                    title="Delete Hospital"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hospital Analytics Modal */}
      {selectedHospitalAnalytics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-subtle relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedHospitalAnalytics(null)}
              className="absolute top-6 right-6 p-2 rounded-full bg-bone hover:bg-subtle text-charcoal-soft"
            >
              ✕
            </button>

            <div className="text-xs uppercase tracking-widest text-saffron font-semibold">Hospital Analytics &amp; Doctors</div>
            <h2 className="text-2xl font-display text-charcoal mt-1">{selectedHospitalAnalytics.meta?.name}</h2>
            <p className="text-xs text-charcoal-soft">{selectedHospitalAnalytics.meta?.city} · {selectedHospitalAnalytics.meta?.area}</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              <div className="p-4 rounded-2xl bg-bone border border-subtle">
                <div className="text-[11px] uppercase text-charcoal-soft font-semibold">Total Consultations</div>
                <div className="text-2xl font-display text-charcoal mt-1">{selectedHospitalAnalytics.total_bookings}</div>
              </div>
              <div className="p-4 rounded-2xl bg-bone border border-subtle">
                <div className="text-[11px] uppercase text-charcoal-soft font-semibold">Completed</div>
                <div className="text-2xl font-display text-sage mt-1">{selectedHospitalAnalytics.status_counts?.completed || 0}</div>
              </div>
              <div className="p-4 rounded-2xl bg-bone border border-subtle">
                <div className="text-[11px] uppercase text-charcoal-soft font-semibold">Revenue Generated</div>
                <div className="text-2xl font-mono text-saffron mt-1">₹{selectedHospitalAnalytics.total_revenue}</div>
              </div>
              <div className="p-4 rounded-2xl bg-bone border border-subtle">
                <div className="text-[11px] uppercase text-charcoal-soft font-semibold">No-Show Rate</div>
                <div className="text-2xl font-display text-ochre mt-1">{selectedHospitalAnalytics.no_show_rate}%</div>
              </div>
            </div>

            <h4 className="font-semibold text-charcoal mt-6 mb-3 text-sm">Affiliated Doctors Performance</h4>
            <div className="space-y-2">
              {(selectedHospitalAnalytics.doctor_performance || []).length === 0 ? (
                <div className="text-sm text-charcoal-soft">No doctors assigned yet.</div>
              ) : (
                selectedHospitalAnalytics.doctor_performance.map((d) => (
                  <div key={d.id} className="p-3.5 rounded-xl border border-subtle flex items-center justify-between text-sm bg-white">
                    <div>
                      <div className="font-semibold text-charcoal">{d.name}</div>
                      <div className="text-xs text-charcoal-soft">{d.specialty}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-charcoal">{d.total_patients} Patients</div>
                      <div className="text-xs font-mono text-saffron">₹{d.revenue}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Hospital Modal */}
      {editHospital && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-subtle relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditHospital(null)}
              className="absolute top-6 right-6 p-2 rounded-full bg-bone hover:bg-subtle text-charcoal-soft"
            >
              ✕
            </button>

            <div className="text-xs uppercase tracking-widest text-saffron font-semibold">Edit Hospital Record</div>
            <h2 className="text-2xl font-display text-charcoal mt-1">Update Hospital Information</h2>

            {editError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {editError}
              </div>
            )}

            {editSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-green-50 text-green-700 text-sm flex items-center gap-2">
                <Check className="w-4 h-4" />
                {editSuccess}
              </div>
            )}

            <form onSubmit={handleUpdateSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal-soft uppercase mb-1">Hospital Name</label>
                <input
                  type="text"
                  required
                  value={editHospital.name}
                  onChange={(e) => setEditHospital({ ...editHospital, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-subtle focus:border-saffron outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-soft uppercase mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={editHospital.city}
                    onChange={(e) => setEditHospital({ ...editHospital, city: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-subtle focus:border-saffron outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-soft uppercase mb-1">Area / Locality</label>
                  <input
                    type="text"
                    required
                    value={editHospital.area}
                    onChange={(e) => setEditHospital({ ...editHospital, area: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-subtle focus:border-saffron outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-soft uppercase mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={editHospital.tags}
                  onChange={(e) => setEditHospital({ ...editHospital, tags: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-subtle focus:border-saffron outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-soft uppercase mb-1">Min Consult Fee (₹)</label>
                  <input
                    type="number"
                    required
                    value={editHospital.min_fee}
                    onChange={(e) => setEditHospital({ ...editHospital, min_fee: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-subtle focus:border-saffron outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-soft uppercase mb-1">Rating</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={editHospital.rating}
                    onChange={(e) => setEditHospital({ ...editHospital, rating: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-subtle focus:border-saffron outline-none text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={editLoading}
                className="w-full py-3 rounded-full bg-charcoal text-bone font-semibold hover:bg-saffron transition flex items-center justify-center gap-2 mt-4"
              >
                {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <AdminManagerModal
        isOpen={isCreateOpen}
        defaultTab={createTab}
        onClose={() => setIsCreateOpen(false)}
        onRefresh={loadHospitals}
      />
    </DashboardShell>
  );
}
