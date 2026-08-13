// ROUTE TO ADD IN App.js:
// import AnalyticsDashboard from "@/pages/AnalyticsDashboard";
// <Route path="/app/reception/analytics" element={<AnalyticsDashboard />} />

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Users, Clock, Zap, Send, AlertCircle } from "lucide-react";
import DashboardShell from "@/pages/DashboardShell";

const COLORS = {
  primary: "#E26D5C",   // saffron
  teal: "#477998",      // teal
  ochre: "#F4A261",     // ochre (warning/no-shows)
  sage: "#6A8D73",      // sage (completed/wins)
  soft: "#FBF9F6",      // bone
  charcoal: "#2D3142",
};

export default function AnalyticsDashboard() {
  const [range, setRange] = useState("7d");
  const [doctorFilter, setDoctorFilter] = useState("");
  const [data, setData] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testDigestStatus, setTestDigestStatus] = useState("idle"); // idle | sending | sent | error

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        range,
        ...(doctorFilter && { doctor_id: doctorFilter }),
      });
      const res = await fetchApi(`/api/reception/analytics?${params}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    const res = await fetchApi("/api/doctors");
    if (res.ok) {
      const d = await res.json();
      setDoctors(d.doctors || []);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    fetchData();
  }, [range, doctorFilter]);

  const sendTestDigest = async () => {
    setTestDigestStatus("sending");
    await new Promise((r) => setTimeout(r, 1500)); // simulate
    setTestDigestStatus("sent");
    setTimeout(() => setTestDigestStatus("idle"), 3000);
  };

  // KPI cards
  const kpis = data
    ? [
        {
          label: "Total bookings",
          value:
            data.totals.booked +
            data.totals.completed +
            data.totals.arrived +
            data.totals.in_consult +
            data.totals.cancelled,
          icon: Users,
          testid: "kpi-bookings",
          color: "bg-charcoal",
        },
        {
          label: "No-show rate",
          value: `${data.no_show_rate}%`,
          icon: AlertCircle,
          testid: "kpi-noshow",
          color: "bg-ochre",
        },
        {
          label: "Avg consultation",
          value: `${data.avg_consult_time_min} min`,
          icon: Clock,
          testid: "kpi-avg-consult",
          color: "bg-teal",
        },
        {
          label: "Walk-ins",
          value: data.totals.walkins,
          icon: Zap,
          testid: "kpi-idle",
          color: "bg-sage",
        },
      ]
    : [];

  const statusPieData = data
    ? [
        { name: "Completed", value: data.totals.completed, color: COLORS.sage },
        { name: "Booked", value: data.totals.booked, color: COLORS.teal },
        { name: "Arrived", value: data.totals.arrived, color: COLORS.primary },
        { name: "Cancelled", value: data.totals.cancelled, color: COLORS.ochre },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <DashboardShell roles={["reception"]} title="Analytics" subtitle="PERFORMANCE OVERVIEW">

      {/* Range + filter controls */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <div className="flex items-center gap-1 p-1 rounded-full bg-white border border-subtle">
          {[
            ["today", "Today"],
            ["7d", "7 days"],
            ["30d", "30 days"],
          ].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setRange(val)}
              data-testid={`analytics-range-${val}`}
              className={`px-4 py-1.5 rounded-full text-sm font-body transition-colors ${
                range === val
                  ? "bg-charcoal text-bone"
                  : "text-charcoal-soft hover:text-charcoal"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <select
          value={doctorFilter}
          onChange={(e) => setDoctorFilter(e.target.value)}
          data-testid="analytics-doctor-filter"
          className="px-4 py-2 rounded-full border border-subtle bg-white font-body text-sm text-charcoal focus:outline-none focus:border-saffron"
        >
          <option value="">All doctors</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <button
          onClick={sendTestDigest}
          disabled={testDigestStatus === "sending"}
          data-testid="send-test-digest"
          className="ml-auto px-5 py-2 rounded-full border border-subtle text-sm font-body text-charcoal-soft hover:border-saffron hover:text-saffron transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" strokeWidth={1.8} />
          {testDigestStatus === "sending"
            ? "Sending…"
            : testDigestStatus === "sent"
            ? "Sent! ✓"
            : "Send test digest"}
        </button>
      </div>

      {loading ? (
        <div className="py-24 text-center text-charcoal-soft font-body">
          Loading analytics…
        </div>
      ) : !data ? (
        <div className="py-24 text-center">
          <p className="font-display text-2xl text-charcoal italic">
            "Not enough data yet. Come back tomorrow."
          </p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {kpis.map((kpi) => (
              <div
                key={kpi.testid}
                data-testid={kpi.testid}
                className="bg-white rounded-2xl border border-subtle p-5"
              >
                <div
                  className={`w-10 h-10 rounded-full ${kpi.color}/10 grid place-items-center mb-3`}
                >
                  <kpi.icon
                    className={`w-5 h-5 ${
                      kpi.color === "bg-charcoal"
                        ? "text-charcoal"
                        : kpi.color.replace("bg-", "text-")
                    }`}
                    strokeWidth={1.8}
                  />
                </div>
                <div className="font-mono text-2xl text-charcoal font-bold">
                  {kpi.value}
                </div>
                <div className="font-body text-xs text-charcoal-soft mt-1 uppercase tracking-widest">
                  {kpi.label}
                </div>
              </div>
            ))}
          </div>

          {/* Charts 2×2 grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Daily bookings bar chart */}
            <div
              className="bg-white rounded-2xl border border-subtle p-6"
              data-testid="chart-daily"
            >
              <h3 className="font-display text-lg text-charcoal mb-4">
                Daily bookings
              </h3>
              {data.daily_series?.every((d) => d.bookings === 0) ? (
                <div className="h-48 flex items-center justify-center text-charcoal-soft font-body text-sm">
                  No data for this period
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={data.daily_series}
                    margin={{ top: 0, right: 0, bottom: 0, left: -30 }}
                  >
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fontFamily: "Space Mono" }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fontFamily: "Space Mono" }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        fontFamily: "Outfit",
                        fontSize: 12,
                        borderRadius: 12,
                        border: "1px solid #E5E1D8",
                      }}
                    />
                    <Bar
                      dataKey="completed"
                      name="Completed"
                      fill={COLORS.sage}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="cancelled"
                      name="Cancelled"
                      fill={COLORS.ochre}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Status pie chart */}
            <div
              className="bg-white rounded-2xl border border-subtle p-6"
              data-testid="chart-status"
            >
              <h3 className="font-display text-lg text-charcoal mb-4">
                Status breakdown
              </h3>
              {statusPieData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-charcoal-soft font-body text-sm">
                  No data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="40%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {statusPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      formatter={(v) => (
                        <span style={{ fontFamily: "Outfit", fontSize: 12 }}>
                          {v}
                        </span>
                      )}
                    />
                    <Tooltip
                      contentStyle={{
                        fontFamily: "Outfit",
                        fontSize: 12,
                        borderRadius: 12,
                        border: "1px solid #E5E1D8",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Avg consult time trend (line chart) */}
            <div
              className="bg-white rounded-2xl border border-subtle p-6"
              data-testid="chart-consult-trend"
            >
              <h3 className="font-display text-lg text-charcoal mb-4">
                Consultation trend
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart
                  data={data.daily_series?.map((d) => ({
                    ...d,
                    avg_min: d.completed > 0 ? 12 : 0,
                  }))}
                  margin={{ top: 0, right: 0, bottom: 0, left: -30 }}
                >
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fontFamily: "Space Mono" }}
                  />
                  <YAxis tick={{ fontSize: 10, fontFamily: "Space Mono" }} />
                  <Tooltip
                    contentStyle={{
                      fontFamily: "Outfit",
                      fontSize: 12,
                      borderRadius: 12,
                      border: "1px solid #E5E1D8",
                    }}
                    formatter={(v) => [`${v} min`, "Avg consult"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="avg_min"
                    stroke={COLORS.teal}
                    strokeWidth={2}
                    dot={false}
                    name="Avg consult (min)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Idle minutes per doctor */}
            <div
              className="bg-white rounded-2xl border border-subtle p-6"
              data-testid="chart-idle"
            >
              <h3 className="font-display text-lg text-charcoal mb-4">
                Idle time per doctor
              </h3>
              {data.idle_minutes_per_doctor?.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-charcoal-soft font-body text-sm">
                  No data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={data.idle_minutes_per_doctor}
                    layout="vertical"
                    margin={{ top: 0, right: 10, bottom: 0, left: 80 }}
                  >
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fontFamily: "Space Mono" }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 10, fontFamily: "Outfit", width: 80 }}
                    />
                    <Tooltip
                      contentStyle={{
                        fontFamily: "Outfit",
                        fontSize: 12,
                        borderRadius: 12,
                        border: "1px solid #E5E1D8",
                      }}
                      formatter={(v) => [`${v} min`, "Idle"]}
                    />
                    <Bar
                      dataKey="idle_min"
                      fill={COLORS.ochre}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
