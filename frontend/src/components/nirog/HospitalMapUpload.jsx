// Usage: <HospitalMapUpload />
// Integration pass: add to ReceptionDashboard.jsx for map management section
import { useState, useRef } from "react";
import { Upload, CheckCircle2, Map } from "lucide-react";

export default function HospitalMapUpload({ onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [mapUrl, setMapUrl] = useState(null);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const token = localStorage.getItem("nirog_token");

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      setError("Only JPEG, PNG, WebP, and SVG images are allowed.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("File size must be under 2 MB.");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/reception/hospital/map", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Upload failed");
      }

      const data = await res.json();
      setMapUrl(data.url);
      onUploaded?.(data.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-3xl bg-white border border-subtle p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-saffron/10 grid place-items-center">
          <Map className="w-5 h-5 text-saffron" strokeWidth={1.5} />
        </div>
        <div>
          <h3 className="font-display text-xl text-charcoal">Hospital Floor Map</h3>
          <p className="font-body text-sm text-charcoal-soft">
            Upload a map so patients can navigate to their doctor.
          </p>
        </div>
      </div>

      {mapUrl && (
        <div className="rounded-2xl overflow-hidden border border-subtle">
          <img src={mapUrl} alt="Hospital map" className="w-full h-40 object-cover" />
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml"
        className="hidden"
        data-testid="upload-hospital-map"
        onChange={handleUpload}
      />

      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-subtle text-sm text-charcoal hover:border-saffron hover:text-saffron transition disabled:opacity-50"
      >
        {uploading ? (
          <>
            <div className="w-4 h-4 rounded-full border-2 border-saffron border-t-transparent animate-spin" />
            Uploading…
          </>
        ) : mapUrl ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-sage" strokeWidth={2} />
            Replace map
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" strokeWidth={1.8} />
            Upload map
          </>
        )}
      </button>

      {error && (
        <p className="font-body text-sm text-red-500">{error}</p>
      )}

      <p className="font-body text-xs text-charcoal-soft">
        Max 2 MB. Accepted formats: JPG, PNG, WebP, SVG.
      </p>
    </div>
  );
}
