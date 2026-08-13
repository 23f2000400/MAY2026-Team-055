// Usage: <PrescriptionQAModal prescriptionId={id} userRole="patient|doctor" onClose={() => {}} />
// Integration pass: Add "Ask a follow-up" button in Medicines.jsx and a "Questions" tab in DoctorDashboard
import { useState, useEffect, useRef } from "react";
import { X, Send, Paperclip, Loader2, Lock } from "lucide-react";
import { fetchApi } from "@/lib/api";

export default function PrescriptionQAModal({ prescriptionId, userRole, onClose }) {
  const [messages, setMessages] = useState([]);
  const [closed, setClosed] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [attachUrl, setAttachUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const fetchMessages = async () => {
    try {
      const res = await fetchApi(`/api/prescriptions/${prescriptionId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setClosed(data.closed || false);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    // Poll every 8s
    const interval = setInterval(fetchMessages, 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prescriptionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!body.trim() && !attachUrl) return;
    setSending(true);
    try {
      const res = await fetch(`/api/prescriptions/${prescriptionId}/messages`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim(), attachment_url: attachUrl || undefined }),
      });
      if (res.ok) {
        setBody("");
        setAttachUrl(null);
        fetchMessages();
      }
    } finally {
      setSending(false);
    }
  };

  const handleAttach = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert("File must be under 3 MB");
      return;
    }
    setAttaching(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads/rx-attachment", {
        method: "POST",
        headers,
        body: fd,
      });
      if (res.ok) {
        const data = await res.json();
        setAttachUrl(data.url);
      }
    } finally {
      setAttaching(false);
    }
  };

  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      data-testid="rx-qa-modal"
    >
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-medium w-full max-w-lg h-[85vh] sm:h-[600px] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-subtle">
          <div>
            <h3 className="font-display text-lg text-charcoal">Prescription Q&amp;A</h3>
            {closed && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <Lock className="w-3 h-3 text-charcoal-soft" strokeWidth={2} />
                <p className="font-body text-xs text-charcoal-soft">This thread is closed</p>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-subtle grid place-items-center hover:border-saffron hover:text-saffron transition"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
          data-testid="rx-qa-messages"
        >
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-saffron" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-body text-sm text-charcoal-soft">
                No messages yet. Ask your follow-up question below.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn =
                (userRole === "patient" && msg.sender_role === "patient") ||
                (userRole === "doctor" && msg.sender_role === "doctor");
              return (
                <div
                  key={msg.id}
                  data-testid={`rx-qa-message-${msg.id}`}
                  className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      isOwn
                        ? "bg-saffron text-white rounded-br-sm"
                        : "bg-bone border border-subtle text-charcoal rounded-bl-sm"
                    }`}
                  >
                    {msg.body && <p className="font-body text-sm">{msg.body}</p>}
                    {msg.attachment_url && (
                      <img
                        src={msg.attachment_url}
                        alt="Attachment"
                        className="w-20 h-20 object-cover rounded-xl mt-2 cursor-pointer"
                        onClick={() => window.open(msg.attachment_url, "_blank")}
                      />
                    )}
                    <p
                      className={`font-mono text-xs mt-1 ${
                        isOwn ? "text-white/70" : "text-charcoal-soft"
                      }`}
                    >
                      {msg.sender_role === "doctor" ? "Doctor · " : ""}
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
        {!closed ? (
          <div className="px-4 py-4 border-t border-subtle" data-testid="rx-qa-composer">
            {attachUrl && (
              <div className="mb-2 flex items-center gap-2">
                <img src={attachUrl} alt="Attached" className="w-10 h-10 object-cover rounded-lg" />
                <button
                  onClick={() => setAttachUrl(null)}
                  className="text-xs text-saffron hover:underline"
                >
                  Remove
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <label className="cursor-pointer" data-testid="rx-qa-attach">
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleAttach}
                  className="hidden"
                />
                <div
                  className={`w-9 h-9 rounded-full border border-subtle grid place-items-center hover:border-saffron hover:text-saffron transition-colors ${
                    attaching ? "opacity-50" : ""
                  }`}
                >
                  {attaching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Paperclip className="w-4 h-4" strokeWidth={1.8} />
                  )}
                </div>
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, 500))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask your question…"
                className="flex-1 px-3 py-2.5 rounded-xl border border-subtle bg-bone focus:outline-none focus:border-saffron font-body text-sm text-charcoal resize-none min-h-[44px] max-h-28"
                rows={1}
              />
              <button
                onClick={sendMessage}
                disabled={sending || (!body.trim() && !attachUrl)}
                data-testid="rx-qa-send"
                className="w-9 h-9 rounded-full bg-saffron text-white grid place-items-center hover:bg-saffron-hover transition-colors disabled:opacity-40"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" strokeWidth={2} />
                )}
              </button>
            </div>
            <p className="font-mono text-xs text-charcoal-soft/50 mt-1 text-right">
              {body.length}/500
            </p>
          </div>
        ) : (
          <div className="px-4 py-4 border-t border-subtle text-center">
            <p className="font-body text-sm text-charcoal-soft flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> This conversation is closed
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
