import express from "express";
import { db } from "../firebaseConfig.js";


const router = express.Router();


// Simple validation helper
const validNumber = (v) => typeof v === "number" && Number.isFinite(v);


router.post("/", async (req, res) => {
try {
const { deviceId, lat, lon, dB, timestamp } = req.body;


if (!deviceId || !timestamp) {
return res.status(400).json({ error: "Missing deviceId or timestamp" });
}


if (!validNumber(lat) || !validNumber(lon) || !validNumber(dB)) {
return res.status(400).json({ error: "lat, lon and dB must be numbers" });
}


const ts = new Date(timestamp);
if (Number.isNaN(ts.getTime())) {
return res.status(400).json({ error: "Invalid timestamp" });
}


const payload = {
deviceId,
lat,
lon,
dB,
timestamp: ts.toISOString()
};


await db.collection("noise_samples").add(payload);


return res.status(200).json({ message: "Noise data saved successfully" });
} catch (err) {
console.error("Error in /add-noise:", err);
return res.status(500).json({ error: "Internal server error" });
}
});


export default router;