import { useEffect, useMemo, useRef, useState } from 'react';
import MapView from './components/MapView.jsx';
import NoiseCapture from './features/NoiseCapture.jsx';
import { addNoiseSample, subscribeToSamples } from './features/HeatmapData.ts';
import { generateMockSamples, nudgeSamples } from './mock/data.ts';
import { getDb } from './lib/firebase.ts';

function clamp01(x) { return Math.max(0, Math.min(1, x)); }

function scaleDbToIntensity(db) {
  const minDb = 45;
  const maxDb = 72;
  if (db <= minDb) return 0.35;
  if (db >= maxDb) return 1.0;
  const t = (db - minDb) / (maxDb - minDb);
  return clamp01(0.35 + Math.pow(t, 1.05) * 0.65);
}

function App() {
  const [samples, setSamples] = useState([]);
  const [range, setRange] = useState('all');
  const [mode, setMode] = useState('auto'); // 'auto' | 'live' | 'mock'
  const mockRef = useRef({ enabled: false, timer: 0, data: [] });

  useEffect(() => {
    // Clear existing points immediately when switching mode/range
    setSamples([]);

    const db = getDb();
    const useLive = mode === 'live' || (mode === 'auto' && !!db);

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

      <header className="p-4 bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-500 text-white shadow" style={{ position: 'relative', zIndex: 20 }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Live Noise Map</h1>
            <p className="text-sm/relaxed opacity-90">Realtime heatmap of environmental noise in Sri Lanka</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 mr-2">
              {['all','24h','7d'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1.5 rounded-full text-sm transition ${range===r ? 'bg-white text-indigo-700 shadow' : 'bg-white/20 hover:bg-white/30 text-white'}`}
                >{r === 'all' ? 'All' : r}</button>
              ))}
            </div>
            <div className="rounded-full bg-white/20 p-1 flex items-center gap-1">
              {['auto','live','mock'].map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-3 py-1.5 rounded-full text-sm transition ${mode===m ? 'bg-white text-indigo-700 shadow' : 'hover:bg-white/30 text-white'}`}
                  title={m === 'auto' ? 'Auto-detect Firestore' : m === 'live' ? 'Force Firestore' : 'Use mock data'}
                >{m}</button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="sm:hidden" style={{ position: 'absolute', zIndex: 20, top: 72, left: 16, right: 16 }}>
        <div className="rounded-full bg-white/90 backdrop-blur shadow border p-1 flex items-center justify-between gap-1">
          {['all','24h','7d'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-full text-sm transition ${range===r ? 'bg-indigo-600 text-white shadow' : 'text-gray-700 hover:bg-gray-100'}`}
            >{r === 'all' ? 'All' : r}</button>
          ))}
        </div>
      </div>

      <div className="bottom-4 left-4 right-4 sm:right-auto sm:w-[380px] space-y-3" style={{ position: 'absolute', zIndex: 20, bottom: 16, left: 16, right: 16 }}>
        <div className="rounded-xl bg-white/95 backdrop-blur shadow-lg border p-4">
          <h2 className="text-sm font-medium mb-2 text-gray-900">Capture noise</h2>
          <NoiseCapture onSample={addNoiseSample} disabled={!liveActive} />
        </div>
        <div className="rounded-xl bg-white/95 backdrop-blur shadow-lg border p-3">
          <h2 className="text-sm font-medium mb-2 text-gray-900">Legend</h2>
          <div className="flex items-center gap-3">
            <div className="h-3 w-full bg-gradient-to-r from-[#00ff7f] via-[#ffd700] to-[#ff0000] rounded" />
            <div className="text-xs text-gray-600 whitespace-nowrap">Quiet ↔ Loud</div>
          </div>
          <div className="mt-1 text-[11px] text-gray-500">&lt;50 dB (Green), 50–70 dB (Yellow), &gt;70 dB (Red)</div>
        </div>
      </div>
    </div>
  );
}

export default App;
