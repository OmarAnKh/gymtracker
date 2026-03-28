import { useState, useEffect, useMemo } from "react";
import api from "../utils/api";
import { useRoutine } from "../context/RoutineContext";

export default function HistoryPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState(14);
  const { days: routineDays } = useRoutine();

  const dayMap = useMemo(() => {
    const map = {};
    routineDays.forEach((day) => {
      map[day.id] = day;
    });
    return map;
  }, [routineDays]);

  const exerciseMap = useMemo(() => {
    const map = {};
    routineDays.forEach((day) => {
      day.exercises.forEach((ex) => {
        map[ex.id] = { ...ex, dayName: day.name, dayColor: day.color };
      });
    });
    return map;
  }, [routineDays]);

  useEffect(() => { fetchLogs(); }, [rangeDays]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/logs?days=${rangeDays}`);
      setLogs(data);
    } catch { }
    setLoading(false);
  };

  // Group by date
  const byDate = {};
  logs.forEach(l => {
    if (!byDate[l.date]) byDate[l.date] = [];
    byDate[l.date].push(l);
  });
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 32, fontWeight: 900 }}>WORKOUT HISTORY</h1>
          <p style={{ color: "var(--text2)", fontSize: 14, marginTop: 4 }}>{logs.length} entries across {sortedDates.length} sessions</p>
        </div>
        <select
          value={rangeDays}
          onChange={e => setRangeDays(Number(e.target.value))}
          style={{
            background: "var(--bg3)", border: "1px solid var(--border2)", color: "var(--text)",
            padding: "8px 14px", borderRadius: "var(--radius-sm)", fontSize: 13, fontFamily: "inherit", cursor: "pointer"
          }}
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {loading ? (
        <div style={{ color: "var(--text3)", textAlign: "center", padding: 60 }}>Loading...</div>
      ) : sortedDates.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <div style={{ color: "var(--text2)" }}>No workouts logged in this period</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {sortedDates.map(date => {
            const dayLogs = byDate[date];
            const dayIds = [...new Set(dayLogs.map(l => l.dayId))];
            const dayDef = dayMap[dayIds[0]];
            const totalSets = dayLogs.reduce((a, l) => a + l.sets.filter(s => s.weight).length, 0);
            const totalVol = dayLogs.reduce((a, l) => a + l.sets.reduce((b, s) => b + ((s.weight || 0) * (s.reps || 0)), 0), 0);

            return (
              <div key={date} className="card" style={{ padding: 0, overflow: "hidden" }}>
                {/* Session header */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 20px", flexWrap: "wrap", gap: 8,
                  borderBottom: "1px solid var(--border)",
                  borderLeft: `3px solid ${dayDef?.color || "var(--orange)"}`,
                }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>
                      {new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                    </span>
                    <span style={{ marginLeft: 10, fontSize: 12, color: dayDef?.color || "var(--orange)", fontWeight: 600, textTransform: "uppercase" }}>
                      {dayDef?.name || dayIds[0]}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text2)" }}>
                    <span>{totalSets} sets</span>
                    <span>{Math.round(totalVol).toLocaleString()} kg total volume</span>
                  </div>
                </div>

                {/* Exercise rows */}
                <div style={{ padding: "8px 0" }}>
                  {dayLogs.map(log => {
                    const ex = exerciseMap[log.exerciseId];
                    const validSets = log.sets.filter(s => s.weight);
                    if (!validSets.length) return null;
                    const maxW = Math.max(...validSets.map(s => s.weight));
                    return (
                      <div key={log._id} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "9px 20px", borderBottom: "1px solid var(--border)", flexWrap: "wrap", gap: 6
                      }}>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{ex?.name || log.exerciseId}</span>
                        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                          <span style={{ fontSize: 12, color: "var(--text3)" }}>
                            {validSets.map(s => `${s.weight}×${s.reps}`).join("  ")}
                          </span>
                          <span style={{ fontSize: 11, color: "var(--text3)", background: "var(--bg4)", padding: "2px 8px", borderRadius: 4 }}>
                            top {maxW} kg
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
