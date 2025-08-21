import { initializeApp, type FirebaseOptions, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getDatabase, type Database } from 'firebase/database';

const firebaseConfig: FirebaseOptions = {
	apiKey: 'AIzaSyCOCcQdAzkYxhfiEiQGCdoZA975PfsOu6A',
	authDomain: 'live-noise-map.firebaseapp.com',
	projectId: 'live-noise-map',
	storageBucket: 'live-noise-map.firebasestorage.app',
	messagingSenderId: '451956665233',
	appId: '1:451956665233:web:3e638a0e860f8c84c34830',
};

let appSingleton: FirebaseApp | null = null;
let cachedDb: Firestore | null = null;
let cachedRtdb: Database | null = null;

function ensureApp(): FirebaseApp {
	if (!appSingleton) {
		appSingleton = initializeApp(firebaseConfig);
	}
	return appSingleton;
}

export function getDb(): Firestore | null {
	if (cachedDb) return cachedDb;
	const app = ensureApp();
	cachedDb = getFirestore(app);
	return cachedDb;
}

export function getRealtimeDb(): Database | null {
	if (cachedRtdb) return cachedRtdb;
	const app = ensureApp();
	cachedRtdb = getDatabase(app);
	return cachedRtdb;
}
