import { useState, useEffect, useMemo } from "react";
import api from "../utils/api";

const buildEmptySets = (count) =>
  Array.from({ length: count }, (_, i) => ({ setNumber: i + 1, weight: "", reps: "" }));

export default function ExerciseCard({ exercise, dayId, date, dayColor }) {
  const baseSetCount = useMemo(() => Math.max(1, Number(exercise.sets) || 3), [exercise.sets]);
  const [open, setOpen] = useState(false);
  const [sets, setSets] = useState(buildEmptySets(baseSetCount));
  const [history, setHistory] = useState([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    setSets(buildEmptySets(baseSetCount));
    setHistory([]);
    setSaved(false);
    setOpen(false);
  }, [exercise.id, baseSetCount]);

  useEffect(() => {
    if (open && history.length === 0) fetchHistory();
  }, [open]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data } = await api.get(`/logs/exercise/${exercise.id}`);
      setHistory(data);
      // Pre-fill today's data if exists
      const today = data.find(d => d.date === date);
      if (today) {
        setSets(today.sets.map((s, i) => ({
          setNumber: i + 1,
          weight: s.weight ?? "",
          reps: s.reps ?? "",
        })));
        setSaved(true);
      }
    } catch { }
    setLoadingHistory(false);
  };

  const handleChange = (idx, field, val) => {
    setSets(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post("/logs", {
        date, dayId, exerciseId: exercise.id,
        sets: sets.map(s => ({
          setNumber: s.setNumber,
          weight: s.weight !== "" ? parseFloat(s.weight) : null,
          reps: s.reps !== "" ? parseInt(s.reps) : null,
        })),
      });
      setSaved(true);
      await fetchHistory();
    } catch { }
    setSaving(false);
  };

  // Compare with last session
  const lastSession = history.find(h => h.date !== date);
  const todayMaxW = Math.max(...sets.map(s => parseFloat(s.weight) || 0));
  const lastMaxW = lastSession ? Math.max(...(lastSession.sets || []).map(s => s.weight || 0)) : 0;
  const isPR = todayMaxW > 0 && lastMaxW > 0 && todayMaxW > lastMaxW;
  const isLogged = sets.some(s => s.weight !== "" || s.reps !== "") && saved;

  return (
    <div style={{
      background: "var(--bg2)", border: `1px solid ${open ? dayColor + "44" : "var(--border)"}`,
      borderRadius: "var(--radius)", overflow: "hidden", transition: "border 0.2s",
    }}>
      {/* Header */}
      <div onClick={() => setOpen(o => !o)} style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 18px", cursor: "pointer",
        background: open ? "var(--bg3)" : "transparent",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{exercise.name}</span>
            {isPR && <span className="tag tag-orange">PR 🏆</span>}
          </div>
          <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 3 }}>{exercise.target}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isLogged && <span style={{ fontSize: 12, color: "var(--green)", fontWeight: 600 }}>✓ Logged</span>}
          <span style={{ color: "var(--text3)", transition: "transform 0.2s", display: "inline-block", transform: open ? "rotate(180deg)" : "none" }}>▾</span>
        </div>
      </div>

      {/* Body */}
      {open && (
        <div style={{ padding: "0 18px 18px" }}>
          {loadingHistory ? (
            <div style={{ color: "var(--text3)", fontSize: 13, padding: "12px 0" }}>Loading...</div>
          ) : (
            <>
              {/* Sets table */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 12 }}>
                  <thead>
                    <tr>
                      {["Set", "Weight (kg)", "Reps", "Last session"].map(h => (
                        <th key={h} style={{ padding: "8px 6px", color: "var(--text3)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: h === "Set" ? "left" : "center", borderBottom: "1px solid var(--border)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sets.map((s, i) => {
                      const prev = lastSession?.sets?.[i];
                      const curW = parseFloat(s.weight) || 0;
                      const prevW = prev?.weight || 0;
                      const diff = curW && prevW ? curW - prevW : null;
                      return (
                        <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "8px 6px", color: "var(--text2)", fontWeight: 700 }}>{i + 1}</td>
                          <td style={{ padding: "6px" }}>
                            <input
                              type="number" min="0" step="0.5" placeholder="kg"
                              value={s.weight}
                              onChange={e => handleChange(i, "weight", e.target.value)}
                              style={{
                                width: "100%", background: "var(--bg3)", border: "1px solid var(--border2)",
                                borderRadius: "var(--radius-sm)", color: "var(--text)", padding: "6px 8px",
                                textAlign: "center", fontSize: 14, fontFamily: "inherit",
                              }}
                            />
                          </td>
                          <td style={{ padding: "6px" }}>
                            <input
                              type="number" min="0" step="1" placeholder="reps"
                              value={s.reps}
                              onChange={e => handleChange(i, "reps", e.target.value)}
                              style={{
                                width: "100%", background: "var(--bg3)", border: "1px solid var(--border2)",
                                borderRadius: "var(--radius-sm)", color: "var(--text)", padding: "6px 8px",
                                textAlign: "center", fontSize: 14, fontFamily: "inherit",
                              }}
                            />
                          </td>
                          <td style={{ padding: "6px", textAlign: "center" }}>
                            {prev ? (
                              <div>
                                <span style={{ color: "var(--text2)" }}>{prev.weight ?? "—"}kg × {prev.reps ?? "—"}</span>
                                {diff !== null && diff !== 0 && (
                                  <span style={{ marginLeft: 6, fontSize: 11, color: diff > 0 ? "var(--green)" : "var(--red)", fontWeight: 700 }}>
                                    {diff > 0 ? "+" : ""}{diff.toFixed(1)}
                                  </span>
                                )}
                              </div>
                            ) : <span style={{ color: "var(--text3)" }}>—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <button className="btn btn-primary" onClick={handleSave} disabled={saving}
                style={{ width: "100%", marginBottom: 16, height: 40, fontSize: 13 }}>
                {saving ? "Saving..." : saved ? "✓ Saved" : "Save sets"}
              </button>

              {/* History */}
              {history.filter(h => h.date !== date).length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Recent history</div>
                  {history.filter(h => h.date !== date).slice(0, 5).map(h => (
                    <div key={h._id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 12 }}>
                      <span style={{ color: "var(--text2)" }}>{h.date}</span>
                      <span style={{ color: "var(--text3)" }}>
                        {h.sets.filter(s => s.weight).map(s => `${s.weight}kg×${s.reps}`).join("  ") || "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
