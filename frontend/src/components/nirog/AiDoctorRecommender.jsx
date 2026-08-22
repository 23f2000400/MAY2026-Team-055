import React, { useState } from "react";
import { Sparkles, Loader2, AlertTriangle, AlertCircle, CheckCircle2, BookOpen, ShieldCheck, Activity } from "lucide-react";
import api, { formatApiError } from "@/lib/api";

export default function AiDoctorRecommender({ onSelectRecommendation }) {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleRecommend = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const { data } = await api.post("/ai/recommend", {
        description: description.trim(),
        city: "Bengaluru",
      });
      setResult(data);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-8 rounded-3xl bg-gradient-to-br from-charcoal to-charcoal-dark p-6 sm:p-8 text-bone shadow-2xl border border-white/10 relative overflow-hidden" data-testid="ai-doctor-recommender">
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-saffron/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <div className="flex items-center gap-2 text-saffron text-xs font-mono font-semibold uppercase tracking-[0.25em]">
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span>NirogPath Medical RAG AI Recommender</span>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono">
          <ShieldCheck className="w-3 h-3" />
          <span>RAG Pipeline Active</span>
        </div>
      </div>

      <h3 className="text-xl font-heading font-bold text-white mb-2">
        Let Clinical RAG AI find the right specialist for you
      </h3>
      <p className="text-sm text-bone/70 mb-6 max-w-xl">
        Describe your symptoms and budget. Our Retrieval-Augmented Generation (RAG) engine retrieves verified clinical guidelines and live doctor profiles to formulate an evidence-based recommendation.
      </p>

      <form onSubmit={handleRecommend} className="space-y-4">
        <div className="relative">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Frequent headaches for 3 days with mild dizziness, budget under ₹800 in Bengaluru"
            rows={3}
            data-testid="ai-symptom-input"
            className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-bone/40 focus:outline-none focus:border-saffron focus:ring-1 focus:ring-saffron text-sm resize-none transition"
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <button
            type="submit"
            disabled={loading || !description.trim()}
            data-testid="ai-recommend-submit"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-saffron hover:bg-saffron-dark text-white font-medium text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Retrieving Clinical Evidence & Scoring Doctors...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Get AI Recommendation</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Error / Non-medical relevance warning (HTTP 400) */}
      {error && (
        <div className="mt-6 p-4 rounded-xl bg-crimson/10 border border-crimson/30 text-crimson-soft text-sm flex items-start gap-3" data-testid="ai-recommend-error">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold block mb-0.5">Clinical Validation Check</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Result Card */}
      {result && result.doctor && (
        <div className="mt-6 p-6 rounded-2xl bg-white/10 border border-white/15 backdrop-blur space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300" data-testid="ai-recommend-result">
          {/* Budget Warning Banner if present */}
          {result.budget_warning && (
            <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-medium flex items-center gap-2" data-testid="ai-budget-warning">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>⚠️ {result.budget_warning}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-saffron block">
                  ✦ Recommended Specialist
                </span>
                {result.urgency_level && (
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase font-bold ${
                    result.urgency_level === "emergency" || result.urgency_level === "urgent"
                      ? "bg-red-500/20 text-red-300 border border-red-500/30"
                      : result.urgency_level === "priority"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  }`}>
                    {result.urgency_level} triage
                  </span>
                )}
              </div>
              <h4 className="text-lg font-heading font-bold text-white">
                {result.doctor.name} — <span className="text-saffron-light">{result.doctor.specialty}</span>
              </h4>
              <p className="text-xs text-bone/70 mt-1">
                {result.doctor.hospital || "Sanjeevani Health Hub"} • Fee: ₹{result.doctor.fee || 500}
                {result.doctor.rating && ` • Rating: ${result.doctor.rating}★`}
              </p>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-mono text-bone/60 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-saffron" />
              <span>Clinical Evidence & RAG Synthesis:</span>
            </div>
            <p className="text-xs text-bone/90 bg-black/20 p-3 rounded-xl border border-white/5 italic">
              "{result.reasoning}"
            </p>
          </div>

          {result.clinical_notes && (
            <div className="text-xs text-bone/70 bg-white/5 p-3 rounded-xl border border-white/5">
              <span className="font-semibold text-bone/90">Clinical Note: </span>
              {result.clinical_notes}
            </div>
          )}

          {/* Retrieved Sources / Citations */}
          {result.rag_sources && result.rag_sources.length > 0 && (
            <div className="pt-1">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-bone/50 mb-1.5">
                <BookOpen className="w-3 h-3 text-saffron/70" />
                <span>Retrieved Knowledge Evidence ({result.rag_sources.length} sources indexed):</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.rag_sources.map((src, i) => (
                  <span key={i} className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10 text-bone/70">
                    {src.type === "clinical_guideline" ? `📋 ${src.title}` : `👨‍⚕️ ${src.name} (${src.specialty})`}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={() => onSelectRecommendation(result.doctor)}
              data-testid="ai-use-recommendation-btn"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-sage hover:bg-sage-dark text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Use this recommendation</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
