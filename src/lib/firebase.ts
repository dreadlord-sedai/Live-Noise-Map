import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

// TODO: Replace these placeholder values with your actual Firebase project settings
const firebaseConfig: FirebaseOptions = {
	apiKey: 'AIzaSyCOCcQdAzkYxhfiEiQGCdoZA975PfsOu6A',
	authDomain: 'live-noise-map.firebaseapp.com',
	projectId: 'live-noise-map',
	storageBucket: 'live-noise-map.firebasestorage.app',
	messagingSenderId: '451956665233',
	appId: '1:451956665233:web:3e638a0e860f8c84c34830',
};

let cachedDb: Firestore | null = null;

export function getDb(): Firestore | null {
	if (cachedDb) return cachedDb;
	const app = initializeApp(firebaseConfig);
	cachedDb = getFirestore(app);
	if (
		firebaseConfig.apiKey?.startsWith('YOUR_') ||
		!firebaseConfig.projectId ||
		firebaseConfig.projectId === 'YOUR_PROJECT_ID'
	) {
		console.warn('Firebase config placeholders detected. Update hardcoded config in src/lib/firebase.ts');
	}
	return cachedDb;
}
