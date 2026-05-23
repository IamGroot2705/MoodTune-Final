import os, base64, tempfile, httpx, logging, asyncio
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_env = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=_env, override=True)
logger.info(f"Loaded .env from {_env} | exists={_env.exists()}")
logger.info(f"YouTube API key set: {bool(os.getenv('YOUTUBE_API_KEY','').strip())}")

app = FastAPI()
#app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_methods=["*"],
    allow_headers=["*"],
)
# ── DeepFace lazy loader ──────────────────────────────────────────────────────
_deepface = None
def get_deepface():
    global _deepface
    if _deepface is None:
        os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
        os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")
        try:
            from deepface import DeepFace
            _deepface = DeepFace
            logger.info("✅ DeepFace loaded")
        except ImportError as e:
            raise HTTPException(status_code=500, detail=f"DeepFace not installed: {e}")
    return _deepface

# ── Language config ───────────────────────────────────────────────────────────
LANGUAGE_CONFIG = {
    "kannada":  {"label": "ಕನ್ನಡ",  "term": "Kannada songs",    "regionCode": "IN", "relevanceLanguage": "kn"},
    "english":  {"label": "English", "term": "English songs",    "regionCode": "US", "relevanceLanguage": "en"},
    "hindi":    {"label": "हिंदी",   "term": "Hindi songs",      "regionCode": "IN", "relevanceLanguage": "hi"},
    "tamil":    {"label": "தமிழ்",   "term": "Tamil songs",      "regionCode": "IN", "relevanceLanguage": "ta"},
    "telugu":   {"label": "తెలుగు",  "term": "Telugu songs",     "regionCode": "IN", "relevanceLanguage": "te"},
}

# ── Emotion → mood keywords (combined with language term at query time) ───────
MOOD_KEYWORDS = {
    "happy":    "happy feel good upbeat",
    "sad":      "sad emotional heart touching",
    "angry":    "angry intense powerful",
    "surprise": "exciting energetic dance",
    "fear":     "dark suspense thriller",
    "disgust":  "raw gritty rock",
    "neutral":  "chill relaxing melody",
}

MOOD_MAP = {
    "happy":    {"valence": 0.85, "energy": 0.80, "danceability": 0.75},
    "sad":      {"valence": 0.15, "energy": 0.25, "danceability": 0.30},
    "angry":    {"valence": 0.30, "energy": 0.90, "danceability": 0.55},
    "surprise": {"valence": 0.70, "energy": 0.75, "danceability": 0.65},
    "fear":     {"valence": 0.20, "energy": 0.45, "danceability": 0.35},
    "disgust":  {"valence": 0.25, "energy": 0.65, "danceability": 0.45},
    "neutral":  {"valence": 0.55, "energy": 0.55, "danceability": 0.55},
}

EMOTION_LABEL_MAP = {
    "happy": "happy", "sad": "sad", "angry": "angry",
    "surprise": "surprise", "fear": "fear", "disgust": "disgust", "neutral": "neutral",
}

class ImagePayload(BaseModel):
    image: str
    language: str = "kannada"   # default Kannada

# ── DeepFace in thread ────────────────────────────────────────────────────────
def _run_deepface_sync(tmp_path: str) -> dict:
    DeepFace = get_deepface()
    try:
        result = DeepFace.analyze(img_path=tmp_path, actions=["emotion"],
                                  enforce_detection=False, silent=True)
    except TypeError:
        result = DeepFace.analyze(img_path=tmp_path, actions=["emotion"],
                                  enforce_detection=False)
    analysis = result[0] if isinstance(result, list) else result
    return {
        "dominant": analysis.get("dominant_emotion", "neutral").lower(),
        "scores":   analysis.get("emotion", {}),
    }

# ── YouTube search ────────────────────────────────────────────────────────────
async def search_youtube(emotion: str, language: str) -> list:
    api_key = os.getenv("YOUTUBE_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=500,
            detail="YouTube API key missing — add YOUTUBE_API_KEY to backend/.env")

    lang_cfg     = LANGUAGE_CONFIG.get(language, LANGUAGE_CONFIG["kannada"])
    mood_kw      = MOOD_KEYWORDS.get(emotion, MOOD_KEYWORDS["neutral"])
    query        = f"{lang_cfg['term']} {mood_kw}"

    logger.info(f"YouTube query: '{query}' | region: {lang_cfg['regionCode']}")

    params = {
        "part":              "snippet",
        "q":                 query,
        "type":              "video",
        "videoCategoryId":   "10",        # Music
        "maxResults":        5,
        "regionCode":        lang_cfg["regionCode"],
        "relevanceLanguage": lang_cfg["relevanceLanguage"],
        "key":               api_key,
    }

    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get("https://www.googleapis.com/youtube/v3/search", params=params)

    if r.status_code == 403:
        detail = r.json().get("error", {}).get("message", "Forbidden")
        raise HTTPException(status_code=500, detail=f"YouTube API error: {detail}")
    if not r.is_success:
        raise HTTPException(status_code=502, detail=f"YouTube API {r.status_code}: {r.text[:200]}")

    items = r.json().get("items", [])
    return [
        {
            "id":           item["id"]["videoId"],
            "name":         item["snippet"]["title"],
            "artist":       item["snippet"]["channelTitle"],
            "image":        item["snippet"]["thumbnails"].get("medium", {}).get("url")
                            or item["snippet"]["thumbnails"].get("default", {}).get("url"),
            "youtube_url":  f"https://www.youtube.com/watch?v={item['id']['videoId']}",
            "published_at": item["snippet"].get("publishedAt", "")[:10],
        }
        for item in items
    ]

# ── Main endpoint ─────────────────────────────────────────────────────────────
@app.post("/analyze")
async def analyze(payload: ImagePayload):
    raw = payload.image
    if "," in raw:
        raw = raw.split(",", 1)[1]
    try:
        img_bytes = base64.b64decode(raw + "==")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64: {e}")

    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
        f.write(img_bytes)
        tmp_path = f.name

    try:
        loop = asyncio.get_event_loop()
        face = await loop.run_in_executor(None, _run_deepface_sync, tmp_path)
        dominant = face["dominant"]
        logger.info(f"Emotion: {dominant} | lang: {payload.language} | scores: {face['scores']}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"DeepFace error: {e}", exc_info=True)
        raise HTTPException(status_code=422, detail=f"Emotion analysis failed: {e}")
    finally:
        try: os.unlink(tmp_path)
        except: pass

    emotion  = EMOTION_LABEL_MAP.get(dominant, "neutral")
    profile  = MOOD_MAP[emotion]
    language = payload.language.lower() if payload.language.lower() in LANGUAGE_CONFIG else "kannada"
    tracks   = await search_youtube(emotion, language)

    return {
        "emotion":   emotion,
        "raw_emotion": dominant,
        "language":  language,
        "profile":   profile,
        "tracks":    tracks,
    }

# ── Utility ───────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    key = os.getenv("YOUTUBE_API_KEY", "").strip()
    return {
        "status": "ok",
        "youtube_api_key":  "✅ set" if key else "❌ MISSING",
        "supported_languages": list(LANGUAGE_CONFIG.keys()),
    }

@app.get("/")
async def root():
    return {"message": "MoodTune API (YouTube + Language)", "endpoints": ["/health", "/analyze"]}
