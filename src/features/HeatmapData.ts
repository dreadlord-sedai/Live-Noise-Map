import { collection, addDoc, onSnapshot, query, orderBy, Timestamp, where, getDocs } from 'firebase/firestore';
import { ref, onValue, push } from 'firebase/database';
import { getDb, getRealtimeDb } from '../lib/firebase';

export type NoiseSample = {
	lat: number;
	lon: number;
	dB: number;
	timestamp: string;
};

export type TimeRange = 'all' | '24h' | '7d';

function getCutoffDate(range: TimeRange): Date | null {
	if (range === '24h') {
		const d = new Date();
		d.setDate(d.getDate() - 1);
		return d;
	}
	if (range === '7d') {
		const d = new Date();
		d.setDate(d.getDate() - 7);
		return d;
	}
	return null;
}

export async function addNoiseSample(sample: NoiseSample) {
	// RTDB-only write
	const rtdb = getRealtimeDb();
	if (!rtdb) {
		console.warn('Realtime Database not configured; sample not saved.', sample);
		return;
	}
	const reportsRef = ref(rtdb, 'noiseReports');
	await push(reportsRef, {
		latitude: sample.lat,
		longitude: sample.lon,
		dbValue: sample.dB,
		timestamp: Date.parse(sample.timestamp) || Date.now(),
	});
}

export function subscribeToSamples(onData: (samples: NoiseSample[]) => void, range: TimeRange = 'all') {
	const db = getDb();
	if (!db) {
		onData([]);
		return () => {};
	}
	const cutoff = getCutoffDate(range);
	const col = collection(db, 'noise_samples');
	let qRef = query(col, orderBy('timestamp', 'desc'));
	if (cutoff) {
		qRef = query(col, where('timestamp', '>=', Timestamp.fromDate(cutoff)), orderBy('timestamp', 'desc'));
	}
	let deliveredOnce = false;
	let fallbackTimer: any = null;
	let pollingTimer: any = null;

	const startPolling = () => {
		if (pollingTimer) return;
		const tick = async () => {
			try {
				const snap = await getDocs(qRef);
				const data: NoiseSample[] = snap.docs.map((d) => {
					const v = d.data() as any;
					return {
						lat: v.lat,
						lon: v.lon,
						dB: v.dB,
						timestamp: (v.timestamp?.toDate?.() ?? new Date()).toISOString(),
					};
				});
				onData(data);
			} catch (_e) {
				// ignore; will retry next tick
			}
			pollingTimer = setTimeout(tick, 5000);
		};
		tick();
	};

	const unsub = onSnapshot(qRef, {
		next: (snap) => {
			deliveredOnce = true;
			if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null; }
			const data: NoiseSample[] = snap.docs.map((d) => {
				const v = d.data() as any;
				return {
					lat: v.lat,
					lon: v.lon,
					dB: v.dB,
					timestamp: (v.timestamp?.toDate?.() ?? new Date()).toISOString(),
				};
			});
			onData(data);
		},
		error: (_err) => {
			// Switch to polling on error
			startPolling();
		},
		complete: () => {
			// Switch to polling if stream completes
			startPolling();
		},
	});

	// If no realtime event within 2.5s, assume blocked and fall back to polling
	fallbackTimer = setTimeout(() => {
		if (!deliveredOnce) {
			try { unsub(); } catch {}
			startPolling();
		}
	}, 2500);

	return () => {
		try { unsub(); } catch {}
		if (fallbackTimer) clearTimeout(fallbackTimer);
		if (pollingTimer) clearTimeout(pollingTimer);
	};
}

export function subscribeToRtdbReports(onData: (samples: NoiseSample[]) => void): () => void {
	const rtdb = getRealtimeDb();
	if (!rtdb) {
		onData([]);
		return () => {};
	}

	// Accept common paths IoT devices might use
	// Listen to both legacy root 'noiseReports' and nested 'devices' structures
	const candidatePaths = ['noiseReports', 'devices'];

	function normalizeOne(record: any): NoiseSample | null {
		if (!record || typeof record !== 'object') return null;
		const lat = Number(record.lat ?? record.latitude ?? record.Latitude);
		const lon = Number(record.lon ?? record.lng ?? record.longitude ?? record.Longitude);
		const dB = Number(record.dB ?? record.db ?? record.dbValue ?? record.decibels ?? record.spl);
		let tsRaw = record.timestamp ?? record.ts ?? record.time ?? record.createdAt;
		let iso = new Date().toISOString();
		if (tsRaw != null) {
			const num = Number(tsRaw);
			if (!Number.isNaN(num)) {
				// If seconds, convert to ms
				const ms = num < 1e12 ? num * 1000 : num;
				iso = new Date(ms).toISOString();
			} else if (typeof tsRaw === 'string') {
				const parsed = Date.parse(tsRaw);
				if (!Number.isNaN(parsed)) iso = new Date(parsed).toISOString();
			}
		}
		if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(dB)) return null;
		return { lat, lon, dB, timestamp: iso };
	}

	function extractSamples(val: any): NoiseSample[] {
		const out: NoiseSample[] = [];
		if (!val) return out;
		const walk = (node: any) => {
			if (!node) return;
			if (Array.isArray(node)) {
				for (const item of node) walk(item);
				return;
			}
			if (typeof node === 'object') {
				// If this object itself looks like a reading, capture it
				const maybe = normalizeOne(node);
				if (maybe) {
					out.push(maybe);
					return; // don't descend further to avoid duplicates
				}
				for (const key of Object.keys(node)) {
					walk(node[key]);
				}
			}
		};
		walk(val);
		return out;
	}

	let pending: Record<string, NoiseSample[]> = {};
	let debounceTimer: any = null;
	const unsubs: Array<() => void> = [];

	const flush = () => {
		const merged: NoiseSample[] = [];
		for (const k of Object.keys(pending)) merged.push(...pending[k]);
		pending = {};
		// Log the samples that will be rendered on the map
		try {
			console.log('[RTDB] Emitting samples to map (count=', merged.length, '):', merged);
		} catch (_e) {}
		onData(merged);
	};

	for (const path of candidatePaths) {
		const r = ref(rtdb, path);
		const off = onValue(r, (snap) => {
			const val = snap.val();
			try {
				if (path === 'devices' && val && typeof val === 'object') {
					const deviceIds = Object.keys(val);
					console.log('[RTDB] devices root keys (deviceIds):', deviceIds);
					const firstDeviceId = deviceIds[0];
					if (firstDeviceId) {
						const devNode = val[firstDeviceId];
						const reportContainer = devNode?.noiseReports || devNode?.reports || devNode?.readings;
						if (reportContainer && typeof reportContainer === 'object') {
							const reportIds = Object.keys(reportContainer);
							console.log('[RTDB] first device reportIds:', reportIds.slice(0, 5));
							const firstReportId = reportIds[0];
							if (firstReportId) {
								const firstReport = reportContainer[firstReportId];
								console.log('[RTDB] first report sample keys:', Object.keys(firstReport || {}));
							}
						} else {
							console.log('[RTDB] expected noiseReports under device node but did not find it');
						}
					}
				}
			} catch (_e) {}
			const samples = extractSamples(val);
			pending[path] = samples;
			if (!debounceTimer) {
				debounceTimer = setTimeout(() => {
					debounceTimer = null;
					flush();
				}, 250);
			}
			if ((samples?.length ?? 0) === 0) {
				console.debug('[RTDB] Path has no samples yet:', path);
			} else {
				console.debug('[RTDB] Received samples from path', path, 'count=', samples.length);
			}
		}, (err: any) => {
			console.error('[RTDB] Subscription error for path', path, (err && (err.code || err.name || String(err))) );
		});
		unsubs.push(() => off());
	}

	return () => {
		for (const u of unsubs) {
			try { u(); } catch {}
		}
		if (debounceTimer) clearTimeout(debounceTimer);
	};
}
