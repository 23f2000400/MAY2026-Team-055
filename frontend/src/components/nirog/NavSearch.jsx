// Usage: add to Nav.jsx or Landing.jsx (integration pass will do this)
// Standalone search component for navigation bar
import { Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function NavSearch() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <form onSubmit={handleSearch} className="relative hidden md:block">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-soft"
        strokeWidth={1.8}
      />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        data-testid="nav-search-input"
        placeholder="Doctor · Specialty · City"
        className="pl-9 pr-4 py-2 rounded-full border border-subtle bg-white/80 backdrop-blur text-sm font-body text-charcoal focus:outline-none focus:border-saffron transition-colors w-64"
      />
    </form>
  );
}
