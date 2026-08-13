import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { X, Wallet, Tag, CheckCircle2, XCircle, Loader2 } from "lucide-react";

const TOPUP_AMOUNTS = [500, 1000, 2000, 5000];

export default function WalletTopupModal({ onClose }) {
  const { refreshUser } = useAuth();

  // Top-up state
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupMsg, setTopupMsg] = useState(null); // { type: "success"|"error", text }

  // Redeem state
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState(null); // { type: "success"|"error", text }

  const handleTopup = async () => {
    if (!selectedAmount || topupLoading) return;
    setTopupLoading(true);
    setTopupMsg(null);
    try {
      const { data } = await api.post("/wallet/topup", { amount: selectedAmount });
      setTopupMsg({
        type: "success",
        text: `₹${selectedAmount} added! Balance: ₹${data.new_balance}`,
      });
      setSelectedAmount(null);
      await refreshUser();
    } catch (e) {
      setTopupMsg({ type: "error", text: formatApiError(e) });
    } finally {
      setTopupLoading(false);
    }
  };

  const handleRedeem = async (e) => {
    e.preventDefault();
    const code = redeemCode.trim();
    if (!code || redeemLoading) return;
    setRedeemLoading(true);
    setRedeemMsg(null);
    try {
      const { data } = await api.post("/wallet/redeem", { code });
      setRedeemMsg({
        type: "success",
        text: `₹${data.credited_amount} credited! Balance: ₹${data.new_balance}`,
      });
      setRedeemCode("");
      await refreshUser();
    } catch (e) {
      setRedeemMsg({ type: "error", text: formatApiError(e) });
    } finally {
      setRedeemLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-charcoal/60 backdrop-blur-sm grid place-items-center px-4"
      onClick={onClose}
    >
      <motion.div
        data-testid="wallet-topup-modal"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ type: "spring", damping: 24, stiffness: 260 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white rounded-3xl w-full max-w-md p-7 shadow-medium"
      >
        {/* Header */}
        <button
          onClick={onClose}
          aria-label="Close wallet modal"
          className="absolute top-5 right-5 w-9 h-9 rounded-full grid place-items-center border border-subtle text-charcoal-soft hover:border-charcoal transition"
        >
          <X className="w-4 h-4" strokeWidth={1.8} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-charcoal grid place-items-center">
            <Wallet className="w-5 h-5 text-bone" strokeWidth={1.6} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-saffron font-semibold">
              NirogPath Wallet
            </div>
            <div className="font-display text-xl text-charcoal leading-tight">Add money</div>
          </div>
        </div>

        {/* Amount chips */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          {TOPUP_AMOUNTS.map((amt) => (
            <button
              key={amt}
              data-testid={`modal-topup-amount-${amt}`}
              onClick={() => {
                setSelectedAmount(amt);
                setTopupMsg(null);
              }}
              className={`py-3.5 rounded-2xl border text-center transition-all ${
                selectedAmount === amt
                  ? "border-saffron bg-saffron/10 text-saffron"
                  : "border-subtle hover:border-charcoal/40 text-charcoal"
              }`}
            >
              <span className="font-mono text-lg">₹{amt.toLocaleString("en-IN")}</span>
            </button>
          ))}
        </div>

        {/* Confirm button */}
        <button
          data-testid="modal-topup-confirm"
          onClick={handleTopup}
          disabled={!selectedAmount || topupLoading}
          className={`w-full py-3.5 rounded-2xl text-sm font-medium transition-colors mb-3 ${
            selectedAmount && !topupLoading
              ? "bg-saffron text-white hover:bg-saffron-hover"
              : "bg-charcoal/5 text-charcoal-soft cursor-not-allowed"
          }`}
        >
          {topupLoading ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Adding…
            </span>
          ) : selectedAmount ? (
            `Add ₹${selectedAmount.toLocaleString("en-IN")}`
          ) : (
            "Select an amount"
          )}
        </button>

        {/* Top-up feedback */}
        <AnimatePresence mode="wait">
          {topupMsg && (
            <motion.div
              key={topupMsg.type + "-topup"}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mb-4 flex items-start gap-2 px-4 py-3 rounded-xl text-sm ${
                topupMsg.type === "success"
                  ? "bg-green-50 border border-green-100 text-green-700"
                  : "bg-red-50 border border-red-100 text-red-700"
              }`}
            >
              {topupMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={2} />
              ) : (
                <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={2} />
              )}
              {topupMsg.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-subtle" />
          <div className="flex items-center gap-1.5 text-xs text-charcoal-soft">
            <Tag className="w-3.5 h-3.5" strokeWidth={2} />
            Redeem a code
          </div>
          <div className="flex-1 h-px bg-subtle" />
        </div>

        {/* Redeem section */}
        <form onSubmit={handleRedeem} className="flex gap-2">
          <input
            data-testid="modal-redeem-input"
            type="text"
            value={redeemCode}
            onChange={(e) => {
              setRedeemCode(e.target.value.toUpperCase());
              setRedeemMsg(null);
            }}
            placeholder="PROMO CODE"
            className="flex-1 px-4 py-3 rounded-2xl border border-subtle bg-bone font-mono text-sm text-charcoal placeholder:text-charcoal-soft/50 focus:outline-none focus:border-saffron transition"
          />
          <button
            data-testid="modal-redeem-submit"
            type="submit"
            disabled={!redeemCode.trim() || redeemLoading}
            className={`px-5 py-3 rounded-2xl text-sm font-medium transition-colors flex-shrink-0 ${
              redeemCode.trim() && !redeemLoading
                ? "bg-charcoal text-bone hover:bg-charcoal/90"
                : "bg-charcoal/5 text-charcoal-soft cursor-not-allowed"
            }`}
          >
            {redeemLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Apply"
            )}
          </button>
        </form>

        {/* Redeem feedback */}
        <AnimatePresence mode="wait">
          {redeemMsg && (
            <motion.div
              key={redeemMsg.type + "-redeem"}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mt-3 flex items-start gap-2 px-4 py-3 rounded-xl text-sm ${
                redeemMsg.type === "success"
                  ? "bg-green-50 border border-green-100 text-green-700"
                  : "bg-red-50 border border-red-100 text-red-700"
              }`}
            >
              {redeemMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={2} />
              ) : (
                <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={2} />
              )}
              {redeemMsg.text}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
