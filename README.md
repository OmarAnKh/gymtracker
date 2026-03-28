# 🔥 GymTracker

A full-stack gym tracking web app built with **React + Express + MongoDB (Mongoose)**.

Track your lifts, log sets per exercise, compare against last session, and visualize your strength progress over time.

---

## Tech Stack

| Layer    | Tech                          |
|----------|-------------------------------|
| Frontend | React 18, Vite, React Router, Recharts |
| Backend  | Node.js, Express              |
| Database | MongoDB with Mongoose         |
| Auth     | JWT (30-day tokens) + bcrypt  |

---

## Quick Start

### 1. Clone & install

```bash
git clone <your-repo>
cd gymtracker
npm run install:all
```

### 2. Configure environment

```bash
cd server
cp .env.example .env
```

Open `server/.env` and set your values:

```env
# Local MongoDB
MONGODB_URI=mongodb://localhost:27017/gymtracker

# OR MongoDB Atlas
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/gymtracker

PORT=5000
JWT_SECRET=some_long_random_secret_here
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### 3. Run in development

```bash
# From root — starts both server and client
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

---

## Project Structure

```
gymtracker/
├── package.json            # Root — runs both with concurrently
├── server/
│   ├── index.js            # Express entry point
│   ├── models.js           # Mongoose schemas (User, WorkoutLog)
│   ├── middleware/
│   │   └── auth.js         # JWT middleware
│   ├── routes/
│   │   ├── auth.js         # POST /api/auth/login, /register
│   │   └── logs.js         # CRUD for workout logs + stats
│   ├── .env.example        # Copy to .env and fill in
│   └── package.json
└── client/
    ├── vite.config.js      # Dev proxy to backend
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx          # Router + auth wrapper
        ├── index.css        # Global dark theme
        ├── context/
        │   └── AuthContext.jsx
        ├── components/
        │   ├── Navbar.jsx
        │   ├── ExerciseCard.jsx   # Per-exercise log UI
        │   └── ProtectedRoute.jsx
        ├── pages/
        │   ├── AuthPage.jsx       # Login / Register
        │   ├── TrainPage.jsx      # Daily workout logging
        │   ├── HistoryPage.jsx    # Past sessions
        │   └── ProgressPage.jsx   # Charts per exercise
        │   └── RoutinePage.jsx    # Import/manage routine via CSV
        └── utils/
            ├── api.js             # Axios instance with JWT
            └── workout.js         # Date helpers

---

## Routine Builder (CSV Import)

Users can tailor their split from the **Routine** tab. Upload a CSV where each row is one exercise. Columns:

| Column | Required | Description |
|--------|----------|-------------|
| `day_label` | ✅ | Short label shown in the day selector (e.g. `Day 1`). |
| `day_name` | ✅ | Day title (e.g. `Push`). Used to generate stable IDs. |
| `day_focus` | ⛔ | Optional blurb that appears under the title. |
| `day_color` | ⛔ | Hex color (defaults to orange). |
| `exercise_name` | ✅ | Exercise display name. |
| `exercise_target` | ⛔ | Text such as `4x6-8` shown in the UI. |
| `exercise_sets` | ⛔ | Number of sets (defaults to 3). |

Example CSV:

```
day_label,day_name,day_focus,day_color,exercise_name,exercise_target,exercise_sets
Day 1,Push,Strength,#FF6B00,Smith Machine Bench Press,4x6-8,4
Day 1,Push,Strength,#FF6B00,Incline Dumbbell Press,3x8-10,3
Day 2,Pull,Back + Arms,#3B82F6,Pull-Ups,4x8-10,4
Day 2,Pull,Back + Arms,#3B82F6,Barbell Row,3x8-10,3
```

Routine imports are idempotent—you can re-upload new CSVs anytime without affecting existing logs (their day/exercise IDs remain stored with each entry). Prefer working visually? Open the **Routine** tab and use the inline editor to add/remove days and exercises, then hit “Save routine” to push straight to the API. Clearing the editor and saving gives you an empty routine, while the previous setup moves into the on-page history panel (backed by `/api/routine/history`) so you can restore it later without it counting as your current routine.
```

---

## API Endpoints

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login, returns JWT |

### Logs (all require `Authorization: Bearer <token>`)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/logs?days=7` | Recent logs |
| GET | `/api/logs/date/:date` | Logs for a specific date |
| GET | `/api/logs/exercise/:id` | Full history for one exercise |
| GET | `/api/logs/stats/summary` | Weekly stats (sessions, sets, PRs) |
| POST | `/api/logs` | Save/update sets for an exercise |
| DELETE | `/api/logs/:id` | Delete a log entry |

### Routine (all require `Authorization: Bearer <token>`)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/routine` | Fetch the current routine for the user |
| PUT | `/api/routine` | Replace the routine with JSON payload |
| POST | `/api/routine/import` | Replace the routine by uploading CSV text |
| GET | `/api/routine/history` | Retrieve the most recent routine snapshots |

---

## Production Build

```bash
# Build frontend
npm run build

# Start backend (serves built frontend too if you configure static serving)
npm start
```

To serve the built React app from Express in production, add this to `server/index.js`:

```js
const path = require("path");
app.use(express.static(path.join(__dirname, "../client/dist")));
app.get("*", (_, res) => res.sendFile(path.join(__dirname, "../client/dist/index.html")));
```

---

## MongoDB Atlas (free cloud DB)

1. Go to https://cloud.mongodb.com and create a free account
2. Create a free M0 cluster
3. Go to **Database Access** → add a user with read/write access
4. Go to **Network Access** → allow `0.0.0.0/0` (or your IP)
5. Click **Connect** → **Drivers** → copy the connection string
6. Paste into your `.env` as `MONGODB_URI`

---

## Features

- **Login / Register** with JWT auth (tokens valid 30 days)
- **Routine builder** — import your own split via CSV anytime
- **Sample 5-day split** provided via template (Push, Pull, Legs, Upper, Arms)
- **Per-set logging** — weight (kg) + reps for every set
- **Last session comparison** — see your previous numbers inline while logging
- **PR detection** — automatic badge when you beat your best weight
- **Daily progress bar** — see how many exercises you've logged today
- **Weekly stats** — sessions, total sets, PRs
- **History page** — browse past workouts grouped by date with total volume
- **Progress page** — per-exercise line charts (max weight / volume / avg reps)
