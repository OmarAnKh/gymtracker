const mongoose = require("mongoose");

// ── User ──────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, minlength: 2 },
    password: { type: String, required: true, minlength: 6 },
  },
  { timestamps: true }
);
const User = mongoose.model("User", userSchema);

// ── WorkoutLog ────────────────────────────────────────
// One document per user per day per exercise
const setSchema = new mongoose.Schema(
  {
    setNumber: { type: Number, required: true },
    weight: { type: Number, default: null },  // kg
    reps: { type: Number, default: null },
  },
  { _id: false }
);

const workoutLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true },       // ISO date string "YYYY-MM-DD"
    dayId: { type: String, required: true },       // e.g. "push"
    exerciseId: { type: String, required: true },  // e.g. "smith_bench"
    sets: [setSchema],
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

// Compound index: one log entry per user/date/exercise
workoutLogSchema.index({ user: 1, date: 1, exerciseId: 1 }, { unique: true });

const WorkoutLog = mongoose.model("WorkoutLog", workoutLogSchema);

// ── TrainingRoutine ─────────────────────────────────────
const routineExerciseSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    target: { type: String, default: "" },
    sets: { type: Number, default: 3 },
  },
  { _id: false }
);

const routineDaySchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    name: { type: String, required: true },
    focus: { type: String, default: "" },
    color: { type: String, default: "#FF6B00" },
    exercises: [routineExerciseSchema],
  },
  { _id: false }
);

const routineSnapshotSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    days: { type: [routineDaySchema], default: [] },
  },
  { timestamps: true }
);

const routineSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },
    days: { type: [routineDaySchema], default: [] },
    status: { type: String, enum: ["current", "archived"], default: "current" },
  },
  { timestamps: true }
);

const Routine = mongoose.model("Routine", routineSchema);
const RoutineSnapshot = mongoose.model("RoutineSnapshot", routineSnapshotSchema);

module.exports = { User, WorkoutLog, Routine, RoutineSnapshot };
