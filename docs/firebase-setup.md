# Firebase Setup

The project talks to **Firebase Realtime Database (RTDB)** for all live reads and writes. Firestore initialization code exists but is unused (legacy path).

## Where the config lives — two files, keep in sync

| App | File |
|---|---|
| Web | `src/lib/firebase.ts` |
| Mobile | `mobile/lib/firebase.js` |

Both contain the same hardcoded `firebaseConfig` (apiKey, projectId, and importantly `databaseURL` pointing at the `asia-southeast1` RTDB instance). **If you change the Firebase project, edit both files identically** — there is no env-var indirection.

Firebase web API keys are public identifiers; data protection comes from security rules, not key secrecy. Still, avoid committing private service-account keys.

## Enable services

In the Firebase console for the project:

1. **Realtime Database** — create the database in the region matching `databaseURL` (`asia-southeast1`).
2. Firestore (optional) — only if you intend to revive the legacy `subscribeToSamples` path.

## Security rules

### RTDB demo rules (development only)

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

Caveats:

- Open read/write means anyone can read every noise report and inject arbitrary data. Do not ship to production.
- The `$reportId` validation only matches the **web** write shape (`latitude/longitude/dbValue/timestamp-number`). Mobile writes use `lat/lon/dB/ISO-string timestamp`, which would fail this validation. If you deploy rules, align them with [Data model › Canonical write shapes](data-model.md#canonical-write-shapes-already-in-use).

### Production hardening ideas

- Require auth for writes (anonymous auth for browsers/mobile, custom tokens or a secure ingestion endpoint for IoT pods).
- Validate ranges: latitude ∈ [-90, 90], longitude ∈ [-180, 180], dB ∈ [0, ~200], timestamp near "now".
- Consider rate limiting via Cloud Functions ingestion instead of direct client writes.

## Troubleshooting notes baked into the code

- `src/lib/firebase.ts` initializes Firestore with `experimentalForceLongPolling: true` to avoid WebChannel 400 errors on constrained networks/proxies (kept from the legacy path).
- Both init modules log the configured RTDB URL at startup — check the console first when data doesn't appear.
- The web app subscribes to both `noiseReports` and `devices` roots and logs per-path sample counts (`[RTDB] ...`) to make schema mismatches visible.
