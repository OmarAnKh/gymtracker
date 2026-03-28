import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, register, loading, error, setError } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    const ok = mode === "login"
      ? await login(username, password)
      : await register(username, password);
    if (ok) navigate("/");
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", padding: "20px",
      background: "radial-gradient(ellipse at 50% 0%, rgba(255,107,0,0.08) 0%, transparent 60%)"
    }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔥</div>
          <h1 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 36, fontWeight: 900, letterSpacing: "-0.5px",
            color: "#fff"
          }}>GYMTRACKER</h1>
          <p style={{ color: "var(--text2)", fontSize: 14, marginTop: 6 }}>
            Track your lifts. Watch the progress.
          </p>
        </div>

        <div className="card">
          <div style={{ display: "flex", marginBottom: 24, background: "var(--bg3)", borderRadius: "var(--radius-sm)", padding: 4 }}>
            {["login", "register"].map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(""); }} style={{
                flex: 1, padding: "8px", border: "none", borderRadius: "var(--radius-sm)",
                background: mode === m ? "var(--orange)" : "transparent",
                color: mode === m ? "#fff" : "var(--text2)",
                fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                transition: "all 0.15s", textTransform: "capitalize"
              }}>{m}</button>
            ))}
          </div>

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--text2)", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Username</label>
              <input className="input" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="your_username" autoComplete="username" required />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--text2)", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Password</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" autoComplete={mode === "login" ? "current-password" : "new-password"} required />
            </div>

            {error && (
              <div style={{ background: "var(--red-dim)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: 13, color: "var(--red)" }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 4, height: 42, fontSize: 14 }}>
              {loading ? "..." : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
