import { collection, addDoc, onSnapshot, query, orderBy, Timestamp, where } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
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
	const db = getDb();
	if (!db) {
		console.warn('Firestore not configured; sample not saved.', sample);
		return;
	}
	await addDoc(collection(db, 'noise_samples'), {
		...sample,
		timestamp: Timestamp.fromDate(new Date(sample.timestamp)),
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
	return onSnapshot(qRef, (snap) => {
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
	});
}

export function subscribeToRtdbReports(onData: (samples: NoiseSample[]) => void): () => void {
	const rtdb = getRealtimeDb();
	if (!rtdb) {
		onData([]);
		return () => {};
	}
	const reportsRef = ref(rtdb, 'noiseReports');
	const unsub = onValue(reportsRef, (snap) => {
		const val = snap.val() || {};
		const samples: NoiseSample[] = Object.keys(val).map((key) => {
			const r = val[key];
			return {
				lat: Number(r.latitude),
				lon: Number(r.longitude),
				dB: Number(r.dbValue),
				timestamp: r.timestamp ? new Date(r.timestamp).toISOString() : new Date().toISOString(),
			};
		});
		onData(samples);
	});
	return unsub;
}
