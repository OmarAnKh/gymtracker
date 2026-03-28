import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import api from "../utils/api";
import { useRoutine } from "../context/RoutineContext";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
      <div style={{ color: "var(--text2)", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 700 }}>{p.name}: {p.value} {p.name === "Volume" ? "kg·reps" : "kg"}</div>
      ))}
    </div>
  );
};

export default function ProgressPage() {
  const { days } = useRoutine();
  const exercises = useMemo(() => (
    days.flatMap((day) => day.exercises.map((ex) => ({ ...ex, dayName: day.name, dayColor: day.color, dayId: day.id })))
  ), [days]);
  const [selectedEx, setSelectedEx] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [metric, setMetric] = useState("maxWeight"); // maxWeight | volume | avgReps

  useEffect(() => {
    if (!selectedEx && exercises.length) {
      setSelectedEx(exercises[0].id);
    } else if (selectedEx && !exercises.some((ex) => ex.id === selectedEx)) {
      setSelectedEx(exercises[0]?.id || null);
    }
  }, [exercises, selectedEx]);

  useEffect(() => {
    if (selectedEx) fetchHistory();
    else setHistory([]);
  }, [selectedEx]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/logs/exercise/${selectedEx}`);
      setHistory(data.reverse());
    } catch { }
    setLoading(false);
  };

  const ex = exercises.find(e => e.id === selectedEx);

  const chartData = history
    .filter(h => h.sets.some(s => s.weight))
    .map(h => {
      const validSets = h.sets.filter(s => s.weight);
      const maxWeight = Math.max(...validSets.map(s => s.weight));
      const volume = validSets.reduce((a, s) => a + (s.weight || 0) * (s.reps || 0), 0);
      const avgReps = validSets.length ? Math.round(validSets.reduce((a, s) => a + (s.reps || 0), 0) / validSets.length) : 0;
      return {
        date: h.date.slice(5),
        "Max Weight": maxWeight,
        "Volume": Math.round(volume),
        "Avg Reps": avgReps,
      };
    });

  const allTimeMax = chartData.length ? Math.max(...chartData.map(d => d["Max Weight"])) : 0;
  const latestMax = chartData.length ? chartData[chartData.length - 1]["Max Weight"] : 0;
  const firstMax = chartData.length ? chartData[0]["Max Weight"] : 0;
  const improvement = firstMax > 0 ? Math.round(((latestMax - firstMax) / firstMax) * 100) : 0;

  const metricKey = metric === "maxWeight" ? "Max Weight" : metric === "volume" ? "Volume" : "Avg Reps";
  const metricColor = metric === "maxWeight" ? "#FF6B00" : metric === "volume" ? "#3B82F6" : "#10B981";

  if (days.length === 0) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px" }}>
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 32, fontWeight: 900, marginBottom: 6 }}>PROGRESS</h1>
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
          <p style={{ color: "var(--text2)", marginBottom: 12 }}>No routine found. Import one to see charts.</p>
          <Link to="/routine" className="btn btn-primary" style={{ padding: "10px 18px" }}>Routine Builder</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px" }}>
      <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 32, fontWeight: 900, marginBottom: 6 }}>PROGRESS</h1>
      <p style={{ color: "var(--text2)", fontSize: 14, marginBottom: 24 }}>Track your strength gains over time</p>

      {/* Exercise picker */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Select exercise</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {days.map(d => (
            <div key={d.id}>
              <div style={{ fontSize: 12, color: d.color, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{d.name}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {d.exercises.map(e => (
                  <button key={e.id} onClick={() => setSelectedEx(e.id)} style={{
                    padding: "5px 12px", borderRadius: "var(--radius-sm)", fontSize: 12, fontWeight: 600,
                    fontFamily: "inherit", cursor: "pointer", transition: "all 0.12s",
                    background: selectedEx === e.id ? d.color : "var(--bg3)",
                    color: selectedEx === e.id ? "#fff" : "var(--text2)",
                    border: selectedEx === e.id ? "none" : "1px solid var(--border)",
                  }}>{e.name}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats row */}
      {chartData.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { label: "All-time PR", value: `${allTimeMax} kg` },
            { label: "Latest session", value: `${latestMax} kg` },
            { label: "Overall improvement", value: improvement >= 0 ? `+${improvement}%` : `${improvement}%`, color: improvement > 0 ? "var(--green)" : improvement < 0 ? "var(--red)" : "var(--text)" },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 900, fontFamily: "'Barlow Condensed', sans-serif", color: s.color || "var(--text)" }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{ex?.name}</div>
            <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 2 }}>{ex?.target}</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { key: "maxWeight", label: "Max weight" },
              { key: "volume", label: "Volume" },
              { key: "avgReps", label: "Avg reps" },
            ].map(m => (
              <button key={m.key} onClick={() => setMetric(m.key)} style={{
                padding: "5px 12px", borderRadius: "var(--radius-sm)", fontSize: 12, fontWeight: 600,
                fontFamily: "inherit", cursor: "pointer",
                background: metric === m.key ? "var(--bg4)" : "transparent",
                color: metric === m.key ? "var(--text)" : "var(--text3)",
                border: "1px solid var(--border)",
              }}>{m.label}</button>
            ))}
          </div>
        </div>

        {!selectedEx ? (
          <div style={{ height: 240, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text3)" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div>
            <div>Create a routine to unlock progress charts.</div>
          </div>
        ) : loading ? (
          <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)" }}>Loading...</div>
        ) : chartData.length < 2 ? (
          <div style={{ height: 240, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text3)" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📈</div>
            <div>Log at least 2 sessions to see progress</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fill: "var(--text3)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--text3)", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone" dataKey={metricKey} stroke={metricColor}
                strokeWidth={2.5} dot={{ fill: metricColor, r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: metricColor }}
                name={metricKey}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Session list */}
      {history.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>All sessions</div>
          {[...history].reverse().map(h => {
            const validSets = h.sets.filter(s => s.weight);
            if (!validSets.length) return null;
            const maxW = Math.max(...validSets.map(s => s.weight));
            return (
              <div key={h._id} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--border)", fontSize: 13, flexWrap: "wrap", gap: 6 }}>
                <span style={{ color: "var(--text2)" }}>{new Date(h.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                <span style={{ color: "var(--text3)" }}>{validSets.map(s => `${s.weight}×${s.reps}`).join("  ")} <span style={{ color: "var(--orange)", fontWeight: 700 }}>top {maxW}kg</span></span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
