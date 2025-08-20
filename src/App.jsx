import { useEffect, useMemo, useState } from 'react';
import MapView from './components/MapView.jsx';
import NoiseCapture from './features/NoiseCapture.jsx';
import { addNoiseSample, subscribeToSamples } from './features/HeatmapData.ts';

function scaleDbToIntensity(db) {
  const clamped = Math.max(0, Math.min(100, db));
  return clamped / 100;
}

function App() {
  const [samples, setSamples] = useState([]);

  useEffect(() => {
    const unsub = subscribeToSamples(setSamples);
    return () => unsub();
  }, []);

  const heatData = useMemo(() => {
    return samples.map((s) => ({
      lat: s.lat,
      lon: s.lon,
      intensity: scaleDbToIntensity(s.dB),
    }));
  }, [samples]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0 }}>
        <MapView heatData={heatData} />
      </div>

      <header className="p-4 bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-500 text-white shadow" style={{ position: 'relative', zIndex: 20 }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Live Noise Map</h1>
            <p className="text-sm/relaxed opacity-90">Realtime heatmap of environmental noise in Sri Lanka</p>
          </div>
        </div>
      </header>

      <div className="bottom-4 left-4 right-4 sm:right-auto sm:w-[380px] space-y-3" style={{ position: 'absolute', zIndex: 20, bottom: 16, left: 16, right: 16 }}>
        <div className="rounded-xl bg-white/90 backdrop-blur shadow border p-4">
          <h2 className="text-sm font-medium mb-2">Capture noise</h2>
          <NoiseCapture onSample={addNoiseSample} />
        </div>
        <div className="rounded-xl bg-white/90 backdrop-blur shadow border p-3">
          <h2 className="text-sm font-medium mb-2">Legend</h2>
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
