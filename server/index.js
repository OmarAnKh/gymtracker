require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const logsRoutes = require("./routes/logs");
const routineRoutes = require("./routes/routine");

const app = express();

// ── Middleware ────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL,
  /\.pages\.dev$/,
  /localhost/,
  "https://gymtracker-5ef.pages.dev",
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      const isAllowed =
        !origin ||
        allowedOrigins.some((pattern) =>
          typeof pattern === "string" ? pattern === origin : pattern.test(origin)
        );

      return isAllowed ? callback(null, true) : callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json());

// ── Routes ────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/logs", logsRoutes);
app.use("/api/routine", routineRoutes);

app.get("/api/health", (_, res) => res.json({ status: "ok" }));

// ── MongoDB ───────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/gymtracker";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅  MongoDB connected");
    app.listen(PORT, () => console.log(`🚀  Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("❌  MongoDB connection failed:", err.message);
    process.exit(1);
  });
