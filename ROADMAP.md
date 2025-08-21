# Roadmap

## Stage 1 – MVP (Done)
- React + Leaflet heatmap
- Tailwind UI
- Mock data + Sri Lanka polygon constraint
- Map lifecycle stability and sizing fixes

## Stage 2 – Real Data Integration (In Progress)
- Web capture via Web Audio + Geolocation (Start/Stop)
- Firestore realtime: `/noise_samples`
- Realtime Database (RTDB): `/noiseReports`
- Mode toggle: Auto / Live (Firestore) / RTDB / Mock

## Stage 3 – Usability & Features
- Time filters: 1h / 24h / 7d + quick presets
- Tooltips on click: show dB + timestamp (+ deviceId if present)
- Legend + on-map help modal
- Export CSV / JSON (mock and live)

## Stage 4 – IoT Pods Integration
- ESP32 ingestion via Firebase Cloud Function endpoint
- Device schema: `{ deviceId, lat, lon, dB, timestamp }`
- Device registration + basic management view

## Stage 5 – Mobile App
- React Native app for citizen capture + map
- Push notifications for noise alerts
- Offline capture with later sync

## Stage 6 – AI & Noise Index
- Noise Index (0–100) per tile/area
- Predictive modeling by hour/day
- Anomaly detection of spikes

## Stage 7 – Analytics & Insights
- Charts for daily/weekly/hourly trends
- Aggregations by city/ward/zone
- Research export tools (filters, ranges)

## Stage 8 – Monetization & API
- Noise-as-a-Service API (PropTech + Smart City)
- Real estate Noise Score badges
- Government dashboards

## Stage 9 – Scale & Optimize
- Move to Postgres/Supabase + PostGIS for advanced queries
- Tiled rendering / clustering for large datasets
- Multi-city support and region switching
