import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  Clock,
  ChevronRight,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Stethoscope,
  Building2,
  Calendar,
  Sparkles,
  Volume2,
  FileText,
  AlertTriangle,
  UserCheck,
} from "lucide-react";
import DashboardShell from "@/pages/DashboardShell";
import { useAuth } from "@/lib/AuthContext";
import api, { fetchApi, formatApiError } from "@/lib/api";

export default function LiveQueueStatus() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingIdParam = searchParams.get("bookingId");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activeBooking, setActiveBooking] = useState(null);
  const [allBookings, setAllBookings] = useState([]);
  const [queueData, setQueueData] = useState(null);
  const [arriving, setArriving] = useState(false);

  const loadQueue = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      // 1. Fetch user's bookings
      const bRes = await api.get("/bookings/me");
      const bookingsList = bRes.data.bookings || [];
      setAllBookings(bookingsList);

      let targetBooking = null;
      if (bookingIdParam) {
        targetBooking = bookingsList.find((b) => b.id === bookingIdParam);
      }
      
      if (!targetBooking) {
        // Find first active/non-completed booking
        targetBooking = bookingsList.find(
          (b) => b.status === "arrived" || b.status === "in_consult" || b.status === "booked"
        ) || bookingsList[0];
      }

      setActiveBooking(targetBooking);

      if (!targetBooking) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // 2. Fetch live queue position and timeline
      const qRes = await api.get(`/bookings/${targetBooking.id}/queue-position`);
      setQueueData(qRes.data);
    } catch (e) {
      setError(formatApiError(e) || "Error loading live queue status");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bookingIdParam]);

  useEffect(() => {
    loadQueue();
    const interval = setInterval(() => loadQueue(true), 8000);
    return () => clearInterval(interval);
  }, [loadQueue]);

  // Arrival check-in handler
  const handleMarkArrived = async () => {
    if (!activeBooking) return;
    setArriving(true);
    try {
      await api.post(`/bookings/${activeBooking.id}/arrive`);
      await loadQueue(true);
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setArriving(false);
    }
  };

  // Values from live queue data
  const tokenNumber = queueData?.token_number ?? activeBooking?.token_number ?? 1;
  const formattedToken = String(tokenNumber).padStart(2, "0");
  const doctorName = queueData?.doctor_name || activeBooking?.doctor_name || "Dr. Kavya Iyer";
  const doctorSpecialty = queueData?.doctor_specialty || activeBooking?.doctor_specialty || "General Physician";
  const hospitalName = activeBooking?.hospital || "Sanjeevani Clinic, Indiranagar";
  const nowServing = queueData?.now_serving ?? 1;
  const patientsAhead = queueData?.ahead ?? 0;
  const estWait = queueData?.eta_minutes ?? 0;
  const progressPct = queueData?.progress_percent ?? 25;
  const isRunningLate = queueData?.running_late || false;
  const delayMinutes = queueData?.delay_minutes || 0;
  const bookingStatus = activeBooking?.status || queueData?.status || "booked";

  const timelineItems = queueData?.timeline || [];

  return (
    <DashboardShell roles={["patient"]} title="Live OPD Queue Tracker" subtitle="REAL-TIME QUEUE MONITOR">
      <div className="max-w-6xl mx-auto px-4 py-4 font-sans" data-testid="live-queue-page">
        {/* Breadcrumb & Live Pulse */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <nav className="flex items-center text-xs text-charcoal-soft space-x-2 font-medium">
            <Link to="/app/patient" className="hover:text-charcoal transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-charcoal font-semibold">Live Queue</span>
            {activeBooking && (
              <>
                <span>/</span>
                <span className="font-mono text-saffron">Token #{formattedToken}</span>
              </>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live OPD Sync (Auto-updates every 8s)</span>
            </div>

            <button
              onClick={() => loadQueue(true)}
              disabled={refreshing}
              className="p-1.5 rounded-full border border-subtle hover:bg-bone transition-colors text-charcoal-soft disabled:opacity-50"
              title="Refresh queue"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-saffron" : ""}`} />
            </button>
          </div>
        </div>

        {/* Doctor Delay Alert Banner */}
        {isRunningLate && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 shadow-sm"
          >
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-bold text-sm">OPD Schedule Update from Doctor</div>
              <div>
                <strong>{doctorName}</strong> is running approximately <strong>+{delayMinutes} minutes</strong> behind schedule due to emergency consultations. Your estimated consultation time has been dynamically updated below.
              </div>
            </div>
          </motion.div>
        )}

        {/* Turn Approaching Banner */}
        {patientsAhead <= 2 && bookingStatus !== "completed" && bookingStatus !== "in_consult" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center justify-between gap-3 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white grid place-items-center flex-shrink-0">
                <Volume2 className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-sm">Your Turn is Approaching!</div>
                <div>Only {patientsAhead} patient{patientsAhead === 1 ? "" : "s"} ahead. Please remain near the OPD consultation room.</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Hero Token Card & Live Metrics */}
          <div className="lg:col-span-8 space-y-6">
            {/* Live Token Hero Card */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-subtle shadow-medium">
              <motion.div
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-gradient-to-r from-[#0284c7] via-[#0d9488] to-[#10b981] rounded-2xl p-6 md:p-8 text-center text-white relative overflow-hidden shadow-lg"
              >
                <div className="flex justify-between items-center text-xs uppercase tracking-widest text-white/80 font-bold mb-2">
                  <span>OPD Consultation Token</span>
                  <span className="bg-white/20 px-2.5 py-0.5 rounded-full capitalize">
                    {bookingStatus === "in_consult" ? "In Consultation Now" : bookingStatus === "arrived" ? "Checked In" : "Confirmed"}
                  </span>
                </div>

                <div className="font-mono text-7xl md:text-8xl font-black tracking-tight my-2 drop-shadow-sm">
                  #{formattedToken}
                </div>

                <div className="text-white font-semibold text-lg mt-2">
                  {doctorName} · <span className="text-white/80 font-normal">{doctorSpecialty}</span>
                </div>

                <div className="text-white/80 text-xs mt-1 flex items-center justify-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{hospitalName} · Room 102 (1st Floor)</span>
                </div>
              </motion.div>

              {/* 3 Real-time Metrics */}
              <div className="grid grid-cols-3 gap-3 md:gap-4 mt-6">
                <div className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100">
                  <div className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    NOW SERVING
                  </div>
                  <div className="text-2xl md:text-3xl font-extrabold text-slate-900 font-mono">
                    #{String(nowServing).padStart(2, "0")}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">In Doctor Cabin</div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100">
                  <div className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    PATIENTS AHEAD
                  </div>
                  <div className="text-2xl md:text-3xl font-extrabold text-blue-600 font-mono">
                    {patientsAhead}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Waiting in lobby</div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100">
                  <div className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    EST. WAIT TIME
                  </div>
                  <div className="text-2xl md:text-3xl font-extrabold text-emerald-600 font-mono">
                    ~{estWait}m
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{isRunningLate ? "Delayed" : "On schedule"}</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-6">
                <div className="flex justify-between items-center text-xs font-bold text-charcoal mb-2">
                  <span>Queue Progress to Your Token</span>
                  <span className="font-mono text-saffron">{progressPct}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 p-0.5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-[#0284c7] via-[#0d9488] to-[#10b981]"
                  />
                </div>
              </div>

              {/* Arrival Action Bar */}
              {bookingStatus === "booked" && (
                <div className="mt-6 p-4 rounded-2xl bg-bone/60 border border-subtle flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-charcoal">
                    <div className="font-bold">Have you arrived at the hospital?</div>
                    <div className="text-charcoal-soft">Check in now to notify the doctor and activate your waiting spot.</div>
                  </div>
                  <button
                    onClick={handleMarkArrived}
                    disabled={arriving}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all flex-shrink-0"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>{arriving ? "Checking In…" : "I'm at the Clinic"}</span>
                  </button>
                </div>
              )}
            </div>

            {/* 4 Stage Visual Journey */}
            <div className="bg-white rounded-3xl p-6 border border-subtle shadow-medium">
              <h3 className="text-sm font-bold text-charcoal uppercase tracking-wider mb-4">
                OPD Consultation Lifecycle
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                  <div className="text-xs font-bold text-emerald-900">1. Booked</div>
                  <div className="text-[10px] text-emerald-700">Token Allocated</div>
                </div>

                <div className={`p-3 rounded-2xl text-center border ${
                  bookingStatus === "arrived" || bookingStatus === "in_consult" || bookingStatus === "completed"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-gray-50 border-gray-200 text-gray-400"
                }`}>
                  <UserCheck className="w-5 h-5 mx-auto mb-1" />
                  <div className="text-xs font-bold">2. Arrived</div>
                  <div className="text-[10px]">{bookingStatus !== "booked" ? "Verified at Kiosk" : "Pending Arrival"}</div>
                </div>

                <div className={`p-3 rounded-2xl text-center border ${
                  bookingStatus === "in_consult" || bookingStatus === "completed"
                    ? "bg-blue-50 border-blue-200 text-blue-900"
                    : "bg-gray-50 border-gray-200 text-gray-400"
                }`}>
                  <Stethoscope className="w-5 h-5 mx-auto mb-1" />
                  <div className="text-xs font-bold">3. In OPD</div>
                  <div className="text-[10px]">{bookingStatus === "in_consult" ? "Consulting Now" : "Waiting Turn"}</div>
                </div>

                <div className={`p-3 rounded-2xl text-center border ${
                  bookingStatus === "completed"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-gray-50 border-gray-200 text-gray-400"
                }`}>
                  <FileText className="w-5 h-5 mx-auto mb-1" />
                  <div className="text-xs font-bold">4. Rx Ready</div>
                  <div className="text-[10px]">{bookingStatus === "completed" ? "Digital Rx Issued" : "Pending Rx"}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Queue Timeline & Switch Bookings */}
          <div className="lg:col-span-4 space-y-6">
            {/* Live Queue Order Timeline */}
            <div className="bg-white rounded-3xl p-6 border border-subtle shadow-medium">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-charcoal uppercase tracking-wider">
                  Live Queue Order
                </h3>
                <span className="text-xs font-mono text-charcoal-soft">
                  {timelineItems.length} in list
                </span>
              </div>

              <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
                {timelineItems.map((item, idx) => {
                  const isCompleted = item.status === "completed" || item.status_label === "Completed" || (nowServing > 0 && item.token_number < nowServing);
                  const isConsult = !isCompleted && (item.status === "in_consult" || item.status_label === "In consultation" || item.token_number === nowServing);
                  const isUser = item.is_user || item.name === "You";

                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 p-2.5 rounded-2xl transition-all ${
                        isUser
                          ? "bg-saffron/10 border border-saffron/30 ring-1 ring-saffron/20"
                          : isConsult
                          ? "bg-blue-50/80 border border-blue-200"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-mono font-bold text-xs flex-shrink-0 ${
                          isCompleted
                            ? "bg-slate-100 text-slate-400"
                            : isConsult
                            ? "bg-blue-600 text-white animate-pulse"
                            : isUser
                            ? "bg-saffron text-white shadow-sm"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        #{String(item.token_number).padStart(2, "0")}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className={`font-semibold text-xs truncate ${isUser ? "text-saffron-dark font-bold" : "text-charcoal"}`}>
                          {item.name} {isUser && "(You)"}
                        </div>
                        <div className="text-[10px] text-charcoal-soft">
                          {isCompleted ? "Completed" : isConsult ? "Consulting with Doctor" : isUser ? "Your Turn Approaching" : "Waiting in OPD"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-3xl p-6 border border-subtle shadow-medium space-y-3">
              <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider">
                OPD Quick Actions
              </h4>

              <Link
                to="/app/patient/prescriptions"
                className="w-full py-3 px-4 rounded-2xl bg-bone hover:bg-bone/80 text-charcoal text-xs font-semibold flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-saffron" />
                  <span>View Digital Prescriptions</span>
                </div>
                <ChevronRight className="w-4 h-4 text-charcoal-soft" />
              </Link>

              <Link
                to="/app/patient/book"
                className="w-full py-3 px-4 rounded-2xl bg-saffron text-white text-xs font-bold flex items-center justify-between hover:bg-saffron-hover transition-colors shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4" />
                  <span>Book Another Appointment</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
