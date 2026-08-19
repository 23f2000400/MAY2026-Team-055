{/* Route: <Route path="/app/patient/wallet" element={<WalletPage />} /> */}
import React, { useEffect, useState, useCallback } from "react";
import DashboardShell from "./DashboardShell";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Plus, Tag, CheckCircle2, XCircle, Loader2, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

const TOPUP_AMOUNTS = [500, 1000, 2000, 5000];

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function WalletPage() {
  const { user, refreshUser } = useAuth();

  // Balance & transactions state (initialized from auth session)
  const [balance, setBalance] = useState(user?.wallet_balance ?? 0);
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(true);

  // Top-up state
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [topupMsg, setTopupMsg] = useState(null); // { type: "success"|"error", text }

  // Redeem state
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState(null); // { type: "success"|"error", text }

  // Synchronize state when user changes
  useEffect(() => {
    if (user?.wallet_balance !== undefined && user?.wallet_balance !== null) {
      setBalance(user.wallet_balance);
    }
  }, [user?.wallet_balance]);

  const loadTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const { data } = await api.get("/wallet/transactions");
      setTransactions(data.transactions || []);
      if (data.balance !== undefined && data.balance !== null) {
        setBalance(data.balance);
      } else if (data.wallet_balance !== undefined && data.wallet_balance !== null) {
        setBalance(data.wallet_balance);
      }
    } catch (e) {
      // silently ignore (logged out race)
    } finally {
      setTxLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleTopup = async () => {
    if (!selectedAmount || confirming) return;
    setConfirming(true);
    setTopupMsg(null);
    try {
      const { data } = await api.post("/wallet/topup", { amount: selectedAmount });
      setBalance(data.new_balance);
      setTopupMsg({
        type: "success",
        text: `₹${selectedAmount} added successfully! New balance: ₹${data.new_balance}`,
      });
      setSelectedAmount(null);
      await Promise.all([loadTransactions(), refreshUser()]);
    } catch (e) {
      setTopupMsg({ type: "error", text: formatApiError(e) });
    } finally {
      setConfirming(false);
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
      setBalance(data.new_balance);
      setRedeemMsg({
        type: "success",
        text: `₹${data.credited_amount} credited! New balance: ₹${data.new_balance}`,
      });
      setRedeemCode("");
      await Promise.all([loadTransactions(), refreshUser()]);
    } catch (e) {
      setRedeemMsg({ type: "error", text: formatApiError(e) });
    } finally {
      setRedeemLoading(false);
    }
  };

  return (
    <DashboardShell
      roles={["patient"]}
      subtitle="NirogPath Wallet"
      title="Your balance"
    >
      {/* Balance hero card */}
      <motion.div
        data-testid="wallet-balance-hero"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-3xl bg-charcoal text-bone p-8 md:p-10 flex flex-col md:flex-row md:items-center gap-6 mb-10"
      >
        <div className="w-14 h-14 rounded-2xl bg-bone/10 grid place-items-center flex-shrink-0">
          <Wallet className="w-7 h-7 text-bone" strokeWidth={1.6} />
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-bone/50 font-semibold mb-1">
            Available balance
          </div>
          <div className="font-mono text-5xl md:text-6xl leading-none text-bone">
            ₹{balance.toLocaleString("en-IN")}
          </div>
          <div className="mt-2 text-sm text-bone/50">
            Used for consultation deposits and bookings
          </div>
        </div>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-8 mb-10">
        {/* Add money section */}
        <div className="rounded-3xl bg-white border border-subtle p-6 md:p-8">
          <div className="flex items-center gap-2 mb-6">
            <Plus className="w-5 h-5 text-saffron" strokeWidth={2} />
            <h2 className="font-display text-2xl text-charcoal">Add money</h2>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            {TOPUP_AMOUNTS.map((amt) => (
              <button
                key={amt}
                data-testid={`topup-amount-${amt}`}
                onClick={() => {
                  setSelectedAmount(amt);
                  setTopupMsg(null);
                }}
                className={`py-4 rounded-2xl border text-center transition-all ${
                  selectedAmount === amt
                    ? "border-saffron bg-saffron/10 text-saffron"
                    : "border-subtle hover:border-charcoal/40 text-charcoal"
                }`}
              >
                <div className="font-mono text-xl">₹{amt.toLocaleString("en-IN")}</div>
              </button>
            ))}
          </div>

          <button
            data-testid="topup-confirm"
            onClick={handleTopup}
            disabled={!selectedAmount || confirming}
            className={`w-full py-3.5 rounded-2xl text-sm font-medium transition-colors ${
              selectedAmount && !confirming
                ? "bg-saffron text-white hover:bg-saffron-hover"
                : "bg-charcoal/5 text-charcoal-soft cursor-not-allowed"
            }`}
          >
            {confirming ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Adding…
              </span>
            ) : selectedAmount ? (
              `Add ₹${selectedAmount.toLocaleString("en-IN")} to wallet`
            ) : (
              "Select an amount above"
            )}
          </button>

          <AnimatePresence mode="wait">
            {topupMsg && (
              <motion.div
                key={topupMsg.type}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mt-4 flex items-start gap-2 px-4 py-3 rounded-xl text-sm ${
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
        </div>

        {/* Redeem code section */}
        <div className="rounded-3xl bg-white border border-subtle p-6 md:p-8">
          <div className="flex items-center gap-2 mb-6">
            <Tag className="w-5 h-5 text-saffron" strokeWidth={2} />
            <h2 className="font-display text-2xl text-charcoal">Redeem code</h2>
          </div>

          <form onSubmit={handleRedeem} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-charcoal-soft mb-2">
                Promo / gift code
              </label>
              <input
                data-testid="redeem-code-input"
                type="text"
                value={redeemCode}
                onChange={(e) => {
                  setRedeemCode(e.target.value.toUpperCase());
                  setRedeemMsg(null);
                }}
                placeholder="e.g. WELCOME500"
                className="w-full px-4 py-3 rounded-2xl border border-subtle bg-bone font-mono text-charcoal placeholder:text-charcoal-soft/50 focus:outline-none focus:border-saffron transition"
              />
            </div>

            <button
              data-testid="redeem-submit"
              type="submit"
              disabled={!redeemCode.trim() || redeemLoading}
              className={`w-full py-3.5 rounded-2xl text-sm font-medium transition-colors ${
                redeemCode.trim() && !redeemLoading
                  ? "bg-charcoal text-bone hover:bg-charcoal/90"
                  : "bg-charcoal/5 text-charcoal-soft cursor-not-allowed"
              }`}
            >
              {redeemLoading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking…
                </span>
              ) : (
                "Apply code"
              )}
            </button>
          </form>

          <AnimatePresence mode="wait">
            {redeemMsg && (
              <motion.div
                key={redeemMsg.type}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mt-4 flex items-start gap-2 px-4 py-3 rounded-xl text-sm ${
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

          <div className="mt-6 p-4 rounded-2xl bg-bone border border-subtle">
            <div className="text-xs uppercase tracking-widest text-charcoal-soft mb-2">
              Demo codes to try
            </div>
            {["WELCOME500 → ₹500", "NIROG200 → ₹200", "TRYNIROG → ₹100"].map((hint) => (
              <div key={hint} className="font-mono text-xs text-charcoal-soft mt-1">
                {hint}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transaction history */}
      <div className="rounded-3xl bg-white border border-subtle p-6 md:p-8">
        <h2 className="font-display text-2xl text-charcoal mb-6">Transaction history</h2>

        {txLoading ? (
          <div className="flex items-center gap-2 text-charcoal-soft py-6">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading transactions…
          </div>
        ) : transactions.length === 0 ? (
          <div
            data-testid="tx-list"
            className="text-charcoal-soft text-sm py-8 text-center rounded-2xl border border-dashed border-subtle"
          >
            No transactions yet. Add money to get started.
          </div>
        ) : (
          <div data-testid="tx-list" className="divide-y divide-subtle">
            {transactions.map((tx) => {
              const isCredit = tx.type === "topup" || tx.type === "credit";
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div
                    className={`w-10 h-10 rounded-full grid place-items-center flex-shrink-0 ${
                      isCredit ? "bg-green-50" : "bg-red-50"
                    }`}
                  >
                    {isCredit ? (
                      <ArrowUpCircle
                        className="w-5 h-5 text-green-600"
                        strokeWidth={1.8}
                      />
                    ) : (
                      <ArrowDownCircle
                        className="w-5 h-5 text-red-500"
                        strokeWidth={1.8}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-charcoal font-medium capitalize">
                      {tx.type === "topup" ? "Top-up" : tx.type === "credit" ? "Credit" : "Debit"}
                    </div>
                    <div className="text-xs text-charcoal-soft truncate">{tx.note || "—"}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div
                      className={`font-mono text-base font-semibold ${
                        isCredit ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {isCredit ? "+" : "-"}₹{tx.amount?.toLocaleString("en-IN")}
                    </div>
                    <div className="text-xs text-charcoal-soft">{formatDate(tx.created_at)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
