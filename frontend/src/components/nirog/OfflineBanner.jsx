import React, { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";

/**
 * OfflineBanner — fixed sticky bottom banner that appears when the user
 * loses network connectivity. Auto-hides 2 seconds after coming back online.
 *
 * Usage: render once near the root, e.g. inside App.js or a layout shell.
 *   <OfflineBanner />
 */
export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [justReconnected, setJustReconnected] = useState(false);
  const [visible, setVisible] = useState(!navigator.onLine);

  useEffect(() => {
    let hideTimer = null;

    function handleOffline() {
      setIsOffline(true);
      setJustReconnected(false);
      setVisible(true);
      if (hideTimer) clearTimeout(hideTimer);
    }

    function handleOnline() {
      setIsOffline(false);
      setJustReconnected(true);
      // Auto-hide 2 seconds after reconnecting
      hideTimer = setTimeout(() => {
        setVisible(false);
        setJustReconnected(false);
      }, 2000);
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      data-testid="offline-banner"
      role="alert"
      aria-live="assertive"
      className={`
        fixed bottom-0 left-0 right-0 z-50
        bg-charcoal text-bone py-3 px-6
        flex items-center justify-between gap-4
        transition-transform duration-300
        ${visible ? "translate-y-0" : "translate-y-full"}
      `}
    >
      {/* Left: icon + message */}
      <div className="flex items-center gap-3 min-w-0">
        <WifiOff
          className={`w-4 h-4 shrink-0 ${isOffline ? "text-saffron" : "text-sage"}`}
          strokeWidth={2}
        />
        <span className="font-body text-sm truncate">
          {isOffline
            ? "You're offline. Some things won't work — we'll auto-refresh when you're back."
            : "Back online! Reconnecting…"}
        </span>
      </div>

      {/* Right: reconnected badge (visible only for the 2-second grace window) */}
      {justReconnected && !isOffline && (
        <div className="flex items-center gap-1.5 shrink-0 text-sage text-sm font-body">
          <Wifi className="w-4 h-4" strokeWidth={2} />
          <span>Reconnected</span>
        </div>
      )}
    </div>
  );
}
