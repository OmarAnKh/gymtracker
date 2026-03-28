const router = require("express").Router();
const { parse } = require("csv-parse/sync");
const auth = require("../middleware/auth");
const { Routine, RoutineSnapshot } = require("../models");

const DEFAULT_COLOR = "#FF6B00";

const slugify = (value) =>
    value
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 60) || "item";

const normalizeRow = (row) => {
    const normalized = {};
    for (const [key, val] of Object.entries(row)) {
        if (!key) continue;
        normalized[key.trim().toLowerCase()] = typeof val === "string" ? val.trim() : val;
    }
    const dayName = normalized.day_name || normalized.day || normalized.name;
    const dayLabel = normalized.day_label || normalized.label || dayName || "Day";
    const focus = normalized.day_focus || normalized.focus || "";
    const color = normalized.day_color || normalized.color || DEFAULT_COLOR;
    const exerciseName = normalized.exercise_name || normalized.exercise;
    if (!dayName && !dayLabel) throw new Error("Each row must include a day name or label");
    if (!exerciseName) throw new Error("Each row must include an exercise name");
    const exerciseTarget = normalized.exercise_target || normalized.target || "";
    const setsRaw = normalized.exercise_sets || normalized.sets || "3";
    const sets = Math.max(1, parseInt(setsRaw, 10));
    if (!Number.isFinite(sets)) throw new Error("Exercise sets must be a number");

    return {
        dayName: dayName || dayLabel,
        dayLabel: dayLabel || dayName || "Day",
        focus,
        color: color || DEFAULT_COLOR,
        exerciseName,
        exerciseTarget,
        exerciseSets: sets,
    };
};

const normalizeColor = (color) => {
    if (typeof color !== "string") return DEFAULT_COLOR;
    const value = color.trim();
    if (!value) return DEFAULT_COLOR;
    const hex = value.startsWith("#") ? value : `#${value}`;
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return hex.toUpperCase();
    return DEFAULT_COLOR;
};

const sanitizeDaysPayload = (days, { allowEmpty = false } = {}) => {
    if (!Array.isArray(days) || days.length === 0) {
        if (allowEmpty) return [];
        throw new Error("Provide at least one day with exercises");
    }

    const dayIds = new Set();

    return days.map((day, dayIndex) => {
        const label = (day?.label || day?.name || `Day ${dayIndex + 1}`).toString().trim();
        const name = (day?.name || label).toString().trim();
        if (!label || !name) {
            throw new Error("Each day must include a label and name");
        }

        let dayId = typeof day?.id === "string" && day.id.trim() ? slugify(day.id) : slugify(name) || `day_${dayIndex + 1}`;
        let suffix = 1;
        while (dayIds.has(dayId)) {
            dayId = `${dayId}_${suffix++}`;
        }
        dayIds.add(dayId);

        if (!Array.isArray(day?.exercises) || day.exercises.length === 0) {
            throw new Error(`Day "${name}" must include at least one exercise`);
        }

        const exerciseIds = new Set();
        const exercises = day.exercises.map((exercise, exIndex) => {
            const exerciseName = (exercise?.name || "").toString().trim();
            if (!exerciseName) {
                throw new Error(`Exercise #${exIndex + 1} in day "${name}" is missing a name`);
            }

            let exerciseId;
            if (typeof exercise?.id === "string" && exercise.id.trim()) {
                exerciseId = slugify(exercise.id);
            } else {
                const exerciseSlugBase = `${dayId}_${slugify(exerciseName)}` || `${dayId}_exercise_${exIndex + 1}`;
                exerciseId = exerciseSlugBase;
            }
            let counter = 1;
            while (exerciseIds.has(exerciseId)) {
                exerciseId = `${exerciseId}_${counter++}`;
            }
            exerciseIds.add(exerciseId);

            const sets = Math.max(1, parseInt(exercise?.sets ?? 3, 10) || 1);

            return {
                id: exerciseId,
                name: exerciseName,
                target: (exercise?.target || "").toString(),
                sets,
            };
        });

        return {
            id: dayId,
            label,
            name,
            focus: (day?.focus || "").toString(),
            color: normalizeColor(day?.color),
            exercises,
        };
    });
};

router.get("/", auth, async (req, res) => {
    const routine = await Routine.findOne({ user: req.userId });
    if (!routine) {
        return res.json({ days: [], status: "archived" });
    }
    const payload = routine.status === "current" ? routine : { ...routine.toObject(), days: [] };
    res.json(payload);
});

router.get("/history", auth, async (req, res) => {
    const history = await RoutineSnapshot.find({ user: req.userId }).sort({ createdAt: -1 }).limit(10);
    res.json({ history });
});

router.delete("/history/:snapshotId", auth, async (req, res) => {
    try {
        const deleted = await RoutineSnapshot.findOneAndDelete({ _id: req.params.snapshotId, user: req.userId });
        if (!deleted) {
            return res.status(404).json({ error: "Snapshot not found" });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: "Unable to delete snapshot" });
    }
});

const archiveCurrentRoutine = async (userId) => {
    const current = await Routine.findOne({ user: userId, status: "current" });
    if (current && current.days.length) {
        await RoutineSnapshot.create({ user: userId, days: current.days });
        current.days = [];
        current.status = "archived";
        await current.save();
    }
};

router.post("/import", auth, async (req, res) => {
    const { csv } = req.body;
    if (!csv || !csv.trim()) {
        return res.status(400).json({ error: "CSV data is required" });
    }

    let records;
    try {
        records = parse(csv, { columns: true, skip_empty_lines: true, trim: true });
    } catch (err) {
        return res.status(400).json({ error: `Invalid CSV: ${err.message}` });
    }

    if (!records.length) {
        return res.status(400).json({ error: "CSV has no rows" });
    }

    const daysMap = new Map();
    let dayOrder = 0;

    try {
        records.forEach((row) => {
            const { dayName, dayLabel, focus, color, exerciseName, exerciseTarget, exerciseSets } = normalizeRow(row);
            const daySlug = slugify(dayName || dayLabel);
            const groupingKey = `${daySlug}|${dayLabel.toLowerCase()}`;
            if (!daysMap.has(groupingKey)) {
                daysMap.set(groupingKey, {
                    id: daySlug,
                    label: dayLabel,
                    name: dayName,
                    focus,
                    color,
                    exercises: [],
                    _order: dayOrder++,
                });
            }
            const day = daysMap.get(groupingKey);
            const exerciseSlugBase = `${day.id}_${slugify(exerciseName)}`;
            let exerciseId = exerciseSlugBase || `${day.id}_exercise_${day.exercises.length + 1}`;
            let counter = 1;
            while (day.exercises.some((ex) => ex.id === exerciseId)) {
                exerciseId = `${exerciseSlugBase}_${counter++}`;
            }
            day.exercises.push({
                id: exerciseId,
                name: exerciseName,
                target: exerciseTarget,
                sets: exerciseSets,
            });
        });
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }

    const days = Array.from(daysMap.values())
        .sort((a, b) => a._order - b._order)
        .map(({ _order, ...rest }) => rest);

    await archiveCurrentRoutine(req.userId);

    const routine = await Routine.findOneAndUpdate(
        { user: req.userId },
        { $set: { days, status: days.length ? "current" : "archived" } },
        { new: true, upsert: true }
    );

    res.json(routine);
});

router.put("/", auth, async (req, res) => {
    try {
        const allowEmpty = Boolean(req.body?.allowEmpty);
        const sanitizedDays = sanitizeDaysPayload(req.body?.days, { allowEmpty });
        await archiveCurrentRoutine(req.userId);
        const routine = await Routine.findOneAndUpdate(
            { user: req.userId },
            { $set: { days: sanitizedDays, status: sanitizedDays.length ? "current" : "archived" } },
            { new: true, upsert: true }
        );
        res.json(routine);
    } catch (err) {
        res.status(400).json({ error: err.message || "Invalid routine payload" });
    }
});

module.exports = router;
