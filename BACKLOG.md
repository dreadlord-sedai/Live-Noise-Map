# Backlog

## High Priority
1) Fix Firestore listen errors (400 Bad Request)
- Verify `projectId`, web app registration, and Firestore enablement
- Ensure correct Firestore rules (temporary open for dev)
- Confirm time filters query uses existing index; remove extra `orderBy` if needed
- Acceptance: Live mode streams without console errors

2) Add tooltip on map click
- On map click, find nearest point within radius, show popup with dB + time
- Acceptance: Clicking near a hotspot shows a small info popup

3) CSV/JSON export for current view
- Add button to export current `samples` to CSV and JSON
- Acceptance: File downloads with filtered data

4) Legend/Help modal
- Lightweight modal describing colors and what dB means
- Acceptance: Modal accessible and dismissible via keyboard/mouse

## Medium Priority
5) Time filters: 1h / 24h / 7d
- Firestore query range shortcuts + UI control
- Acceptance: Switching range updates data live

6) Device tagging support
- Extend schema to include `deviceId`
- Filter by device in UI (dropdown)
- Acceptance: Can filter map by deviceId

7) Improve intensity mapping UI controls
- Slider to tune min/max dB on the fly
- Acceptance: Changes reflect immediately on heatmap

8) Robust mock management
- Seed from static `mock.json`, toggle between generator and file
- Acceptance: Switching source updates heatmap without reload

## Low Priority
9) Performance tuning for 10k+ points
- Heatmap tiling/clustering or WebGL layer
- Acceptance: Smooth interaction at scale

10) Offline-first capture (web)
- Queue local samples and sync when online
- Acceptance: Samples persist after network loss and backfill later

11) CI/CD
- Lint/build on push, preview deploys
- Acceptance: PRs show status and preview URL

## Nice-to-have
12) Map theme switcher (light/dark basemap)
13) Screenshot/Share image of current map
14) PWA install with offline map tiles (partial)

## Mobile App - Completed Features ✅
15) ~~Mobile app floating elements overlap fix~~
    - Resolved with single scrollable options panel
    - Clean, modern UI with minimal floating elements

16) ~~Fullscreen mode toggle~~
    - Added floating button in bottom-left corner
    - Toggle between normal and fullscreen map view

17) ~~Functional options panel~~
    - Live/Mock data toggle working
    - Auto-refresh functionality implemented
    - Dark mode toggle functional
    - Heatmap/Data points visualization toggle

18) ~~Heatmap implementation~~
    - Green to red gradient based on decibel values
    - Toggle between heatmap and individual data points
    - Dynamic color mapping (green=low, yellow=medium, red=high)

19) ~~Mock data simulation~~
    - Real-time mock data generation
    - Simulated live updates every 4 seconds
    - 800+ sample points with realistic noise values

20) ~~Firebase Realtime Database integration~~
    - Live data fetching from `/noiseReports` path
    - Real-time subscription with error handling
    - Safe timestamp parsing and data validation
    - Automatic fallback for invalid data

## Mobile App - Current Issues 🔧
21) Firebase permission errors resolved
    - Fixed database path from `/noise` to `/noiseReports`
    - Added robust error handling for malformed data
    - Safe timestamp parsing prevents crashes

22) UI/UX improvements
    - Single floating action button for options
    - Smooth slide-up animation for options panel
    - Clean, modern interface design
    - Responsive layout for different screen sizes
