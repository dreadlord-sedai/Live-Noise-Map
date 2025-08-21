import { useEffect, useMemo, useRef, useState } from 'react';
import MapView from './components/MapView.jsx';
import NoiseCapture from './features/NoiseCapture.jsx';
import { addNoiseSample, subscribeToSamples, subscribeToRtdbReports } from './features/HeatmapData.ts';
import { generateMockSamples, nudgeSamples } from './mock/data.ts';
import { getDb, getRealtimeDb } from './lib/firebase.ts';

function clamp01(x) { return Math.max(0, Math.min(1, x)); }

function scaleDbToIntensity(db) {
  const minDb = 45;
  const maxDb = 72;
  if (db <= minDb) return 0.35;
  if (db >= maxDb) return 1.0;
  const t = (db - minDb) / (maxDb - minDb);
  return clamp01(0.35 + Math.pow(t, 1.05) * 0.65);
}

const Pill = ({ active, children, onClick, title }) => (
  <button
    title={title}
    onClick={onClick}
    className={`px-4 py-2 rounded-full text-sm font-medium transition shadow-sm border ${
      active
        ? 'bg-indigo-600 text-white border-indigo-500'
        : 'bg-[var(--surface)] text-[var(--text)]/80 hover:bg-slate-50 border-[var(--border)]'
    }`}
  >
    {children}
  </button>
);

function App() {
  const [samples, setSamples] = useState([]);
  const [range, setRange] = useState('all');
  const [mode, setMode] = useState('auto'); // 'auto' | 'live' | 'mock' | 'rtdb'
  const [theme, setTheme] = useState('light'); // 'light' | 'dark'
  const mockRef = useRef({ enabled: false, timer: 0, data: [] });

  useEffect(() => {
    // Apply theme class to <html> for CSS variables
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('theme-dark');
    else root.classList.remove('theme-dark');
  }, [theme]);

  useEffect(() => {
    setSamples([]);

    const db = getDb();
    const rtdb = getRealtimeDb();
    const useLive = mode === 'live' || (mode === 'auto' && !!db);

    if (mode === 'rtdb' && rtdb) {
      const unsub = subscribeToRtdbReports(setSamples);
      return () => unsub();
    }

    if (useLive && db) {
      mockRef.current.enabled = false;
      const unsub = subscribeToSamples(setSamples, range);
      return () => unsub();
    }

    // Mock mode
    mockRef.current.enabled = true;
    mockRef.current.data = generateMockSamples(1800);
    setSamples(mockRef.current.data);

    const tick = () => {
      mockRef.current.data = nudgeSamples(mockRef.current.data, 0.22);
      setSamples(mockRef.current.data);
      mockRef.current.timer = setTimeout(tick, 900);
    };
    tick();

    return () => clearTimeout(mockRef.current.timer);
  }, [range, mode]);

  const heatData = useMemo(() => {
    return samples.map((s) => ({
      lat: s.lat,
      lon: s.lon,
      intensity: scaleDbToIntensity(s.dB),
    }));
  }, [samples]);

  const dbAvailable = !!getDb();
  const liveActive = mode === 'live' || (mode === 'auto' && dbAvailable);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0 }}>
        <MapView heatData={heatData} />
      </div>

      <header className="px-5 py-4 backdrop-blur border-b" style={{ position: 'relative', zIndex: 20, background: 'var(--surface-veil)', borderColor: 'var(--border)', color: 'var(--text)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-indigo-600 grid place-items-center text-white">🌐</div>
            <h1 className="text-xl font-semibold">Live Noise Map</h1>
          </div>
          <div className="flex items-center gap-2 rounded-full p-1 shadow-sm border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            {['all','24h','7d'].map((r) => (
              <Pill key={r} active={range===r} onClick={() => setRange(r)}>{r === 'all' ? 'All' : r}</Pill>
            ))}
            <div className="w-px h-6" style={{ background: 'var(--border)' }} />
            {['auto','live','mock','rtdb'].map((m) => (
              <Pill key={m} active={mode===m} onClick={() => setMode(m)} title={m.toUpperCase()}>{m}</Pill>
            ))}
            <div className="w-px h-6" style={{ background: 'var(--border)' }} />
            <Pill active={theme==='dark'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Toggle theme">
              {theme === 'dark' ? 'dark' : 'light'}
            </Pill>
          </div>
        </div>
      </header>

      <div className="bottom-6 left-6 right-6 sm:right-auto sm:w-[380px] space-y-4" style={{ position: 'absolute', zIndex: 20 }}>
        <div className="rounded-2xl shadow border p-5" style={{ background: 'var(--surface-veil)', borderColor: 'var(--border)', color: 'var(--text)' }}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Capture noise</h2>
          <NoiseCapture onSample={addNoiseSample} disabled={!liveActive} />
          {!liveActive && <p className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>Enable Live mode to record to Firestore.</p>}
        </div>
        <div className="rounded-2xl shadow border p-5" style={{ background: 'var(--surface-veil)', borderColor: 'var(--border)', color: 'var(--text)' }}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Legend</h2>
          <div className="flex items-center justify-between text-xs mb-2" style={{ color: 'var(--muted)' }}>
            <span>Quiet</span>
            <span>Loud</span>
          </div>
          <div className="h-3 w-full rounded-full ring-1 shadow-inner" style={{ background: 'linear-gradient(to right, #00ff7f, #ff0000)', borderColor: 'var(--border)' }} />
          <div className="mt-2 text-[11px]" style={{ color: 'var(--muted)' }}>&lt;50 dB (Green) → &gt;70 dB (Red)</div>
        </div>
      </div>
    </div>
  );
}

export default App;
