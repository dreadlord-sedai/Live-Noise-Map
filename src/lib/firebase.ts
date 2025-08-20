import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

let cachedDb: Firestore | null = null;

function buildConfig(): FirebaseOptions | null {
	const cfg = {
		apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
		authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
		projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
		storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
		messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
		appId: import.meta.env.VITE_FIREBASE_APP_ID,
	} as const;

	const values = Object.values(cfg);
	const hasMissing = values.some((v) => !v || typeof v !== 'string' || v.trim() === '');
	if (hasMissing) return null;
	return cfg as unknown as FirebaseOptions;
}

export function getDb(): Firestore | null {
	if (cachedDb) return cachedDb;
	const cfg = buildConfig();
	if (!cfg) {
		console.warn('Firebase env vars missing. Skipping Firestore init.');
		return null;
	}
	const app = initializeApp(cfg);
	cachedDb = getFirestore(app);
	return cachedDb;
}
