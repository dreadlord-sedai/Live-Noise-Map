# Web App

React 19 + Vite 7 + Tailwind 4 + Leaflet/leaflet.heat. Entry point: `src/main.jsx` (imports `index.css`, Leaflet CSS, and renders `<App/>` in `StrictMode`).

## Commands

```bash
npm install
npm run dev        # dev server
npm run build      # production build (dist/)
npm run preview    # serve the build

npx eslint src     # lint just the web app — this is the lint gate
```

See [index](index.md) for the rollup native-module workaround if `vite build` fails.

## Feature tour (`src/App.jsx`)

The whole UI lives in `App.jsx`:

- **Header pills**
  - Time range: `all | 24h | 7d` (stored in state; changing it clears samples and re-subscribes)
  - Mode: `auto | live | mock | rtdb` — see [Architecture › Mode logic](architecture.md#mode-logic-web-header)
  - Theme: toggles the `.theme-dark` class on `<html>` (CSS variables in `src/index.css`)
- **Map** fills the viewport behind the header via `<MapView heatData={...}/>`
- **Capture card** hosts `NoiseCapture`; its `onSample` is wired directly to `addNoiseSample`. The card is disabled unless a live mode is active.
- **Legend** explains the green → red gradient (&lt;50 dB → &gt;70 dB).

Intensity mapping: dB values map to heat intensities through `scaleDbToIntensity` — clamped to `[0.35, 1.0]`, with 45 dB as floor and 72 dB as full red, using a slight power curve (`t^1.05`). Tune these constants in `App.jsx`.

## Key files

### `src/components/MapView.jsx`

Owns the Leaflet lifecycle with defensive sizing logic:

- Creates the map centered on Sri Lanka (`[7.8731, 80.7718]`, zoom 7) with OpenStreetMap tiles.
- If the container has zero size at mount, waits for a `ResizeObserver` before initializing; after init it schedules several deferred `invalidateSize()` calls (RAF + 80 ms + 200 ms timeouts) and keeps another `ResizeObserver` for later resizes. This avoids the classic "grey map / offset tiles" bugs in flex/fullscreen layouts.
- Heat layer created once via `L.heatLayer`:

```js
radius: 26, blur: 22, maxZoom: 17, max: 0.8, minOpacity: 0.25,
gradient: { 0.0:'#00ff7f', 0.4:'#ffd700', 0.7:'#ff8c00', 0.9:'#ff4500', 1.0:'#ff0000' }
```

Tune rendering by adjusting these parameters here. New data is applied with `setLatLngs(points)` + `redraw()` whenever `heatData` changes (points shaped `[lat, lon, intensity]`).

Cleanup is thorough (map `.remove()`, observer disconnects, timer flushes) so React StrictMode's double-mount works without leaks.

### `src/features/NoiseCapture.jsx`

Browser noise capture using Web Audio + Geolocation:

1. `getUserMedia({ audio: true })`, then an `AnalyserNode` (fftSize 2048).
2. Each animation frame computes RMS of time-domain samples and converts to a rough dB scale: `20*log10(rms) + 100`.
3. At most every ~5 s, fetches GPS position and calls `onSample({ lat, lon, dB, timestamp })`.
4. Stop suspends the AudioContext; unmount closes it.

Requires HTTPS (or localhost) for both microphone and geolocation permissions.

### `src/features/HeatmapData.ts`

All RTDB access lives here — read/write details are covered in [Architecture › Data flow](architecture.md#data-flow) and [Data model](data-model.md). Highlights:

- `addNoiseSample(sample)` — RTDB-only write to `noiseReports`.
- `subscribeToRtdbReports(onData)` — dual-root subscription (`noiseReports` + `devices`) with recursive extraction and field-alias normalization; returns an unsubscribe function.
- `subscribeToSamples(onData, range)` — **legacy Firestore path, currently unused**.

### `src/lib/firebase.ts`

Initializes the Firebase app from a hardcoded config and caches two singletons: `getDb()` (Firestore — legacy) and `getRealtimeDb()` (RTDB — used everywhere). Firestore is initialized with `experimentalForceLongPolling` to dodge WebChannel 400 errors on constrained networks. See [Firebase setup](firebase-setup.md).

### `src/mock/data.ts`

Generates clustered mock readings constrained to a Sri Lanka land polygon (~1,800 points), plus `nudgeSamples(data, jitter)` which walks each point slightly each tick to animate the heatmap. Mock mode never writes to Firebase.

## Verification checklist

```bash
npx eslint src && npm run build
```

Then manually check in `npm run dev`:

- Mock mode animates; switching modes/ranges clears points before re-subscribing.
- Live capture requires mic + location permission prompts.
- Theme toggle switches CSS variable palettes.
