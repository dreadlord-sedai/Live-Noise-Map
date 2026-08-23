# Mobile App

Expo SDK 53 / React Native 0.79 app (iOS + Android). Entry: `mobile/index.js` → `mobile/App.js`, which registers a native stack with three screens: **Map**, **Capture**, **History**.

> The `mobile/` folder is an independent npm package: it has its own `node_modules` and lockfiles. Run all commands from inside `mobile/`.

## Commands

```bash
cd mobile
npm install
npx expo start     # dev server; scan QR with Expo Go
npm run android    # expo run:android (needs Android SDK/tooling)
npm run ios        # expo run:ios (needs Xcode)
```

## Screens

### MapScreen (`screens/MapScreen.js`)

The main screen. The map is **not** `react-native-maps` — it's a self-contained HTML page (Leaflet 1.9.4 + leaflet-heat loaded from unpkg) rendered inside a `react-native-webview`.

- **Data source toggle** (Options panel): *Mock* (800 generated points, nudged every 4 s) vs *Live* (RTDB subscription via `subscribeToNoiseData`).
- **Visualization toggle**: colored circle markers vs heatmap layer.
- **Settings**: auto-refresh (re-loads live data every 30 s), notifications (UI only), dark mode (swaps OSM tiles for Carto dark tiles inside the WebView).
- **Sound capture**: 🎤 FAB starts an `expo-av` recording + GPS; on stop it computes a dB value and pushes a report to RTDB (see below). If native recording fails, it falls back to **simulated** dB values.
- **Stats**: point count and average dB of the current dataset.

#### RN ↔ WebView bridge protocol

| Direction | Message | Payload |
|---|---|---|
| RN → WebView | injected JS dispatches `message` event | `{ type: 'set_data', data: points[] }` |
| RN → WebView | " | `{ type: 'set_dark_mode', data: boolean }` |
| RN → WebView | " | `{ type: 'set_heatmap', data: boolean }` |
| WebView → RN | `postMessage('Map Ready')` | plain string; triggers initial state push |
| WebView → RN | `postMessage(JSON)` | `{ type: 'marker_click', data: point }` |

Point shape inside the bridge: `{ lat, lng, dB, timestamp (ISO string), location? }` — note `lng` here vs `lon` in other layers; the mapping happens in `loadNoiseData()` / `submitNoiseData()`.

#### Mobile write path

`submitNoiseData` writes to RTDB root `noiseReports` via `push()` + `set()`:

```js
{ lat, lon, dB, timestamp /* ISO string */, source: 'mobile-app', deviceId: 'mobile-user', locationName: 'Mobile User' }
```

This shape differs slightly from the web write (`latitude/longitude/dbValue/timestamp-ms`) but both are accepted on read thanks to field-alias normalization — see [Data model](data-model.md).

The live read path maps incoming records defensively: `lat ?? latitude`, `dB ?? dbValue`, timestamp coerced to ISO, records without finite coordinates dropped.

### CaptureScreen (`screens/CaptureScreen.js`)

Continuous capture screen using `expo-av` recording with metering:

- Requests mic + foreground location permissions.
- While capturing, reads `status.metering` (dBFS) each frame and converts to a positive scale (`100 + metering`). On platforms without metering (some Androids) it falls back to simulated values (~55–65 dB).
- Submits every ~5 s via the REST client: `api.postNoise({ lat, lon, dB, timestamp, deviceId: 'mobile-device' })`.

⚠️ This goes through `services/api.js` → `shared/api/index.js` → `BASE_URL` from `utils/config.js`, which is still the placeholder `https://your-backend.example.com`. REST submissions fail until you set a real backend URL. See [API](api.md).

### HistoryScreen (`screens/HistoryScreen.js`)

Fetches `api.getUserNoiseHistory()`, groups readings by day, averages dB per day, and renders a bezier `LineChart` from `react-native-chart-kit`. Also blocked by the placeholder `BASE_URL`.

## Firebase

Config is hardcoded in `mobile/lib/firebase.js` — **keep in sync with `src/lib/firebase.ts`** when changing projects. Only RTDB functions are used on mobile. See [Firebase setup](firebase-setup.md).

## shared/ imports & Metro

`mobile/services/api.js` imports `../../shared/api/index.js`. This works because `metro.config.js`:

1. Adds `../shared` as the only watch folder,
2. Resolves modules from `mobile/node_modules` then the root `node_modules`,
3. Disables hierarchical lookup beyond those paths.

Preserve these settings if you touch Metro config, or `shared/` imports stop rebuilding/resolving. Note that `shared/api/index.js` has a hand-maintained `.ts` twin — edit both together.

## Known quirks

- `calculateAverageDb()` on MapScreen is currently a simulation (`45 + random*20`) regardless of real audio analysis.
- Both `package-lock.json` and `yarn.lock` are committed under `mobile/`; npm is used by convention.
- `expo-notifications` is installed but not yet wired into any screen.
