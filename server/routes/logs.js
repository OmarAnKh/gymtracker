const router = require("express").Router();
const auth = require("../middleware/auth");
const { WorkoutLog } = require("../models");

// GET /api/logs?days=7  — get recent logs for the user
router.get("/", auth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().slice(0, 10);

    const logs = await WorkoutLog.find({
      user: req.userId,
      date: { $gte: sinceStr },
    }).sort({ date: -1 });

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logs/exercise/:exerciseId  — full history for one exercise
router.get("/exercise/:exerciseId", auth, async (req, res) => {
  try {
    const logs = await WorkoutLog.find({
      user: req.userId,
      exerciseId: req.params.exerciseId,
    })
      .sort({ date: -1 })
      .limit(20);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logs/date/:date  — all exercises logged on a specific date
router.get("/date/:date", auth, async (req, res) => {
  try {
    const logs = await WorkoutLog.find({
      user: req.userId,
      date: req.params.date,
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/logs  — save or update sets for an exercise
router.post("/", auth, async (req, res) => {
  try {
    const { date, dayId, exerciseId, sets, notes } = req.body;
    if (!date || !dayId || !exerciseId || !sets) {
      return res.status(400).json({ error: "date, dayId, exerciseId and sets are required" });
    }

    const log = await WorkoutLog.findOneAndUpdate(
      { user: req.userId, date, exerciseId },
      { $set: { dayId, sets, notes: notes || "" } },
      { upsert: true, new: true }
    );

    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/logs/:id  — delete a log entry
router.delete("/:id", auth, async (req, res) => {
  try {
    const log = await WorkoutLog.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!log) return res.status(404).json({ error: "Log not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logs/stats/summary  — weekly stats
router.get("/stats/summary", auth, async (req, res) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const sinceStr = since.toISOString().slice(0, 10);

    const logs = await WorkoutLog.find({ user: req.userId, date: { $gte: sinceStr } });

    const sessions = new Set(logs.map((l) => l.date)).size;
    const totalSets = logs.reduce((acc, l) => acc + l.sets.filter((s) => s.weight).length, 0);

    // Count PRs: compare max weight this week vs all time before
    let prs = 0;
    const exerciseIds = [...new Set(logs.map((l) => l.exerciseId))];
    for (const exId of exerciseIds) {
      const weekLogs = logs.filter((l) => l.exerciseId === exId);
      const weekMax = Math.max(...weekLogs.flatMap((l) => l.sets.map((s) => s.weight || 0)));
      const allTimeLogs = await WorkoutLog.find({
        user: req.userId,
        exerciseId: exId,
        date: { $lt: sinceStr },
      });
      if (allTimeLogs.length === 0 && weekMax > 0) { prs++; continue; }
      const allTimeMax = Math.max(...allTimeLogs.flatMap((l) => l.sets.map((s) => s.weight || 0)));
      if (weekMax > allTimeMax) prs++;
    }

    res.json({ sessions, totalSets, prs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
