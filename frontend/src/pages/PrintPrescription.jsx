// ROUTE TO ADD IN App.js:
// import PrintPrescription from "@/pages/PrintPrescription";
// <Route path="/app/patient/prescriptions/:id/print" element={<PrintPrescription />} />

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { fetchApi } from "@/lib/api";

function formatDate(isoString) {
  if (!isoString) return "";
  try {
    return new Date(isoString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return isoString;
  }
}

export default function PrintPrescription() {
  const params = useParams();
  const id = params.id || params.prescriptionId;
  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const signatureUrl = prescription?.doctor_signature || null;
  const licenseNumber = prescription?.doctor_license || null;
  const credentials = prescription?.doctor_credentials || [];

  const fetchPrintData = useCallback(async () => {
    if (!id) {
      setError("No prescription specified.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetchApi(`/api/prescriptions/${id}/print-data`);
      if (res.status === 404 || res.status === 403) {
        setError("Prescription not found or access denied.");
        return;
      }
      if (!res.ok) {
        setError("Failed to load prescription.");
        return;
      }
      const data = await res.json();
      setPrescription(data.prescription);
    } catch {
      setError("Failed to load prescription.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPrintData();
  }, [fetchPrintData]);

  // Auto-trigger print after data loads with a short delay
  useEffect(() => {
    if (!prescription) return;
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, [prescription]);

  const handleDownloadPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" data-testid="print-page">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-body text-sm">Preparing prescription…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" data-testid="print-page">
        <div className="text-center">
          <p className="font-body text-charcoal text-lg">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" data-testid="print-page">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          @page { size: A4; margin: 20mm; }
        }
      `}</style>

      {/* No-print controls */}
      <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 rounded-full bg-charcoal text-bone text-sm font-body"
          data-testid="print-btn"
        >
          Print again
        </button>
        <button
          onClick={handleDownloadPDF}
          className="px-4 py-2 rounded-full bg-saffron text-white text-sm font-body"
          data-testid="download-pdf-btn"
        >
          Download PDF
        </button>
      </div>

      {/* A4 print area */}
      <div className="max-w-[210mm] mx-auto px-12 py-10 print:p-8">
        {/* Letterhead */}
        <div data-testid="print-letterhead" className="border-b-2 border-charcoal pb-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="font-display text-3xl text-charcoal">{prescription.doctor_name}</h1>
              <p className="font-body text-sm text-charcoal-soft mt-1">{prescription.doctor_specialty}</p>
              {credentials.length > 0 && (
                <p className="font-mono text-xs text-charcoal-soft mt-1">{credentials.join(" · ")}</p>
              )}
              {licenseNumber && (
                <p className="font-mono text-xs text-charcoal-soft">Reg. No: {licenseNumber}</p>
              )}
            </div>
            <div className="text-right">
              <div className="font-display text-xl text-saffron">NirogPath</div>
              <p className="font-mono text-xs text-charcoal-soft">{prescription.hospital}</p>
            </div>
          </div>
        </div>

        {/* Patient info */}
        <div
          data-testid="print-patient-info"
          className="grid grid-cols-2 gap-4 mb-8 bg-bone p-4 rounded-lg"
        >
          <div>
            <p className="text-xs uppercase tracking-widest text-saffron font-semibold">Patient</p>
            <p className="font-body text-charcoal font-medium mt-1">{prescription.patient_name}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-saffron font-semibold">Date</p>
            <p className="font-mono text-charcoal mt-1">{formatDate(prescription.created_at)}</p>
          </div>
        </div>

        {/* Medications table */}
        <div data-testid="print-meds-table">
          <h2 className="font-display text-xl text-charcoal mb-4 uppercase tracking-widest text-sm">
            Medications
          </h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-charcoal">
                <th className="text-left font-body text-xs uppercase tracking-widest py-2 pr-4">Medicine</th>
                <th className="text-left font-body text-xs uppercase tracking-widest py-2 pr-4">Dose</th>
                <th className="text-left font-body text-xs uppercase tracking-widest py-2 pr-4">Frequency</th>
                <th className="text-left font-body text-xs uppercase tracking-widest py-2 pr-4">Food</th>
                <th className="text-left font-body text-xs uppercase tracking-widest py-2">Duration</th>
              </tr>
            </thead>
            <tbody>
              {prescription.medications?.map((med, i) => (
                <tr key={i} className="border-b border-subtle">
                  <td className="py-3 pr-4 font-body font-medium text-charcoal">{med.name}</td>
                  <td className="py-3 pr-4 font-mono text-sm text-charcoal-soft">{med.dose}</td>
                  <td className="py-3 pr-4 font-body text-sm">{med.frequency_label}</td>
                  <td className="py-3 pr-4 font-body text-sm">{med.food_label}</td>
                  <td className="py-3 font-mono text-sm">{med.duration_days} days</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Notes */}
        {prescription.notes && (
          <div data-testid="print-notes" className="mt-8">
            <p className="text-xs uppercase tracking-widest text-saffron font-semibold mb-2">
              Doctor's Notes
            </p>
            <p className="font-body text-charcoal bg-bone p-4 rounded-lg">{prescription.notes}</p>
          </div>
        )}

        {/* Bottom: Signature + QR */}
        <div className="mt-16 flex justify-between items-end">
          <div data-testid="print-signature">
            {signatureUrl ? (
              <img src={signatureUrl} alt="Doctor signature" className="h-16 object-contain" />
            ) : (
              <div className="h-16 w-48 border-b border-charcoal" />
            )}
            <p className="font-body text-xs text-charcoal-soft mt-1">Doctor's Signature</p>
          </div>
          <div data-testid="print-qr" className="text-right">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(
                window.location.origin + "/api/prescriptions/" + prescription.id + "/verify"
              )}`}
              alt="Verification QR"
              className="w-20 h-20 ml-auto"
            />
            <p className="font-mono text-xs text-charcoal-soft mt-1">Scan to verify</p>
          </div>
        </div>

        <p className="font-body text-xs text-charcoal-soft text-center mt-12 border-t border-subtle pt-4">
          This prescription was issued digitally via NirogPath. Scan the QR code above to verify its
          authenticity.
        </p>
      </div>
    </div>
  );
}
