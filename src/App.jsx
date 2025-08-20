import { useEffect, useMemo, useState } from 'react';
import './App.css';
import MapView from './components/MapView.jsx';
import NoiseCapture from './features/NoiseCapture.jsx';
import { addNoiseSample, subscribeToSamples } from './features/HeatmapData.ts';

function scaleDbToIntensity(db) {
  // Clamp 0..100 and scale 0..1
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
    <div className="w-screen h-screen flex flex-col">
      <header className="p-3 border-b bg-white/80 backdrop-blur z-10">
        <h1 className="text-xl font-semibold">Live Noise Map</h1>
      </header>
      <main className="flex-1 grid grid-rows-[1fr_auto]">
        <div className="relative">
          <MapView heatData={heatData} />
        </div>
        <div className="p-3 bg-white border-t">
          <NoiseCapture onSample={addNoiseSample} />
        </div>
      </main>
    </div>
  );
}

export default App;
