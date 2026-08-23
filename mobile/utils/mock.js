// Mock data generator and real-time simulator for the mobile app

function pointInPolygon(lat, lon, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > lon) !== (yj > lon)) &&
      (lat < ((xj - xi) * (lon - yi)) / (yj - yi + 1e-12) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

const SRILANKA_POLY = [
  [9.85, 80.20],
  [9.20, 79.80],
  [8.20, 79.70],
  [7.20, 79.85],
  [6.60, 80.00],
  [6.05, 80.10],
  [5.92, 80.45],
  [5.95, 81.10],
  [6.20, 81.85],
  [7.20, 81.90],
  [8.20, 81.75],
  [9.00, 81.40],
  [9.60, 80.90],
  [9.85, 80.20],
];

const CLUSTERS = [
  { name: 'Colombo', lat: 6.9271, lon: 79.8612, base: 70, sigma: 0.06 },
  { name: 'Kandy', lat: 7.2906, lon: 80.6337, base: 62, sigma: 0.05 },
  { name: 'Galle', lat: 6.0535, lon: 80.2200, base: 63, sigma: 0.05 },
  { name: 'Jaffna', lat: 9.6615, lon: 80.0255, base: 59, sigma: 0.06 },
  { name: 'Matara', lat: 5.9485, lon: 80.5469, base: 60, sigma: 0.05 },
  { name: 'Negombo', lat: 7.2083, lon: 79.8358, base: 64, sigma: 0.05 },
  { name: 'Kurunegala', lat: 7.4863, lon: 80.3620, base: 58, sigma: 0.06 },
  { name: 'Anuradhapura', lat: 8.3114, lon: 80.4037, base: 57, sigma: 0.07 },
  { name: 'Trincomalee', lat: 8.5711, lon: 81.2335, base: 56, sigma: 0.06 },
  { name: 'Batticaloa', lat: 7.7170, lon: 81.7000, base: 55, sigma: 0.06 },
  { name: 'Badulla', lat: 6.9896, lon: 81.0550, base: 55, sigma: 0.05 },
  { name: 'Nuwara Eliya', lat: 6.9497, lon: 80.7891, base: 54, sigma: 0.05 },
  { name: 'Ratnapura', lat: 6.6828, lon: 80.3992, base: 56, sigma: 0.06 },
];

const BOUNDS = {
  minLat: 5.8,
  maxLat: 9.9,
  minLon: 79.6,
  maxLon: 81.95,
};

function randNorm() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

function generateMockSamples(total = 1000) {
  const nowIso = new Date().toISOString();
  const samples = [];

  const tryPush = (lat, lon, dB) => {
    if (lat < BOUNDS.minLat || lat > BOUNDS.maxLat || lon < BOUNDS.minLon || lon > BOUNDS.maxLon) return false;
    if (!pointInPolygon(lat, lon, SRILANKA_POLY)) return false;
    samples.push({ lat, lon, dB: Number(dB.toFixed(1)), timestamp: nowIso });
    return true;
  };

  const clusteredTarget = Math.floor(total * 0.7);
  while (samples.length < clusteredTarget) {
    const c = CLUSTERS[Math.floor(Math.random() * CLUSTERS.length)];
    const latOffset = randNorm() * c.sigma;
    const lonOffset = randNorm() * c.sigma;
    const dB = clamp(c.base + randNorm() * 10, 45, 95);
    const lat = c.lat + latOffset;
    const lon = c.lon + lonOffset;
    if (!tryPush(lat, lon, dB)) continue;
  }

  while (samples.length < total) {
    const lat = randomBetween(BOUNDS.minLat, BOUNDS.maxLat) + randNorm() * 0.01;
    const lon = randomBetween(BOUNDS.minLon, BOUNDS.maxLon) + randNorm() * 0.01;
    const spike = Math.random() < 0.06 ? randomBetween(8, 18) : 0;
    const base = randomBetween(46, 55) + spike;
    const dB = clamp(base, 44, 92);
    if (!tryPush(lat, lon, dB)) continue;
  }

  return samples;
}

function nudgeSamples(samples, changeRatio = 0.2) {
  const t = Date.now() / 1000;
  const nowIso = new Date().toISOString();
  return samples.map((s) => {
    const seed = s.lat * 7.1 + s.lon * 13.7;
    const pulse = Math.sin(t * 1.1 + seed) * 3.5 + Math.sin(t * 0.37 + seed * 0.5) * 2.0;
    const randomWalk = (Math.random() - 0.5) * 1.2;
    let dB = s.dB + pulse * 0.25 + randomWalk;
    if (Math.random() < 0.015) dB += randomBetween(6, 12);

    let lat = s.lat + (Math.random() - 0.5) * 0.004;
    let lon = s.lon + (Math.random() - 0.5) * 0.004;

    if (Math.random() < changeRatio * 0.08) {
      const c = CLUSTERS[Math.floor(Math.random() * CLUSTERS.length)];
      lat = c.lat + randNorm() * c.sigma * 0.8;
      lon = c.lon + randNorm() * c.sigma * 0.8;
      dB = c.base + randNorm() * 8;
    }

    if (!pointInPolygon(lat, lon, SRILANKA_POLY)) {
      lat = s.lat;
      lon = s.lon;
    }

    return {
      lat: clamp(lat, BOUNDS.minLat, BOUNDS.maxLat),
      lon: clamp(lon, BOUNDS.minLon, BOUNDS.maxLon),
      dB: Number(clamp(dB, 42, 98).toFixed(1)),
      timestamp: nowIso,
    };
  });
}

module.exports = {
  generateMockSamples,
  nudgeSamples,
};


