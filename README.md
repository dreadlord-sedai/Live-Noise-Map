# Live Noise Map

Real-time, interactive heatmap of environmental noise across Sri Lanka. Data can come from browsers (Web Audio + Geolocation), IoT pods (ESP32 + mic), Firebase Firestore, or Firebase Realtime Database. The app renders an animated heatmap using Leaflet and `leaflet.heat`.

## Table of Contents
- Overview
- Key Features
- Architecture
- Data Model
- Getting Started
- Development
- Modes (Auto / Live / Mock / RTDB)
- Firebase Setup (Firebase RTDB)
- Security Notes
- Performance Notes
- Accessibility
- Roadmap and Backlog

## Contribution
As of now the contribution on this project depends on 4 core members, however we do plan to use open-source this project for further development, this project is the result of a hackathon.

## Overview
Live Noise Map visualizes noise intensity in real time. Each reading contains latitude, longitude, approximate dB level, and timestamp. The app supports:
- Browser capture (microphone + location)
- Firebase realtime Database
- Firebase Realtime Database (RTDB) sync
- Rich mock data for demos (constrained to Sri Lanka land polygon)

## Key Features
- Leaflet + leaflet.heat heatmap with green → yellow → red gradient
- Realtime updates from Firestore or RTDB
- Web capture: approximate dB via Web Audio API + Geolocation API
- Mode toggle: Auto / Live (Firestore) / Mock / RTDB
- Time filters: All / 24h / 7d (for Firestore)
- Tailwind CSS UI (dev uses CDN assist; production uses PostCSS build)

## Architecture
- Frontend: React + Vite + Tailwind + Leaflet
- Data sync: Firebase (Realtime Database)
- Heatmap: leaflet.heat layer fed with `[lat, lon, intensity]`
- Mock generator: clustered, background field, pulses, surges; constrained to Sri Lanka polygon

Directory highlights:
- `src/components/MapView.jsx` – Leaflet map + heat layer lifecycle
- `src/features/NoiseCapture.jsx` – Web Audio + Geolocation capture (Start/Stop)
- `src/features/HeatmapData.ts` – Firestore/RTDB add/subscribe utilities
- `src/mock/data.ts` – Robust mock data generator
- `src/lib/firebase.ts` – Firebase init (Firestore + RTDB) using hardcoded config

## Data Model
Normalized sample (shared across sources):
```json
 {
  "lat": 6.9271,
  "lon": 79.8612,
  "dB": 72.4,
  "timestamp": "2025-08-20T11:30:00Z"
}
```

Firestore (collection `noise_samples`):
```json
  {
    "lat": 6.9271,
    "lon": 79.8612,
    "dB": 72.4,
  "timestamp": <Firestore Timestamp>
}
```

Realtime Database (path `noiseReports`) expected schema:
```json
{
  "noiseReports": {
    "<reportId>": {
      "latitude": 6.9271,
      "longitude": 79.8612,
      "dbValue": 72.4,
      "timestamp": 1692521400000
    }
  }
}
```

## Getting Started
Prerequisites:
- Node 18+
- npm 9+

Install and run dev server:
```
npm install
npm run dev
```
Production build and preview:
```
npm run build
npm run preview
```

## Development
- Main entry: `src/main.jsx`
- Tailwind directives in `src/index.css`
- Leaflet CSS imported in `src/main.jsx`
- Vite config: `vite.config.js`

## Modes (Auto / Live / Mock / RTDB)
Use the toggle in the header:
- Auto: If Firestore initializes, uses Firestore; otherwise falls back to Mock
- Live: Force Firestore subscription to `noise_samples`
- Mock: Animated mock dataset (no writes)
- RTDB: Subscribe to `noiseReports` in Realtime Database

When switching modes or time range, the app clears existing samples immediately to avoid mixing sources.

## Firebase Setup (Firestore + RTDB)
The project uses hardcoded Firebase config in `src/lib/firebase.ts`. Replace placeholders with your real project values (already populated if you edited them).

Enable services:
- Firestore Database
- Realtime Database

Testing rules (relax for local demo only – do not use in production):

Firestore rules (demo):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /noise_samples/{doc} {
      allow read, write: if true;
    }
  }
}
```

RTDB rules (demo):
```json
{
  "rules": {
    "noiseReports": {
      ".read": true,
      ".write": true,
      "$reportId": {
        ".validate": "newData.hasChildren(['latitude', 'longitude', 'dbValue', 'timestamp']) && newData.child('latitude').isNumber() && newData.child('longitude').isNumber() && newData.child('dbValue').isNumber() && newData.child('timestamp').isNumber()"
      }
    }
  }
}
```

## Security Notes
- Do not ship open rules to production; lock down read/write access
- Consider authenticated writes for browsers; IoT devices should use a secure ingestion endpoint or custom token
- Avoid exposing private keys or secrets (Firebase web config is public but rules must protect data)

## Performance Notes
- Heat layer parameters tuned for contrast; adjust `radius`, `blur`, `minOpacity`, and gradient in `MapView.jsx`
- Intensity mapping boosts reds for >~70 dB; tune in `App.jsx` if needed
- Mock dataset uses ~1,800 points; reduce for low-end devices

## Accessibility
- High-contrast colors for gradient
- Keyboard-focusable controls for mode/time range
- Consider adding ARIA labels and descriptions for non-visual users

## Roadmap and Backlog
See `ROADMAP.md` for phased plan and `BACKLOG.md` for actionable next steps.

## Scaling
Scaling of the application includes using better performative tech stacks, better & improved IOT hardware for MORZ NOISE POD system, Trained pre-built LLM Models for better noise analysing, Independant MORZ NOISE POD system, commercialization + Monetization.

- Use of Flutter for mobile application instead of react native (better UI + Performance)
- Adding hardware upgrades like SCD30 Sensors for Humidity + Heat + CO2, Better microphone that samples audio, ESP32 Module + SIM for independant Wifi + GPS
- Intergration of AI/ML models: using LLAMA-2 pre-built models and train them using data sets to analyse and identify audio samples resulting in advanced information such as population and estimate population clusters, estimate events based on population + noise decibel levels.
- Advanced web app + mobile features such as: Filters, Dashboard, and Analytics
- Commercialization + Monetization: Noise-as-a-service API, Real-estate Intergration, Provide advanced analytics useful for government, military, special research purposes
- Scaling: Nationwide -> Global intergration
