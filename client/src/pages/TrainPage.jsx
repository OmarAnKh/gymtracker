import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { todayKey } from "../utils/workout";
import ExerciseCard from "../components/ExerciseCard";
import api from "../utils/api";
import { useRoutine } from "../context/RoutineContext";

export default function TrainPage() {
  const [activeDay, setActiveDay] = useState(0);
  const [stats, setStats] = useState({ sessions: 0, totalSets: 0, prs: 0 });
  const [todayLogs, setTodayLogs] = useState([]);
  const { days, loading: routineLoading } = useRoutine();
  const date = todayKey();

  useEffect(() => {
    fetchStats();
    fetchTodayLogs();
  }, []);

  useEffect(() => {
    if (days.length === 0) {
      if (activeDay !== 0) setActiveDay(0);
    } else if (activeDay >= days.length) {
      setActiveDay(0);
    }
  }, [days, activeDay]);

  const fetchStats = async () => {
    try {
      const { data } = await api.get("/logs/stats/summary");
      setStats(data);
    } catch { }
  };

  const fetchTodayLogs = async () => {
    try {
      const { data } = await api.get(`/logs/date/${date}`);
      setTodayLogs(data);
    } catch { }
  };

  const day = days[activeDay];
  const loggedExIds = new Set(todayLogs.map(l => l.exerciseId));
  const dayLoggedCount = day ? day.exercises.filter(e => loggedExIds.has(e.id)).length : 0;
  const progressPct = day ? Math.round((dayLoggedCount / day.exercises.length) * 100) : 0;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px" }}>
      {routineLoading ? (
        <div style={{ color: "var(--text3)", textAlign: "center", padding: 60 }}>Loading routine…</div>
      ) : days.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🛠️</div>
          <p style={{ color: "var(--text2)", marginBottom: 12 }}>You need a routine before logging workouts.</p>
          <Link to="/routine" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "10px 18px" }}>
            Go to Routine Builder
          </Link>
        </div>
      ) : (
        <>

          {/* Stats bar */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
            {[
              { label: "Sessions this week", value: stats.sessions, sub: days.length ? `of ${days.length} days` : "sessions" },
              { label: "Total sets logged", value: stats.totalSets, sub: "this week" },
              { label: "PRs this week", value: stats.prs, sub: "personal records" },
            ].map(s => (
              <div key={s.label} className="card" style={{ padding: "16px 18px" }}>
                <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 28, fontWeight: 900, fontFamily: "'Barlow Condensed', sans-serif", color: "var(--text)" }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Day selector */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {days.map((d, i) => (
              <button key={d.id} onClick={() => setActiveDay(i)} style={{
                padding: "8px 16px", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 600,
                fontFamily: "inherit", cursor: "pointer", transition: "all 0.15s",
                background: activeDay === i ? d.color : "var(--bg3)",
                color: activeDay === i ? "#fff" : "var(--text2)",
                border: activeDay === i ? "none" : "1px solid var(--border)",
              }}>
                {d.label}: {d.name}
              </button>
            ))}
          </div>

          {/* Day header */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div>
                <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 900, color: day.color }}>
                  {day.name.toUpperCase()}
                </h2>
                <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 2 }}>{day.focus}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, color: "var(--text2)" }}>{dayLoggedCount} / {day.exercises.length} exercises logged today</div>
                <div style={{ marginTop: 6, height: 4, width: 160, background: "var(--bg4)", borderRadius: 2 }}>
                  <div style={{ height: "100%", width: `${progressPct}%`, background: day.color, borderRadius: 2, transition: "width 0.4s" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Exercises */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {day.exercises.map(ex => (
              <ExerciseCard key={ex.id} exercise={ex} dayId={day.id} date={date} dayColor={day.color} />
            ))}
          </div>

          {/* Date indicator */}
          <div style={{ marginTop: 24, textAlign: "center", fontSize: 12, color: "var(--text3)" }}>
            Logging for {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
        </>
      )}
    </div>
  );
}
