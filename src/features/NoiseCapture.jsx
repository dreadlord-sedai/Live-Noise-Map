import { useEffect, useRef, useState } from 'react';

export default function NoiseCapture({ onSample, disabled = false }) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState('');
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(0);
  const lastGeoTsRef = useRef(0);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (disabled && isCapturing) {
      // Stop if disabled toggled on
      stop();
    }
  }, [disabled]);

  const start = async () => {
    if (disabled) return;
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      source.connect(analyser);

      setIsCapturing(true);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const v = (dataArray[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const db = 20 * Math.log10(rms || 1e-8) + 100; // rough scale

        const now = performance.now();
        if (navigator.geolocation && now - lastGeoTsRef.current > 5000) {
          lastGeoTsRef.current = now;
          navigator.geolocation.getCurrentPosition((pos) => {
            const sample = {
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
              dB: Number(db.toFixed(1)),
              timestamp: new Date().toISOString(),
            };
            onSample?.(sample);
          });
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      tick();
    } catch (e) {
      setError(e.message || 'Failed to start capture');
      setIsCapturing(false);
    }
  };

  const stop = () => {
    setIsCapturing(false);
    if (audioContextRef.current) {
      audioContextRef.current.suspend();
    }
    cancelAnimationFrame(rafRef.current);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm text-red-600">{error}</div>
      <div className="flex gap-2">
        <button className={`px-3 py-2 rounded text-white ${disabled ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600'}`} onClick={start} disabled={isCapturing || disabled}>Start</button>
        <button className="px-3 py-2 rounded bg-gray-700 text-white" onClick={stop} disabled={!isCapturing}>Stop</button>
      </div>
      <p className="text-xs text-gray-500">Microphone and location permissions are required.</p>
      {disabled && <p className="text-xs text-amber-600">Enable Live mode to record to Firestore.</p>}
    </div>
  );
}
