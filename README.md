# 🎵 MoodTune — Mood-Based Song Recommender

Detects your facial emotion via webcam or photo upload, maps it to a Spotify audio profile, and surfaces 5 matching tracks — all in real time.

---

## Stack
| Layer     | Tech                                  |
|-----------|---------------------------------------|
| Frontend  | Vite + React 18, Tailwind CSS         |
| Backend   | FastAPI (async), Uvicorn              |
| AI/ML     | DeepFace (local, no API key needed)   |
| Music     | Spotify Web API (Recommendations)    |

---

## Prerequisites

| Tool        | Version   |
|-------------|-----------|
| Node.js     | ≥ 18      |
| Python      | ≥ 3.10    |
| pip         | latest    |

---

## 1. Spotify API Setup

1. Go to https://developer.spotify.com/dashboard
2. Click **Create App**
3. Name it anything (e.g. *MoodTune*)
4. Set Redirect URI to `http://localhost:5173` (required by Spotify, unused here)
5. Copy your **Client ID** and **Client Secret**
6. In `backend/`, copy `.env.example` → `.env` and paste your credentials:

```
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
```

---

## 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment (recommended)
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# On first run, DeepFace will auto-download face weights (~600 MB)

# Start the server
uvicorn main:app --reload --port 8000
```

Backend runs at: http://localhost:8000  
Health check: http://localhost:8000/health

> **Note on DeepFace weights**: The first analysis request triggers a one-time model download (VGG-Face / OpenFace weights). Subsequent runs are fast.

---

## 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at: http://localhost:5173

> The Vite dev server proxies `/analyze` and `/health` to `http://localhost:8000` automatically. No CORS issues.

---

## 4. Usage

1. Open http://localhost:5173
2. Allow webcam access when prompted
3. Click **⚡ Detect My Mood** (or switch to Upload mode and pick a photo)
4. Wait ~3–5 seconds for DeepFace emotion analysis
5. View your mood profile + 5 Spotify tracks
6. Click any track card to open it in Spotify

---

## Emotion → Spotify Mapping

| Emotion  | Valence | Energy | Danceability | Seed Genres        |
|----------|---------|--------|-------------|---------------------|
| Happy    | 0.85    | 0.80   | 0.75        | pop, dance          |
| Sad      | 0.15    | 0.25   | 0.30        | acoustic, sad       |
| Angry    | 0.30    | 0.90   | 0.55        | metal, rock         |
| Surprise | 0.70    | 0.75   | 0.65        | electronic, pop     |
| Fear     | 0.20    | 0.45   | 0.35        | ambient, classical  |
| Disgust  | 0.25    | 0.65   | 0.45        | alternative, rock   |
| Neutral  | 0.55    | 0.55   | 0.55        | pop, indie          |

---

## Project Structure

```
mood-music/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── requirements.txt
│   ├── .env.example
│   └── .env                 # ← YOU CREATE THIS
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx
        └── index.css
```

---

## Troubleshooting

| Problem | Fix |
|--------|-----|
| `No face detected` | Ensure good lighting; use `enforce_detection=False` (already set) |
| `Spotify 401` | Check `.env` credentials; ensure no extra spaces |
| `Spotify 400 / no tracks` | Seed genres may not match; try changing `genres` in `MOOD_MAP` |
| Webcam black screen | Use HTTPS or localhost (browser security requirement) |
| DeepFace install fails on Windows | Install Visual C++ Build Tools first |
| Python `tf-keras` error | Run `pip install tf-keras` separately |

---

## Build for Production

```bash
# Frontend
cd frontend && npm run build   # Output: frontend/dist/

# Backend — serve with gunicorn
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

---

*MoodTune © 2024 — DeepFace + Spotify Web API + Vite + FastAPI*
