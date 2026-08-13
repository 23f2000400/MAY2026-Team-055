// Integration: Add this to DashboardShell.jsx header in the integration pass
// Usage: <NotificationBell />
import { useState, useEffect, useRef } from "react";
import { Bell, BellRing, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchApi } from "@/lib/api";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await fetchApi('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnread(data.unread_count || 0);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // poll every 15s
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (notifId) => {
    await fetchApi(`/api/notifications/${notifId}/mark-read`, {
      method: 'POST',
    });
    fetchNotifications();
  };

  const markAllRead = async () => {
    await fetchApi('/api/notifications/mark-all-read', {
      method: 'POST',
    });
    fetchNotifications();
  };

  const handleBookNow = (notif) => {
    const { doctor_id, date, slot_time } = notif.payload;
    markRead(notif.id);
    setOpen(false);
    navigate(`/app/patient?doctor_id=${doctor_id}&prefill_date=${date}&prefill_slot=${slot_time}`);
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString('en-IN');
  };

  const kindLabel = {
    slot_opened: 'A slot opened up',
    running_late: 'Doctor running late',
    new_message: 'New prescription message',
    transfer_offer: 'Queue transfer offer',
  };

  return (
    <div className="relative" ref={dropdownRef} data-testid="notification-bell">
      <button
        onClick={() => { setOpen(!open); if (!open) fetchNotifications(); }}
        className="relative w-10 h-10 rounded-full border border-subtle grid place-items-center hover:border-saffron transition text-charcoal-soft"
        aria-label="Notifications"
      >
        {unread > 0 ? (
          <BellRing className="w-4 h-4 text-saffron" strokeWidth={1.8} />
        ) : (
          <Bell className="w-4 h-4" strokeWidth={1.8} />
        )}
        {unread > 0 && (
          <span
            data-testid="notification-count"
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-saffron text-white text-xs grid place-items-center font-mono"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          data-testid="notification-dropdown"
          className="absolute right-0 top-12 w-80 bg-white border border-subtle rounded-2xl shadow-medium z-50 overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-subtle">
            <span className="font-display text-base text-charcoal">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-saffron hover:underline font-body">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="w-8 h-8 text-charcoal-soft/30 mx-auto mb-2" />
                <p className="font-body text-sm text-charcoal-soft">No notifications yet</p>
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  data-testid={`notification-item-${notif.id}`}
                  className={`px-4 py-3 border-b border-subtle last:border-0 ${!notif.read_at ? 'bg-saffron/5 border-l-2 border-l-saffron' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!notif.read_at ? 'bg-saffron' : 'bg-transparent'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm text-charcoal font-medium">
                        {kindLabel[notif.kind] || 'Notification'}
                      </p>
                      {notif.kind === 'slot_opened' && (
                        <p className="font-body text-xs text-charcoal-soft mt-0.5">
                          {notif.payload?.slot_time} slot is now available
                        </p>
                      )}
                      <p className="font-mono text-xs text-charcoal-soft/60 mt-1">{formatTime(notif.created_at)}</p>

                      {notif.kind === 'slot_opened' && (
                        <button
                          onClick={() => handleBookNow(notif)}
                          data-testid={`notification-book-now-${notif.id}`}
                          className="mt-2 px-4 py-1.5 rounded-full bg-saffron text-white text-xs font-body hover:bg-saffron-hover transition-colors"
                        >
                          Book now →
                        </button>
                      )}
                    </div>
                    {!notif.read_at && (
                      <button
                        onClick={() => markRead(notif.id)}
                        className="text-charcoal-soft/40 hover:text-charcoal-soft flex-shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
