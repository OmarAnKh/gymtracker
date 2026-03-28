import { useState, useEffect, useCallback } from "react";
import api from "../utils/api";
import { useRoutine } from "../context/RoutineContext";

const sampleCsv = `day_label,day_name,day_focus,day_color,exercise_name,exercise_target,exercise_sets
Day 1,Push,Strength,#FF6B00,Smith Machine Bench Press,4x6-8,4
Day 1,Push,Strength,#FF6B00,Incline Dumbbell Press,3x8-10,3
Day 2,Pull,Back + Arms,#3B82F6,Pull-Ups,4x8-10,4
Day 2,Pull,Back + Arms,#3B82F6,Barbell Row,3x8-10,3`;

const DEFAULT_COLOR = "#FF6B00";
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const makeBlankExercise = () => ({ id: `exercise_${uid()}`, name: "", target: "", sets: "3" });
const cloneExercise = (exercise = {}) => ({
    id: exercise.id || `exercise_${uid()}`,
    name: exercise.name || "",
    target: exercise.target || "",
    sets: exercise.sets === 0 || exercise.sets ? String(exercise.sets) : "3",
});
const makeBlankDay = (index = 0) => ({
    id: `day_${uid()}`,
    label: `Day ${index + 1}`,
    name: "",
    focus: "",
    color: DEFAULT_COLOR,
    exercises: [makeBlankExercise()],
});
const cloneDay = (day = {}, index = 0) => ({
    id: day.id || `day_${uid()}`,
    label: day.label || `Day ${index + 1}`,
    name: day.name || "",
    focus: day.focus || "",
    color: day.color || DEFAULT_COLOR,
    exercises: (day.exercises?.length ? day.exercises : [makeBlankExercise()]).map(cloneExercise),
});

export default function RoutinePage() {
    const { days, status, loading, refreshRoutine } = useRoutine();
    const [formDays, setFormDays] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [confirmResetOpen, setConfirmResetOpen] = useState(false);
    const [dragInfo, setDragInfo] = useState(null);
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState("");
    const [deletingSnapshotId, setDeletingSnapshotId] = useState("");

    useEffect(() => {
        if (days.length) {
            setFormDays(days.map((day, idx) => cloneDay(day, idx)));
        } else {
            setFormDays([]);
        }
    }, [days]);

    const fetchHistory = useCallback(async () => {
        setHistoryLoading(true);
        setHistoryError("");
        try {
            const { data } = await api.get("/routine/history");
            setHistory(data.history || []);
        } catch (err) {
            setHistoryError(err.response?.data?.error || "Failed to load history");
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    useEffect(() => { fetchHistory(); }, [fetchHistory]);

    const clearForm = () => {
        setFormDays([]);
        setConfirmResetOpen(false);
        setError("");
        setMessage("Editor cleared. Save to apply the empty routine.");
    };

    const handleFileChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setMessage("");
        setError("");
        try {
            setUploading(true);
            const csvText = await file.text();
            await api.post("/routine/import", { csv: csvText });
            setMessage("Routine updated successfully.");
            await refreshRoutine();
            await fetchHistory();
        } catch (err) {
            setError(err.response?.data?.error || "Failed to import CSV");
        } finally {
            setUploading(false);
            event.target.value = "";
        }
    };

    const copyTemplate = async () => {
        try {
            await navigator.clipboard.writeText(sampleCsv);
            setMessage("Template copied to clipboard.");
            setError("");
        } catch {
            setError("Unable to copy template");
        }
    };

    const updateDayField = (dayId, field, value) => {
        setFormDays((prev) => prev.map((day) => (day.id === dayId ? { ...day, [field]: value } : day)));
    };

    const addDay = () => {
        setFormDays((prev) => [...prev, makeBlankDay(prev.length)]);
    };

    const removeDay = (dayId) => {
        setFormDays((prev) => prev.filter((day) => day.id !== dayId));
    };

    const addExercise = (dayId) => {
        setFormDays((prev) => prev.map((day) => (day.id === dayId ? { ...day, exercises: [...day.exercises, makeBlankExercise()] } : day)));
    };

    const removeExercise = (dayId, exerciseId) => {
        setFormDays((prev) => prev.map((day) => {
            if (day.id !== dayId) return day;
            const filtered = day.exercises.filter((ex) => ex.id !== exerciseId);
            return { ...day, exercises: filtered.length ? filtered : [makeBlankExercise()] };
        }));
    };

    const updateExerciseField = (dayId, exerciseId, field, value) => {
        setFormDays((prev) => prev.map((day) => {
            if (day.id !== dayId) return day;
            return {
                ...day,
                exercises: day.exercises.map((ex) => (ex.id === exerciseId ? { ...ex, [field]: field === "sets" ? value : value } : ex)),
            };
        }));
    };

    const handleSaveInline = async () => {
        setMessage("");
        setError("");
        try {
            setSaving(true);
            const payload = formDays.map((day) => ({
                ...day,
                exercises: day.exercises.map((ex) => ({
                    ...ex,
                    sets: Math.max(1, parseInt(ex.sets || 0, 10) || 1),
                })),
            }));
            const allowEmpty = formDays.length === 0;
            await api.put("/routine", { days: payload, allowEmpty });
            setMessage("Routine saved.");
            await refreshRoutine();
            await fetchHistory();
        } catch (err) {
            setError(err.response?.data?.error || "Failed to save routine");
        } finally {
            setSaving(false);
        }
    };

    const dayErrors = formDays.map((day) => ({
        label: !day.label.trim(),
        name: !day.name.trim(),
        exercises: day.exercises.map((ex) => ({ name: !ex.name.trim() })),
    }));
    const canSaveInline = formDays.length === 0 || (dayErrors.length > 0 && dayErrors.every((err) => !err.label && !err.name && err.exercises.every((ex) => !ex.name)));

    const handleExerciseDragStart = (dayId, exerciseId) => (event) => {
        event.dataTransfer?.setData("text/plain", exerciseId);
        event.dataTransfer?.setDragImage?.(event.currentTarget, 10, 10);
        setDragInfo({ dayId, exerciseId });
    };

    const handleExerciseDragOver = (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    };

    const handleExerciseDrop = (dayId, targetExerciseId = null) => (event) => {
        event.preventDefault();
        if (!dragInfo || dragInfo.dayId !== dayId) return;
        setFormDays((prev) => prev.map((day) => {
            if (day.id !== dayId) return day;
            const exercises = [...day.exercises];
            const fromIndex = exercises.findIndex((ex) => ex.id === dragInfo.exerciseId);
            if (fromIndex === -1) return day;
            const [moved] = exercises.splice(fromIndex, 1);
            let insertIndex;
            if (targetExerciseId) {
                insertIndex = exercises.findIndex((ex) => ex.id === targetExerciseId);
                if (insertIndex === -1) insertIndex = exercises.length;
            } else {
                insertIndex = exercises.length;
            }
            exercises.splice(insertIndex, 0, moved);
            return { ...day, exercises };
        }));
        setDragInfo(null);
    };

    const handleDragEnd = () => setDragInfo(null);

    const handleDeleteSnapshot = async (snapshotId) => {
        if (!snapshotId) return;
        const confirmed = window.confirm("Delete this snapshot? This cannot be undone.");
        if (!confirmed) return;
        setHistoryError("");
        setDeletingSnapshotId(snapshotId);
        try {
            await api.delete(`/routine/history/${snapshotId}`);
            setHistory((prev) => prev.filter((entry) => (entry._id ? entry._id.toString() : "") !== snapshotId));
            await fetchHistory();
        } catch (err) {
            setHistoryError(err.response?.data?.error || "Failed to delete snapshot");
        } finally {
            setDeletingSnapshotId("");
        }
    };

    return (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px" }}>
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 32, fontWeight: 900 }}>Routine Builder</h1>
            <p style={{ color: "var(--text2)", fontSize: 14, marginBottom: 20 }}>
                Import a CSV or edit inline to define your days and exercises. Changes never delete past logs—they only affect future logging layouts.
            </p>
            {status === "archived" && (
                <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: "var(--radius)", background: "var(--bg3)", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 13, color: "var(--text2)" }}>
                        You currently have no active routine. Create one below or load a snapshot from history.
                    </div>
                </div>
            )}

            <div className="card" style={{ marginBottom: 24 }}>
                <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)", marginBottom: 6 }}>CSV format</div>
                    <p style={{ color: "var(--text2)", fontSize: 13, lineHeight: 1.6 }}>
                        Columns: <strong>day_label</strong>, <strong>day_name</strong>, <strong>day_focus</strong>, <strong>day_color</strong>, <strong>exercise_name</strong>, <strong>exercise_target</strong>, <strong>exercise_sets</strong>.<br />
                        Each row represents one exercise. Set counts default to 3 if omitted. Colors accept hex codes (fallback is orange).
                    </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <label className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "100%", height: 44, cursor: uploading ? "not-allowed" : "pointer" }}>
                        {uploading ? "Uploading..." : "Upload CSV"}
                        <input type="file" accept=".csv" onChange={handleFileChange} style={{ display: "none" }} disabled={uploading} />
                    </label>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button className="btn btn-ghost" onClick={copyTemplate} type="button">Copy template</button>
                    </div>
                    <textarea readOnly value={sampleCsv} style={{ width: "100%", minHeight: 120, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--text2)", fontSize: 12, fontFamily: "monospace", padding: 12 }} />
                    {message && <div style={{ color: "var(--green)", fontSize: 13 }}>{message}</div>}
                    {error && <div style={{ color: "var(--red)", fontSize: 13 }}>{error}</div>}
                </div>
            </div>

            {loading ? (
                <div style={{ color: "var(--text3)", textAlign: "center", padding: 40 }}>Loading routine…</div>
            ) : (
                <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text3)" }}>Inline editor</div>
                            <p style={{ color: "var(--text2)", fontSize: 13, marginTop: 4 }}>Add or tweak days directly below. Save to apply instantly.</p>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button className="btn btn-ghost" type="button" onClick={() => setConfirmResetOpen(true)} disabled={saving}>Reset</button>
                            <button className="btn btn-primary" type="button" onClick={handleSaveInline} disabled={saving || !canSaveInline}>
                                {saving ? "Saving..." : "Save routine"}
                            </button>
                        </div>
                    </div>

                    {formDays.length === 0 ? (
                        <div style={{ textAlign: "center", padding: 40, border: "1px dashed var(--border)", borderRadius: "var(--radius)" }}>
                            <div style={{ fontSize: 32, marginBottom: 12 }}>🗂️</div>
                            <p style={{ color: "var(--text2)", marginBottom: 16 }}>No days yet. Start by adding one below.</p>
                            <button className="btn btn-primary" type="button" onClick={addDay}>Add first day</button>
                        </div>
                    ) : (
                        formDays.map((day, dayIndex) => (
                            <div key={day.id} style={{ border: `1px solid var(--border)`, borderRadius: "var(--radius)", padding: 16, background: "var(--bg2)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                                    <div style={{ flex: 1, minWidth: 220, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                                        <div>
                                            <label style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Day label*</label>
                                            <input
                                                className="input"
                                                value={day.label}
                                                onChange={(e) => updateDayField(day.id, "label", e.target.value)}
                                                style={{ borderColor: dayErrors[dayIndex]?.label ? "var(--red)" : undefined }}
                                                placeholder="Day 1"
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Day name*</label>
                                            <input
                                                className="input"
                                                value={day.name}
                                                onChange={(e) => updateDayField(day.id, "name", e.target.value)}
                                                style={{ borderColor: dayErrors[dayIndex]?.name ? "var(--red)" : undefined }}
                                                placeholder="Push"
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Focus</label>
                                            <input
                                                className="input"
                                                value={day.focus}
                                                onChange={(e) => updateDayField(day.id, "focus", e.target.value)}
                                                placeholder="Strength"
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Color</label>
                                            <input
                                                type="color"
                                                value={day.color || DEFAULT_COLOR}
                                                onChange={(e) => updateDayField(day.id, "color", e.target.value)}
                                                style={{ width: "100%", height: 40, borderRadius: "var(--radius)", border: "1px solid var(--border)" }}
                                            />
                                        </div>
                                    </div>
                                    <button className="btn btn-ghost" type="button" onClick={() => removeDay(day.id)} disabled={formDays.length === 1}>
                                        Remove day
                                    </button>
                                </div>

                                <div style={{ marginTop: 14 }}>
                                    <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Exercises</div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                        {day.exercises.map((ex, exIndex) => (
                                            <div
                                                key={ex.id}
                                                draggable
                                                onDragStart={handleExerciseDragStart(day.id, ex.id)}
                                                onDragEnd={handleDragEnd}
                                                onDragOver={handleExerciseDragOver}
                                                onDrop={handleExerciseDrop(day.id, ex.id)}
                                                style={{
                                                    display: "grid",
                                                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                                                    gap: 10,
                                                    alignItems: "center",
                                                    padding: 6,
                                                    border: dragInfo?.exerciseId === ex.id ? "1px dashed var(--orange)" : "1px solid transparent",
                                                    borderRadius: "var(--radius-sm)",
                                                    background: dragInfo?.exerciseId === ex.id ? "var(--bg3)" : "transparent",
                                                }}
                                            >
                                                <input
                                                    className="input"
                                                    placeholder="Exercise name*"
                                                    value={ex.name}
                                                    onChange={(e) => updateExerciseField(day.id, ex.id, "name", e.target.value)}
                                                    style={{ borderColor: dayErrors[dayIndex]?.exercises[exIndex]?.name ? "var(--red)" : undefined }}
                                                />
                                                <input
                                                    className="input"
                                                    placeholder="Target (e.g. 4x8)"
                                                    value={ex.target}
                                                    onChange={(e) => updateExerciseField(day.id, ex.id, "target", e.target.value)}
                                                />
                                                <input
                                                    type="number"
                                                    min="1"
                                                    className="input"
                                                    placeholder="Sets"
                                                    value={ex.sets}
                                                    onChange={(e) => updateExerciseField(day.id, ex.id, "sets", e.target.value)}
                                                />
                                                <button
                                                    className="btn btn-ghost"
                                                    type="button"
                                                    onClick={() => removeExercise(day.id, ex.id)}
                                                    disabled={day.exercises.length === 1}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <div
                                        onDragOver={handleExerciseDragOver}
                                        onDrop={handleExerciseDrop(day.id, null)}
                                        style={{ marginTop: 6, fontSize: 12, color: "var(--text3)", textAlign: "center", border: "1px dashed var(--border)", borderRadius: "var(--radius-sm)", padding: "6px 8px" }}
                                    >
                                        Drag here to move to bottom
                                    </div>
                                    <button className="btn btn-ghost" type="button" style={{ marginTop: 10 }} onClick={() => addExercise(day.id)}>
                                        + Add exercise
                                    </button>
                                </div>
                            </div>
                        ))
                    )}

                    {formDays.length > 0 && (
                        <button className="btn btn-primary" type="button" onClick={addDay} style={{ alignSelf: "flex-start" }}>
                            + Add another day
                        </button>
                    )}
                </div>
            )}

            <div className="card" style={{ marginTop: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                    <div>
                        <div style={{ fontSize: 12, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text3)", fontWeight: 700 }}>Routine history</div>
                        <p style={{ color: "var(--text2)", fontSize: 13, marginTop: 4 }}>Snapshots are captured whenever you save a non-empty routine. Restore any previous setup back into the editor.</p>
                    </div>
                    <button className="btn btn-ghost" type="button" onClick={fetchHistory} disabled={historyLoading}>Refresh</button>
                </div>
                {historyError && <div style={{ color: "var(--red)", fontSize: 13, marginTop: 10 }}>{historyError}</div>}
                {historyLoading ? (
                    <div style={{ color: "var(--text3)", textAlign: "center", padding: 30 }}>Loading snapshots…</div>
                ) : history.length === 0 ? (
                    <div style={{ textAlign: "center", padding: 30, color: "var(--text2)" }}>No history yet. Save at least one routine to create a snapshot.</div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
                        {history.map((entry, idx) => {
                            const savedAt = entry.createdAt ? new Date(entry.createdAt) : entry.savedAt ? new Date(entry.savedAt) : null;
                            return (
                                <div key={`${entry._id || idx}`} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 14 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>Snapshot from {savedAt ? savedAt.toLocaleString() : "Unknown date"}</div>
                                            <div style={{ fontSize: 12, color: "var(--text3)" }}>{entry.days.length} day(s)</div>
                                        </div>
                                        <div style={{ display: "flex", gap: 8 }}>
                                            <button className="btn btn-primary" type="button" onClick={() => setFormDays(entry.days.map((day, i) => cloneDay(day, i)))}>
                                                Load into editor
                                            </button>
                                            <button
                                                className="btn btn-ghost"
                                                type="button"
                                                onClick={() => handleDeleteSnapshot(entry._id)}
                                                disabled={!entry._id || deletingSnapshotId === entry._id}
                                            >
                                                {deletingSnapshotId === entry._id ? "Deleting…" : "Delete"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {confirmResetOpen && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div className="card" style={{ maxWidth: 420, width: "90%", padding: 24 }}>
                        <h2 style={{ fontSize: 20, marginBottom: 10 }}>Reset routine?</h2>
                        <p style={{ color: "var(--text2)", fontSize: 14, marginBottom: 20 }}>
                            Clearing the editor removes all days locally. Save afterwards to set your current routine to empty. Previous routines stay available in the history panel.
                        </p>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                            <button className="btn btn-ghost" type="button" onClick={() => setConfirmResetOpen(false)}>Cancel</button>
                            <button className="btn btn-primary" type="button" onClick={clearForm}>Yes, reset</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
