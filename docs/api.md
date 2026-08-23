# API (shared REST client)

`shared/api/` defines the contract for an optional REST backend. **No backend ships with this repo** — Firebase RTDB covers live data today; this client exists for a future/optional server (and is already wired into two mobile screens).

## Files

- `shared/api/index.ts` — typed version
- `shared/api/index.js` — plain JS twin

⚠️ These are **hand-maintained duplicates** of the same three functions. Mobile imports the `.js`. If you change one, mirror the change in the other.

## Endpoints

All functions take `baseUrl` as their first argument and throw on non-2xx responses.

### `postNoise(baseUrl, reading)` — `POST {baseUrl}/noise`

```json
{
  "lat": 6.9271,
  "lon": 79.8612,
  "dB": 72.4,
  "timestamp": "2025-08-20T11:30:00Z",
  "deviceId": "mobile-device"
}
```

### `getNoise(baseUrl, params?)` — `GET {baseUrl}/noise?lat=&lon=&radius=&timeRange=`

Query params are optional and skipped when `undefined`/`null`. `timeRange` accepts `'1h' | '24h' | '7d' | 'all'`.
Returns: `NoiseReading[]`.

### `getUserNoiseHistory(baseUrl)` — `GET {baseUrl}/user/noise-history`

Returns: `NoiseReading[]` for the current user.

### Reading shape (`NoiseReading`)

```ts
{ lat: number; lon: number; dB: number; timestamp: string; deviceId?: string }
```

## Who uses it

| Caller | Function | Status |
|---|---|---|
| `mobile/screens/CaptureScreen.js` | `postNoise` every ~5 s while capturing | Blocked by placeholder BASE_URL |
| `mobile/screens/HistoryScreen.js` | `getUserNoiseHistory` on mount | Blocked by placeholder BASE_URL |
| Web app | nothing | Web talks to RTDB directly |

## Configuration

The base URL lives in `mobile/utils/config.js`:

```js
export const BASE_URL = 'https://your-backend.example.com'; // TODO
```

Until you replace it, Capture/History submissions fail with network errors. MapScreen bypasses this entirely by writing straight to RTDB.

## Metro note

Mobile resolves `shared/` via `mobile/metro.config.js` (watch folder + dual `node_modules` paths). See [Mobile app › shared imports](mobile-app.md#shared-imports--metro).
