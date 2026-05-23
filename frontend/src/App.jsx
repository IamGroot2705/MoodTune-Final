import React, { useRef, useState, useCallback } from 'react'
import Webcam from 'react-webcam'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'https://moodtune-final.onrender.com'

const EMOTION_META = {
  happy:    { emoji: '😄', label: 'Happy',     color: '#f5d020', desc: 'High energy, uplifting vibes' },
  sad:      { emoji: '😢', label: 'Sad',       color: '#6ec6f5', desc: 'Soft, melancholic tones' },
  angry:    { emoji: '😤', label: 'Angry',     color: '#f25a5a', desc: 'Raw, high-intensity sound' },
  surprise: { emoji: '😲', label: 'Surprised', color: '#c8f25a', desc: 'Electric & unpredictable' },
  fear:     { emoji: '😨', label: 'Fearful',   color: '#9b7fd4', desc: 'Atmospheric & ambient' },
  disgust:  { emoji: '🤢', label: 'Disgusted', color: '#5af2a0', desc: 'Gritty alternative cuts' },
  neutral:  { emoji: '😐', label: 'Neutral',   color: '#aaaacc', desc: 'Balanced, chill picks' },
}

const LANGUAGES = [
  { id: 'kannada', label: 'ಕನ್ನಡ',  sublabel: 'Kannada', initial: 'ಕ', color: '#f97316' },
  { id: 'hindi',   label: 'हिंदी',   sublabel: 'Hindi',   initial: 'ह', color: '#22c55e' },
  { id: 'tamil',   label: 'தமிழ்',   sublabel: 'Tamil',   initial: 'த', color: '#3b82f6' },
  { id: 'telugu',  label: 'తెలుగు',  sublabel: 'Telugu',  initial: 'తె', color: '#a855f7' },
  { id: 'english', label: 'English', sublabel: 'English', initial: 'E',  color: '#94a3b8' },
]

const YouTubeIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
)

const ModeToggle = ({ mode, setMode }) => (
  <div className="flex items-center gap-1 bg-panel border border-border rounded-full p-1">
    {['webcam', 'upload'].map(m => (
      <button key={m} onClick={() => setMode(m)}
        className={`px-4 py-1.5 rounded-full text-sm font-display font-semibold transition-all duration-200 ${
          mode === m ? 'bg-accent text-ink' : 'text-muted hover:text-white'}`}>
        {m === 'webcam' ? '📷 Webcam' : '🖼️ Upload'}
      </button>
    ))}
  </div>
)

const LanguagePicker = ({ selected, onChange }) => (
  <div className="w-full max-w-md">
    <div className="flex items-center gap-2 mb-2.5">
      <span className="text-xs font-display font-semibold text-muted uppercase tracking-widest">
        🎵 Music Language
      </span>
      <span className="text-[10px] text-border bg-panel border border-border px-2 py-0.5 rounded-full">
        default: ಕನ್ನಡ
      </span>
    </div>
    <div className="grid grid-cols-5 gap-2">
      {LANGUAGES.map(lang => (
        <button
          key={lang.id}
          onClick={() => onChange(lang.id)}
          className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl border transition-all duration-200 ${
            selected === lang.id
              ? 'border-accent bg-accent/10 shadow-md shadow-accent/10'
              : 'border-border bg-panel hover:border-accent/40 hover:bg-panel/80'
          }`}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold leading-none"
            style={{
              background: selected === lang.id ? lang.color + '33' : lang.color + '18',
              color: lang.color,
              border: `1.5px solid ${lang.color}${selected === lang.id ? 'aa' : '44'}`,
            }}
          >
            {lang.initial}
          </div>
          <span className={`text-xs font-display font-bold leading-tight text-center ${
            selected === lang.id ? 'text-accent' : 'text-white'}`}>
            {lang.label}
          </span>
          <span className="text-[9px] text-muted leading-none">{lang.sublabel}</span>
          {selected === lang.id && (
            <span className="w-1 h-1 rounded-full bg-accent" />
          )}
        </button>
      ))}
    </div>
  </div>
)

const EmotionBadge = ({ emotion }) => {
  const meta = EMOTION_META[emotion] || EMOTION_META.neutral
  return (
    <div className="flex items-center gap-3 px-5 py-3 rounded-2xl border"
      style={{ borderColor: meta.color + '40', background: meta.color + '12' }}>
      <span className="text-3xl">{meta.emoji}</span>
      <div>
        <div className="font-display font-bold text-lg" style={{ color: meta.color }}>{meta.label}</div>
        <div className="text-xs text-muted">{meta.desc}</div>
      </div>
    </div>
  )
}

const MoodBar = ({ label, value }) => (
  <div className="flex items-center gap-3">
    <span className="text-xs text-muted w-24 shrink-0">{label}</span>
    <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.round(value * 100)}%`, background: 'linear-gradient(90deg,#c8f25a,#f5d020)' }} />
    </div>
    <span className="text-xs text-muted w-8 text-right">{Math.round(value * 100)}%</span>
  </div>
)

const TrackCard = ({ track, index }) => (
  <a href={track.youtube_url} target="_blank" rel="noopener noreferrer"
    className="track-card group flex items-center gap-4 p-3 rounded-2xl border border-border bg-panel hover:border-red-500/40 hover:bg-[#1e1a1a] transition-all duration-200">
    <div className="relative shrink-0">
      <span className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-surface border border-border flex items-center justify-center text-[10px] font-display font-bold text-muted z-10">
        {index + 1}
      </span>
      {track.image
        ? <img src={track.image} alt={track.name} className="w-20 h-14 rounded-xl object-cover" />
        : <div className="w-20 h-14 rounded-xl bg-surface flex items-center justify-center text-2xl">🎵</div>
      }
      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-3 h-3 fill-white ml-0.5"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>
    </div>
    <div className="flex-1 min-w-0">
      <div className="font-display font-semibold text-sm text-white truncate group-hover:text-red-400 transition-colors">
        {track.name}
      </div>
      <div className="text-xs text-muted truncate mt-0.5">{track.artist}</div>
      {track.published_at && (
        <div className="text-[10px] text-border mt-0.5">{track.published_at}</div>
      )}
    </div>
    <div className="shrink-0 text-red-600 opacity-50 group-hover:opacity-100 transition-opacity">
      <YouTubeIcon />
    </div>
  </a>
)

const ScanOverlay = () => (
  <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none z-10">
    <div className="scan-line" />
    <div className="absolute inset-0 border-2 border-accent/30 rounded-2xl" />
    {[['top-2 left-2 border-t-2 border-l-2'],['top-2 right-2 border-t-2 border-r-2'],
      ['bottom-2 left-2 border-b-2 border-l-2'],['bottom-2 right-2 border-b-2 border-r-2']].map(([cls],i) => (
      <div key={i} className={`absolute w-5 h-5 ${cls} border-accent rounded-sm`} />
    ))}
  </div>
)

export default function App() {
  const webcamRef  = useRef(null)
  const fileRef    = useRef(null)
  const [mode,     setMode]     = useState('webcam')
  const [language, setLanguage] = useState('kannada')   // default Kannada
  const [preview,  setPreview]  = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState(null)
  const [error,    setError]    = useState(null)
  const [scanning, setScanning] = useState(false)

  const analyze = useCallback(async (base64) => {
    setLoading(true); setError(null); setResult(null)
    try {
      const { data } = await axios.post(`${API_BASE}/analyze`, { image: base64, language }, { timeout: 60000 })
      setResult(data)
    } catch (e) {
      const status = e.response?.status
      const detail = e.response?.data?.detail
      if (status === 502 || e.code === 'ERR_NETWORK' || e.message?.includes('Network Error')) {
        setError('Backend not reachable. Is uvicorn running on port 8000?')
      } else {
        setError(detail || e.message || 'Analysis failed')
      }
    } finally {
      setLoading(false); setScanning(false)
    }
  }, [language])

  const captureWebcam = useCallback(() => {
    const img = webcamRef.current?.getScreenshot()
    if (!img) return
    setPreview(img); setScanning(true); analyze(img)
  }, [analyze])

  const handleFile = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => { const b64 = ev.target.result; setPreview(b64); setScanning(true); analyze(b64) }
    reader.readAsDataURL(file)
  }, [analyze])

  const reset = () => { setResult(null); setPreview(null); setError(null); setScanning(false) }

  const selectedLang = LANGUAGES.find(l => l.id === language)

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-10 relative">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(ellipse, #c8f25a 0%, transparent 70%)' }} />
      </div>

      <header className="text-center mb-10 relative z-10">
        <div className="inline-flex items-center gap-2 text-xs font-body text-muted border border-border rounded-full px-4 py-1.5 mb-4 bg-panel">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-slow inline-block" />
          AI-Powered Mood Detection
        </div>
        <h1 className="font-display font-extrabold text-5xl md:text-6xl text-white tracking-tight">
          Mood<span className="glow-accent text-accent">Tune</span>
        </h1>
        <p className="font-body text-muted text-sm mt-3 max-w-xs mx-auto leading-relaxed">
          Your face picks the playlist. Show us how you feel.
        </p>
      </header>

      <div className="w-full max-w-4xl relative z-10">
        {!result ? (
          <div className="flex flex-col items-center gap-6">
            <ModeToggle mode={mode} setMode={(m) => { setMode(m); reset() }} />
            <LanguagePicker selected={language} onChange={setLanguage} />

            <div className="w-full max-w-md">
              {mode === 'webcam' ? (
                <div className="relative rounded-2xl overflow-hidden webcam-ring">
                  {scanning && <ScanOverlay />}
                  <Webcam ref={webcamRef} screenshotFormat="image/jpeg"
                    videoConstraints={{ facingMode: 'user', width: 640, height: 480 }}
                    className="w-full rounded-2xl" mirrored />
                  {!scanning && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                      <button onClick={captureWebcam} disabled={loading}
                        className="flex items-center gap-2 px-6 py-3 rounded-full font-display font-bold text-ink bg-accent hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-accent/20 disabled:opacity-50">
                        {loading ? 'Analyzing…' : '⚡ Detect My Mood'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div onClick={() => !loading && fileRef.current?.click()}
                  className="relative w-full h-72 rounded-2xl border-2 border-dashed border-border hover:border-accent/50 bg-panel transition-all cursor-pointer flex flex-col items-center justify-center gap-3 group">
                  {preview
                    ? <img src={preview} alt="preview" className="w-full h-full object-contain rounded-2xl" />
                    : <>
                        <div className="text-4xl group-hover:scale-110 transition-transform">🖼️</div>
                        <p className="font-display font-semibold text-muted text-sm">Click to upload a photo</p>
                        <p className="text-xs text-border">JPG, PNG, WEBP</p>
                      </>
                  }
                  {scanning && <ScanOverlay />}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                </div>
              )}
            </div>

            {loading && (
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-muted font-body">
                  Reading emotions · Fetching {selectedLang?.label} tracks…
                </p>
              </div>
            )}

            {error && (
              <div className="w-full max-w-md px-5 py-3 rounded-xl bg-red-900/20 border border-red-500/30 text-red-400 text-sm font-body text-center">
                ⚠️ {error}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-6 animate-fade-up">
            {/* Left panel */}
            <div className="flex flex-col gap-4 w-full md:w-72 shrink-0">
              {preview && (
                <div className="relative rounded-2xl overflow-hidden webcam-ring">
                  <img src={preview} alt="capture" className="w-full object-cover rounded-2xl" />
                  <div className="absolute top-3 left-3 text-2xl">{EMOTION_META[result.emotion]?.emoji}</div>
                </div>
              )}
              <EmotionBadge emotion={result.emotion} />

              {/* Language used badge */}
              {(() => {
                const lang = LANGUAGES.find(l => l.id === result.language)
                return lang ? (
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-panel border border-border">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: lang.color + '22', color: lang.color, border: `1.5px solid ${lang.color}66` }}
                    >
                      {lang.initial}
                    </div>
                    <div>
                      <div className="text-xs text-muted font-display uppercase tracking-widest">Language</div>
                      <div className="text-sm font-display font-bold text-white">
                        {lang.label} <span className="text-muted font-normal text-xs">({lang.sublabel})</span>
                      </div>
                    </div>
                  </div>
                ) : null
              })()}

              <div className="bg-panel border border-border rounded-2xl p-4 flex flex-col gap-3">
                <div className="text-xs font-display font-semibold text-muted uppercase tracking-widest mb-1">Mood Profile</div>
                <MoodBar label="Valence"      value={result.profile.valence} />
                <MoodBar label="Energy"       value={result.profile.energy} />
                <MoodBar label="Danceability" value={result.profile.danceability} />
              </div>
              <button onClick={reset}
                className="w-full py-2.5 rounded-xl border border-border text-muted hover:text-white hover:border-accent/40 text-sm font-display font-semibold transition-all">
                ↩ Try Again
              </button>
            </div>

            {/* Right: tracks */}
            <div className="flex-1 flex flex-col gap-3">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-display font-bold text-xl text-white">
                  Your Playlist <span className="text-muted text-base font-normal">({result.tracks.length} tracks)</span>
                </h2>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted bg-panel border border-border px-3 py-1 rounded-full">
                  <YouTubeIcon /> YouTube
                </span>
              </div>
              {result.tracks.length === 0 && (
                <div className="text-muted text-sm p-6 text-center border border-border rounded-2xl">
                  No tracks found. Check your YouTube API key.
                </div>
              )}
              {result.tracks.map((track, i) => <TrackCard key={track.id || i} track={track} index={i} />)}
              <p className="text-[11px] text-border text-center mt-1">Click any card to watch on YouTube ↗</p>
            </div>
          </div>
        )}
      </div>

      <footer className="mt-16 text-center text-[11px] text-border font-body relative z-10">
        MoodTune · DeepFace + YouTube Data API v3 · Vite + FastAPI
      </footer>
    </div>
  )
}
