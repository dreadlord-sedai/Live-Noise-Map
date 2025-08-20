import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

// TODO: Replace these placeholder values with your actual Firebase project settings
const firebaseConfig: FirebaseOptions = {
	apiKey: 'YOUR_API_KEY',
	authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
	projectId: 'YOUR_PROJECT_ID',
	storageBucket: 'YOUR_PROJECT_ID.appspot.com',
	messagingSenderId: 'YOUR_SENDER_ID',
	appId: 'YOUR_APP_ID',
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
