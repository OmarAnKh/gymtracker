import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const loc = useLocation();

  const links = [
    { to: "/", label: "Train" },
    { to: "/history", label: "History" },
    { to: "/progress", label: "Progress" },
    { to: "/routine", label: "Routine" },
  ];

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 100,
      background: "rgba(10,10,10,0.9)", backdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--border)", padding: "0 20px",
    }}>
      <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", height: 56 }}>
        <Link to="/" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 900, color: "var(--orange)", letterSpacing: "0.02em", marginRight: 32 }}>
          🔥 GYMTRACKER
        </Link>

        <nav style={{ display: "flex", gap: 4, flex: 1 }}>
          {links.map(({ to, label }) => (
            <Link key={to} to={to} style={{
              padding: "6px 14px", borderRadius: "var(--radius-sm)", fontSize: 14, fontWeight: 600,
              color: loc.pathname === to ? "var(--text)" : "var(--text2)",
              background: loc.pathname === to ? "var(--bg3)" : "transparent",
              transition: "all 0.12s",
            }}>{label}</Link>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: "var(--text2)" }}>
            {user?.username}
          </span>
          <button className="btn btn-ghost" onClick={logout} style={{ padding: "6px 12px", fontSize: 13 }}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
