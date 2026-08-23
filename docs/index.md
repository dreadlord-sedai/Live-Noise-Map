# Live Noise Map — Documentation

Real-time, interactive heatmap of environmental noise across Sri Lanka. Noise readings are captured from browsers (Web Audio + Geolocation) and Android/iOS devices, stored live in **Firebase Realtime Database (RTDB)**, and rendered as an animated Leaflet heatmap.

## Quick start

### Web app (repo root)

```bash
npm install
npm run dev        # Vite dev server
npm run build      # production build to dist/
npm run preview    # serve the production build
```

Verify changes with:

```bash
npx eslint src && npm run build
```

> Do not use root `npm run lint` as a gate: `eslint .` also sweeps `mobile/` and fails on ~19 pre-existing errors there (CommonJS in `metro.config.js` / `mock.js`, unused vars, empty blocks) unrelated to web code.

> If `vite build` fails with `Cannot find module @rollup/rollup-linux-x64-gnu`, delete `node_modules` and reinstall (known npm optional-deps bug), or run `npm i --no-save @rollup/rollup-linux-x64-gnu`.

### Mobile app (`mobile/`)

```bash
cd mobile
npm install        # mobile has its own node_modules and lockfiles
npx expo start     # scan QR with Expo Go, or press a/android
# native builds need local tooling:
npm run android    # expo run:android
npm run ios        # expo run:ios
```

## Documentation index

| Page | Contents |
|---|---|
| [Architecture](architecture.md) | Repo layout, package boundaries, data flow diagram, mode logic |
| [Web app](web-app.md) | Features, key-file walkthrough, heat layer tuning |
| [Mobile app](mobile-app.md) | Screens, WebView map bridge protocol, sound capture |
| [Data model](data-model.md) | RTDB schemas, accepted field aliases, intensity mapping |
| [Firebase setup](firebase-setup.md) | Hardcoded config locations, enabling services, security rules |
| [API](api.md) | Shared REST client endpoints and conventions |

## At a glance

- **Stack (web):** React 19 + Vite 7 + Tailwind 4 + Leaflet/leaflet.heat + Firebase JS SDK 12.
- **Stack (mobile):** Expo SDK 53 / React Native 0.79, react-native-maps-free approach — the map is a Leaflet page inside a `react-native-webview`.
- **Backend:** Firebase Realtime Database only (no custom server needed). A REST backend contract exists in `shared/api` but no backend ships with this repo.
- **No tests, no typecheck:** `.ts` files are transpiled without type checking; there is currently no test suite.

See [Architecture](architecture.md) for how the pieces fit together.
