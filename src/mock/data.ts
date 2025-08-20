export type MockSample = {
	lat: number;
	lon: number;
	dB: number;
	timestamp: string;
};

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

function randNorm(): number {
	// Box–Muller transform
	let u = 0, v = 0;
	while (u === 0) u = Math.random();
	while (v === 0) v = Math.random();
	return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function clamp(x: number, lo: number, hi: number): number {
	return Math.max(lo, Math.min(hi, x));
}

function randomBetween(a: number, b: number): number {
	return a + Math.random() * (b - a);
}

export function generateMockSamples(total: number = 1200): MockSample[] {
	const nowIso = new Date().toISOString();
	const samples: MockSample[] = [];

	// 70% clustered urban-ish points
	const clusteredCount = Math.floor(total * 0.7);
	for (let i = 0; i < clusteredCount; i++) {
		const c = CLUSTERS[Math.floor(Math.random() * CLUSTERS.length)];
		const latOffset = randNorm() * c.sigma;
		const lonOffset = randNorm() * c.sigma;
		const dB = clamp(c.base + randNorm() * 10, 45, 92);
		samples.push({
			lat: c.lat + latOffset,
			lon: c.lon + lonOffset,
			dB: Number(dB.toFixed(1)),
			timestamp: nowIso,
		});
	}

	// 30% low-intensity background field across the island
	const backgroundCount = total - clusteredCount;
	for (let i = 0; i < backgroundCount; i++) {
		const lat = randomBetween(BOUNDS.minLat, BOUNDS.maxLat) + randNorm() * 0.01;
		const lon = randomBetween(BOUNDS.minLon, BOUNDS.maxLon) + randNorm() * 0.01;
		// base 46-55 with rare louder spikes
		const spike = Math.random() < 0.06 ? randomBetween(8, 18) : 0;
		const base = randomBetween(46, 55) + spike;
		samples.push({
			lat,
			lon,
			dB: Number(clamp(base, 44, 90).toFixed(1)),
			timestamp: nowIso,
		});
	}

	return samples;
}

export function nudgeSamples(samples: MockSample[], changeRatio = 0.2): MockSample[] {
	const t = Date.now() / 1000;
	const nowIso = new Date().toISOString();
	return samples.map((s) => {
		// Derive a pseudo-seed from lat/lon for stable local pulsing
		const seed = (s.lat * 7.1 + s.lon * 13.7);
		const pulse = Math.sin(t * 1.1 + seed) * 3.5 + Math.sin(t * 0.37 + seed * 0.5) * 2.0;
		const randomWalk = (Math.random() - 0.5) * 1.2;
		let dB = s.dB + pulse * 0.25 + randomWalk;

		// Occasional transient surge (e.g., traffic peak)
		if (Math.random() < 0.015) dB += randomBetween(6, 12);

		// Small spatial jitter
		let lat = s.lat + (Math.random() - 0.5) * 0.004;
		let lon = s.lon + (Math.random() - 0.5) * 0.004;

		// Rarely relocate a point near a random cluster to mimic movement
		if (Math.random() < changeRatio * 0.08) {
			const c = CLUSTERS[Math.floor(Math.random() * CLUSTERS.length)];
			lat = c.lat + randNorm() * c.sigma * 0.8;
			lon = c.lon + randNorm() * c.sigma * 0.8;
			dB = c.base + randNorm() * 8;
		}

		return {
			lat: clamp(lat, BOUNDS.minLat, BOUNDS.maxLat),
			lon: clamp(lon, BOUNDS.minLon, BOUNDS.maxLon),
			dB: Number(clamp(dB, 42, 95).toFixed(1)),
			timestamp: nowIso,
		};
	});
}
