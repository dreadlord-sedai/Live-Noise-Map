🔹 Finalized MVP Plan for Live Noise Map
Realtime updating Heatmap of Noise in Sri Lanka visualized based on location.

1. Frontend (UI + Map)
Framework → React


Styling → Tailwind CSS (fast, responsive, modern look)


Map & Heatmap →


Leaflet.js (open-source mapping library)


OpenStreetMap tiles (free, no account needed)


leaflet.heat plugin → heatmap visualization of noise intensity



2. Noise + Location Capture
Web Audio API → capture microphone input, approximate dB levels


Geolocation API → get user’s coordinates at time of measurement


Data Format →

 {
  "lat": 6.9271,
  "lon": 79.8612,
  "dB": 72.4,
  "timestamp": "2025-08-20T11:30:00Z"
}



3. Backend / Database
Firebase Firestore


Simple schema, easy integration with React


Realtime sync → heatmap updates live when new data is added


👉 Schema in Firestore
/noise_samples
  {
    "lat": 6.9271,
    "lon": 79.8612,
    "dB": 72.4,
    "timestamp": "2025-08-20T11:30:00Z"
  }


4. Data Visualization (Leaflet Heatmap Layer)
Fetch data from Firestore → convert to [[lat, lon, intensity], ...]


Intensity scaled from dB (e.g., intensity = dB / 100)


Use leaflet.heat plugin:

 L.heatLayer(data, {
  radius: 25,
  blur: 15,
  maxZoom: 17
}).addTo(map);


Color Gradient (customizable):


Green = Quiet (<50 dB)


Yellow = Moderate (50–70 dB)


Red = Loud (>70 dB)



5. Extra Features (if time)
Time filters → last 24h / last week (Firestore query by timestamp)


Popups/Tooltips → on map click, show exact dB + timestamp


Charts (optional) → Noise trends with Chart.js



🔹 Tech Stack Summary
Frontend
React


Tailwind CSS


Leaflet.js + OSM + leaflet.heat


Noise & Location
Web Audio API (dB capture)


Geolocation API


Backend
Firebase Firestore


Visualization
Leaflet Heatmap Layer (leaflet.heat)


Optional: Chart.js for noise trends


# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
