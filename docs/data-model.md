# Data Model

## Normalized sample (in-app shape)

All layers converge on this shape after normalization:

```json
{
  "lat": 6.9271,
  "lon": 79.8612,
  "dB": 72.4,
  "timestamp": "2025-08-20T11:30:00.000Z"
}
```

The web heatmap then converts it to `[lat, lon, intensity]` for `leaflet.heat` via `scaleDbToIntensity` in `src/App.jsx`.

## RTDB roots read by the web app

`subscribeToRtdbReports` subscribes to **both** roots at once and merges results:

```
noiseReports/            ← primary root; web writes + mobile writes land here
devices/                 ← expected home of future IoT pods
```

Any object anywhere below these roots that "looks like" a reading is accepted (the walker stops descending once a node matches). Records missing any finite `lat`/`lon`/`dB` are discarded.

### Accepted field aliases

| Field | Aliases accepted on read |
|---|---|
| Latitude | `lat`, `latitude`, `Latitude` |
| Longitude | `lon`, `lng`, `longitude`, `Longitude` |
| dB value | `dB`, `db`, `dbValue`, `decibels`, `spl` |
| Timestamp | `timestamp`, `ts`, `time`, `createdAt` |

### Timestamp handling

- Numeric epoch values **< 1e12** are interpreted as **seconds** and multiplied by 1000.
- Numeric values ≥ 1e12 are treated as milliseconds.
- Strings are parsed with `Date.parse`.
- Missing/unparseable timestamps fall back to "now".

### Canonical write shapes already in use

Web (`addNoiseSample`) — ms-epoch timestamps:

```json
{
  "latitude": 6.9271,
  "longitude": 79.8612,
  "dbValue": 72.4,
  "timestamp": 1692521400000
}
```

Mobile MapScreen — ISO-string timestamp plus metadata:

```json
{
  "lat": 6.9271,
  "lon": 79.8612,
  "dB": 72.4,
  "timestamp": "2025-08-20T11:30:00.000Z",
  "source": "mobile-app",
  "deviceId": "mobile-user",
  "locationName": "Mobile User"
}
```

Both are valid because reads normalize aliases. New producers should prefer one shape and document it here.

### Demo RTDB rules

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

Note the validation rule only matches the *web* write shape; mobile's ISO-string timestamp would fail validation if these rules were deployed as-is. See [Firebase setup](firebase-setup.md).

## Legacy Firestore schema (unused)

Retained in code but **not used** by the current UI (`subscribeToSamples` / `getDb()` exist in `src/features/HeatmapData.ts` and `src/lib/firebase.ts`):

Collection `noise_samples`:

```json
{
  "lat": 6.9271,
  "lon": 79.8612,
  "dB": 72.4,
  "timestamp": "<Firestore Timestamp>"
}
```

## Intensity mapping (web)

`scaleDbToIntensity` in `src/App.jsx` maps dB → `[0.35, 1.0]`:

- ≤ 45 dB → 0.35
- ≥ 72 dB → 1.0
- Between: linear t with a mild power curve `0.35 + t^1.05 × 0.65`

Mobile WebView heat layer uses its own simpler mapping: `(dB − 50) / 40` clamped to `[0, 1]`.

Marker colors (mobile): green ≤ 60 dB, orange ≤ 80 dB, red above.

## Shared constants

`shared/constants/index.ts` declares noise thresholds (quiet < 50 dB ≤ moderate ≤ 70 dB < loud) and a three-stop gradient. These constants are not yet imported by either app — they document intent for future UI work.
