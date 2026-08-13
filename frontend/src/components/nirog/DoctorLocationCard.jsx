// Usage: <DoctorLocationCard />
// Integration pass: add to DoctorSettings.jsx as a "Location" tab or card
// Allows doctors to set their cabin, floor, landmark, and map pin position
import { useState, useEffect } from "react";
import { Navigation, Save, CheckCircle2 } from "lucide-react";
import { fetchApi } from "@/lib/api";

export default function DoctorLocationCard({ onSuccess, onError }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [cabin, setCabin] = useState("");
  const [floor, setFloor] = useState("");
  const [landmark, setLandmark] = useState("");
  const [mapX, setMapX] = useState(50);
  const [mapY, setMapY] = useState(50);

  useEffect(() => {
    fetchApi("/api/doctor/profile")
      .then((r) => r.json())
      .then((d) => {
        const u = d.user || {};
        setCabin(u.cabin || "");
        setFloor(u.floor || "");
        setLandmark(u.landmark || "");
        setMapX(u.map_x != null ? u.map_x : 50);
        setMapY(u.map_y != null ? u.map_y : 50);
      })
      .catch((e) => onError?.(e.message || "Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetchApi("/api/doctor/location", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cabin: cabin || undefined,
          floor: floor || undefined,
          landmark: landmark || undefined,
          map_x: mapX,
          map_y: mapY,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Save failed");
      }

      setSaved(true);
      onSuccess?.("Location saved successfully.");
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      onError?.(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl bg-white border border-subtle p-6">
        <div className="flex items-center gap-2 text-charcoal-soft py-4">
          <div className="w-4 h-4 rounded-full border-2 border-saffron border-t-transparent animate-spin" />
          Loading location…
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white border border-subtle p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-saffron/10 grid place-items-center">
          <Navigation className="w-5 h-5 text-saffron" strokeWidth={1.5} />
        </div>
        <div>
          <h3 className="font-display text-2xl text-charcoal">Your location</h3>
          <p className="font-body text-sm text-charcoal-soft">
            Help patients find you inside the hospital.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Cabin */}
        <div className="space-y-1.5">
          <label
            htmlFor="doctor-cabin"
            className="block text-xs uppercase tracking-[0.2em] text-charcoal-soft font-semibold"
          >
            Cabin / Room
          </label>
          <input
            id="doctor-cabin"
            data-testid="doctor-edit-cabin"
            type="text"
            value={cabin}
            onChange={(e) => setCabin(e.target.value)}
            placeholder="e.g. Cabin 3"
            className="w-full px-4 py-3 rounded-2xl border border-subtle bg-bone text-charcoal text-sm focus:outline-none focus:border-saffron transition placeholder:text-charcoal-soft/50"
          />
        </div>

        {/* Floor */}
        <div className="space-y-1.5">
          <label
            htmlFor="doctor-floor"
            className="block text-xs uppercase tracking-[0.2em] text-charcoal-soft font-semibold"
          >
            Floor
          </label>
          <input
            id="doctor-floor"
            data-testid="doctor-edit-floor"
            type="text"
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            placeholder="e.g. Floor 1"
            className="w-full px-4 py-3 rounded-2xl border border-subtle bg-bone text-charcoal text-sm focus:outline-none focus:border-saffron transition placeholder:text-charcoal-soft/50"
          />
        </div>
      </div>

      {/* Landmark */}
      <div className="space-y-1.5">
        <label
          htmlFor="doctor-landmark"
          className="block text-xs uppercase tracking-[0.2em] text-charcoal-soft font-semibold"
        >
          Landmark / hint
        </label>
        <input
          id="doctor-landmark"
          data-testid="doctor-edit-landmark"
          type="text"
          value={landmark}
          onChange={(e) => setLandmark(e.target.value)}
          placeholder="e.g. Near the pharmacy"
          className="w-full px-4 py-3 rounded-2xl border border-subtle bg-bone text-charcoal text-sm focus:outline-none focus:border-saffron transition placeholder:text-charcoal-soft/50"
        />
      </div>

      {/* Map pin coordinates */}
      <div className="rounded-2xl bg-bone p-4 space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-charcoal-soft font-semibold">
          Map pin position (%)
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="doctor-map-x" className="block text-xs text-charcoal-soft">
              Horizontal (X): <span className="font-mono text-charcoal">{Math.round(mapX)}%</span>
            </label>
            <input
              id="doctor-map-x"
              data-testid="doctor-edit-map-x"
              type="range"
              min={0}
              max={100}
              step={1}
              value={mapX}
              onChange={(e) => setMapX(Number(e.target.value))}
              className="w-full accent-saffron"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="doctor-map-y" className="block text-xs text-charcoal-soft">
              Vertical (Y): <span className="font-mono text-charcoal">{Math.round(mapY)}%</span>
            </label>
            <input
              id="doctor-map-y"
              data-testid="doctor-edit-map-y"
              type="range"
              min={0}
              max={100}
              step={1}
              value={mapY}
              onChange={(e) => setMapY(Number(e.target.value))}
              className="w-full accent-saffron"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-saffron text-white text-sm font-body hover:bg-saffron/90 transition disabled:opacity-50"
      >
        {saving ? (
          <>
            <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            Saving…
          </>
        ) : saved ? (
          <>
            <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
            Saved!
          </>
        ) : (
          <>
            <Save className="w-4 h-4" strokeWidth={1.8} />
            Save location
          </>
        )}
      </button>
    </div>
  );
}
