import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { RefreshCw, Clock, ChevronRight, AlertCircle, ArrowLeft } from "lucide-react";
import DashboardShell from "@/pages/DashboardShell";
import { useAuth } from "@/lib/AuthContext";
import { fetchApi } from "@/lib/api";

export default function LiveQueueStatus() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingIdParam = searchParams.get("bookingId");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activeBooking, setActiveBooking] = useState(null);
  const [queueData, setQueueData] = useState(null);

  const loadQueue = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      // 1. Fetch user's bookings if no bookingId in URL
      let targetBookingId = bookingIdParam;
      if (!targetBookingId) {
        const res = await fetchApi("/api/bookings/me");
        if (res.ok) {
          const data = await res.json();
          const active = (data.bookings || []).find(
            (b) => b.status === "arrived" || b.status === "in_consult" || b.status === "booked"
          );
          if (active) {
            targetBookingId = active.id;
            setActiveBooking(active);
          }
        }
      }

      if (!targetBookingId) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // 2. Fetch queue position and timeline
      const qRes = await fetchApi(`/api/bookings/${targetBookingId}/queue-position`);
      if (qRes.ok) {
        const qData = await qRes.json();
        setQueueData(qData);
      } else {
        setError("Unable to load queue status");
      }
    } catch (e) {
      setError(e.message || "Error loading live queue status");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadQueue();
    const interval = setInterval(() => loadQueue(true), 10000);
    return () => clearInterval(interval);
  }, [bookingIdParam]);

  // Demo fallback values to match user image if no live booking is active
  const tokenNumber = queueData?.token_number ?? 7;
  const formattedToken = String(tokenNumber).padStart(2, "0");
  const doctorName = queueData?.doctor_name || "Dr. Sarah Chen";
  const doctorSpecialty = queueData?.doctor_specialty || "General Physician";
  const nowServing = queueData?.now_serving ?? 4;
  const patientsAhead = queueData?.ahead ?? 3;
  const estWait = queueData?.eta_minutes ?? 18;
  const progressPct = queueData?.progress_percent ?? 45;

  const defaultTimeline = [
    { token_number: 1, name: "Priya Nair", status_label: "Completed", status: "completed", is_user: false },
    { token_number: 2, name: "Anjali Menon", status_label: "Completed", status: "completed", is_user: false },
    { token_number: 3, name: "Ravi Kumar", status_label: "Completed", status: "completed", is_user: false },
    { token_number: 4, name: "Neha Patel", status_label: "In consultation", status: "in_consult", is_user: false },
    { token_number: 5, name: "You", status_label: "Your turn soon", status: "arrived", is_user: true },
  ];

  const timelineItems = (queueData?.timeline && queueData.timeline.length > 0) ? queueData.timeline : defaultTimeline;

  return (
    <DashboardShell roles={["patient"]} title="Queue" subtitle="LIVE STATUS">
      <div className="max-w-6xl mx-auto px-4 py-6 font-sans" data-testid="live-queue-page">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center text-sm text-gray-500 mb-3 space-x-2 font-medium">
          <Link to="/app/patient" className="hover:text-gray-900 transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-semibold">Queue</span>
        </nav>

        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl md:text-4xl font-bold font-display text-gray-900 tracking-tight">
            Live Queue Status
          </h1>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Live Card */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-6 md:p-8 border border-subtle shadow-medium">
            {/* Hero Gradient Card */}
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gradient-to-r from-[#0284c7] via-[#0d9488] to-[#10b981] rounded-2xl p-8 md:p-10 text-center text-white relative overflow-hidden shadow-lg mb-8"
            >
              <div className="text-xs uppercase tracking-[0.25em] text-white/80 font-semibold mb-2">
                YOUR TOKEN
              </div>
              <div className="font-mono text-7xl md:text-8xl font-extrabold tracking-tight my-1 drop-shadow-sm">
                {formattedToken}
              </div>
              <div className="text-white/90 font-medium text-base md:text-lg mt-3">
                {doctorName} · {doctorSpecialty}
              </div>
            </motion.div>

            {/* 3 Metric Cards Grid */}
            <div className="grid grid-cols-3 gap-3 md:gap-4 mb-8">
              <div className="bg-gray-50/80 rounded-2xl p-4 md:p-5 text-center border border-gray-100/80">
                <div className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  NOW SERVING
                </div>
                <div className="text-2xl md:text-3xl font-extrabold text-gray-900 font-mono">
                  #{nowServing}
                </div>
              </div>

              <div className="bg-gray-50/80 rounded-2xl p-4 md:p-5 text-center border border-gray-100/80">
                <div className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  PATIENTS AHEAD
                </div>
                <div className="text-2xl md:text-3xl font-extrabold text-gray-900 font-mono">
                  {patientsAhead}
                </div>
              </div>

              <div className="bg-gray-50/80 rounded-2xl p-4 md:p-5 text-center border border-gray-100/80">
                <div className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  EST. WAIT
                </div>
                <div className="text-2xl md:text-3xl font-extrabold text-gray-900 font-mono">
                  {estWait} min
                </div>
              </div>
            </div>

            {/* Progress Section */}
            <div className="mb-8">
              <div className="flex justify-between items-center text-sm font-semibold text-gray-700 mb-2.5">
                <span>Progress</span>
                <span className="font-mono">{progressPct}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 p-0.5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-[#0284c7] via-[#0d9488] to-[#10b981]"
                />
              </div>
            </div>

            {/* Refresh Action Button */}
            <button
              onClick={() => loadQueue(true)}
              disabled={refreshing}
              className="w-full py-4 rounded-2xl border border-gray-200 hover:border-gray-300 bg-white text-gray-700 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition active:scale-[0.99] shadow-sm disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-teal-600" : "text-gray-500"}`} />
              <span>{refreshing ? "Updating..." : "Refresh status"}</span>
            </button>
          </div>

          {/* Right Column: Queue Timeline Sidebar */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 md:p-8 border border-subtle shadow-medium">
            <h2 className="text-lg font-bold text-gray-900 mb-6">
              Queue timeline
            </h2>

            <div className="space-y-5">
              {timelineItems.map((item, idx) => {
                const isCompleted = item.status === "completed" || item.status_label === "Completed" || (nowServing > 0 && item.token_number < nowServing);
                const isConsult = !isCompleted && (item.status === "in_consult" || item.status_label === "In consultation" || item.token_number === nowServing);
                const isUser = item.is_user || item.name === "You";

                const displayStatusLabel = isCompleted
                  ? "Completed"
                  : isConsult
                  ? "In consultation"
                  : isUser
                  ? "Your turn soon"
                  : item.status_label || "Waiting";

                return (
                  <div key={idx} className="flex items-center gap-4">
                    {/* Circle Badge */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-mono font-bold text-sm flex-shrink-0 transition-colors ${
                        isCompleted
                          ? "bg-slate-100 text-slate-400 border border-slate-200"
                          : isConsult
                          ? "bg-blue-100 text-blue-600"
                          : isUser
                          ? "bg-emerald-100 text-emerald-600 ring-2 ring-emerald-500/20"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      #{item.token_number}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold text-sm truncate ${isCompleted ? "text-gray-500" : isUser ? "text-emerald-900" : "text-gray-900"}`}>
                        {item.name}
                      </div>
                      <div
                        className={`text-xs mt-0.5 ${
                          isCompleted
                            ? "text-slate-400 font-medium"
                            : isConsult
                            ? "text-blue-600 font-medium"
                            : isUser
                            ? "text-emerald-600 font-semibold"
                            : "text-gray-400"
                        }`}
                      >
                        {displayStatusLabel}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
