# Roadmap

## Stage 1 – MVP (Done) ✅
- React + Leaflet heatmap
- Tailwind UI
- Mock data + Sri Lanka polygon constraint
- Map lifecycle stability and sizing fixes

## Stage 2 – Real Data Integration (In Progress) 🔄
- Web capture via Web Audio + Geolocation (Start/Stop)
- Firestore realtime: `/noise_samples`
- Realtime Database (RTDB): `/noiseReports` ✅
- Mode toggle: Auto / Live (Firestore) / RTDB / Mock

## Stage 3 – Usability & Features (In Progress) 🔄
- Time filters: 1h / 24h / 7d + quick presets
- Tooltips on click: show dB + timestamp (+ deviceId if present)
- Legend + on-map help modal
- Export CSV / JSON (mock and live)

## Stage 4 – IoT Pods Integration (Planned) 📋
- ESP32 ingestion via Firebase Cloud Function endpoint
- Device schema: `{ deviceId, lat, lon, dB, timestamp }`
- Device registration + basic management view

## Stage 5 – Mobile App (COMPLETED) ✅
- React Native app for citizen capture + map
- Push notifications for noise alerts
- Offline capture with later sync
- **Additional Features Completed:**
  - Clean, modern UI with single scrollable options panel
  - Fullscreen mode toggle
  - Live/Mock data switching
  - Heatmap visualization with green-to-red gradient
  - Real-time Firebase integration
  - Auto-refresh and dark mode
  - Smooth animations and responsive design

## Stage 6 – AI & Noise Index (Planned) 📋
- Noise Index (0–100) per tile/area
- Predictive modeling by hour/day
- Anomaly detection of spikes

## Stage 7 – Analytics & Insights (Planned) 📋
- Charts for daily/weekly/hourly trends
- Aggregations by city/ward/zone
- Research export tools (filters, ranges)

## Stage 8 – Monetization & API (Planned) 📋
- Noise-as-a-Service API (PropTech + Smart City)
- Real estate Noise Score badges
- Government dashboards

## Stage 9 – Scale & Optimize (Planned) 📋
- Move to Postgres/Supabase + PostGIS for advanced queries
- Tiled rendering / clustering for large datasets
- Multi-city support and region switching

## Current Status Summary 📊
- **Web App**: MVP complete, real data integration in progress
- **Mobile App**: Fully functional with modern UI and Firebase integration
- **Next Focus**: Complete web app real data integration and add time filters
- **Mobile Enhancements**: Consider adding push notifications and offline capture
