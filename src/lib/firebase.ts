import { initializeApp, type FirebaseOptions, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore, initializeFirestore } from 'firebase/firestore';
import { getDatabase, type Database } from 'firebase/database';

const firebaseConfig: FirebaseOptions = {
	apiKey: 'AIzaSyCOCcQdAzkYxhfiEiQGCdoZA975PfsOu6A',
	authDomain: 'live-noise-map.firebaseapp.com',
	projectId: 'live-noise-map',
	storageBucket: 'live-noise-map.firebasestorage.app',
	messagingSenderId: '451956665233',
	appId: '1:451956665233:web:3e638a0e860f8c84c34830',
	databaseURL: 'https://live-noise-map-default-rtdb.asia-southeast1.firebasedatabase.app',
};

let appSingleton: FirebaseApp | null = null;
let cachedDb: Firestore | null = null;
let cachedRtdb: Database | null = null;

function ensureApp(): FirebaseApp {
	if (!appSingleton) {
		appSingleton = initializeApp(firebaseConfig);
		try {
			// Diagnostic: confirm which RTDB instance this app is configured to use
			console.log('[Firebase] Configured RTDB URL:', (firebaseConfig as any).databaseURL);
		} catch (_) {}
	}
	return appSingleton;
}

export function getDb(): Firestore | null {
	if (cachedDb) return cachedDb;
	const app = ensureApp();
	// Force long polling to avoid WebChannel 400 errors in constrained networks/proxies
	try {
		cachedDb = initializeFirestore(app, { experimentalForceLongPolling: true, useFetchStreams: false } as any);
	} catch (_e) {
		// If already initialized elsewhere, fall back to the existing instance
		cachedDb = getFirestore(app);
	}
	return cachedDb;
}

export function getRealtimeDb(): Database | null {
	if (cachedRtdb) return cachedRtdb;
	const app = ensureApp();
	cachedRtdb = getDatabase(app);
	return cachedRtdb;
}
