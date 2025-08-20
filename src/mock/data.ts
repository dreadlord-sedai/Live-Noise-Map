export type MockSample = {
	lat: number;
	lon: number;
	dB: number;
	timestamp: string;
};

const CLUSTERS = [
	{ name: 'Colombo', lat: 6.9271, lon: 79.8612, base: 68 },
	{ name: 'Kandy', lat: 7.2906, lon: 80.6337, base: 60 },
	{ name: 'Galle', lat: 6.0535, lon: 80.2200, base: 62 },
	{ name: 'Jaffna', lat: 9.6615, lon: 80.0255, base: 58 },
	{ name: 'Matara', lat: 5.9485, lon: 80.5469, base: 59 },
];

function randNorm(): number {
	// Box–Muller transform
	let u = 0, v = 0;
	while (u === 0) u = Math.random();
	while (v === 0) v = Math.random();
	return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function generateMockSamples(count: number = 300): MockSample[] {
	const samples: MockSample[] = [];
	for (let i = 0; i < count; i++) {
		const c = CLUSTERS[Math.floor(Math.random() * CLUSTERS.length)];
		const latOffset = randNorm() * 0.08; // ~9km
		const lonOffset = randNorm() * 0.08; // ~9km
		const dB = Math.max(40, Math.min(90, c.base + randNorm() * 10));
		samples.push({
			lat: c.lat + latOffset,
			lon: c.lon + lonOffset,
			dB: Number(dB.toFixed(1)),
			timestamp: new Date().toISOString(),
		});
	}
	return samples;
}

export function nudgeSamples(samples: MockSample[], changeRatio = 0.1): MockSample[] {
	const nowIso = new Date().toISOString();
	return samples.map((s) => {
		if (Math.random() > changeRatio) return s;
		const dLat = (Math.random() - 0.5) * 0.01;
		const dLon = (Math.random() - 0.5) * 0.01;
		const dDb = (Math.random() - 0.5) * 6;
		return {
			lat: s.lat + dLat,
			lon: s.lon + dLon,
			dB: Number(Math.max(40, Math.min(92, s.dB + dDb)).toFixed(1)),
			timestamp: nowIso,
		};
	});
}
