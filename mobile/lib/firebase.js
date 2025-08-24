import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, off } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyCOCcQdAzkYxhfiEiQGCdoZA975PfsOu6A',
  authDomain: 'live-noise-map.firebaseapp.com',
  projectId: 'live-noise-map',
  storageBucket: 'live-noise-map.firebasestorage.app',
  messagingSenderId: '451956665233',
  appId: '1:451956665233:web:3e638a0e860f8c84c34830',
  databaseURL: 'https://live-noise-map-default-rtdb.asia-southeast1.firebasedatabase.app',
};

let appSingleton = null;
let cachedRtdb = null;

function ensureApp() {
  if (!appSingleton) {
    appSingleton = initializeApp(firebaseConfig);
    console.log('[Firebase] Configured RTDB URL:', firebaseConfig.databaseURL);
  }
  return appSingleton;
}

export function getRealtimeDb() {
  if (cachedRtdb) return cachedRtdb;
  const app = ensureApp();
  cachedRtdb = getDatabase(app);
  return cachedRtdb;
}

export function subscribeToNoiseData(callback) {
  const db = getRealtimeDb();
  if (!db) {
    console.error('[Firebase] Database not available');
    return null;
  }

  const noiseRef = ref(db, 'noiseReports');
  const unsubscribe = onValue(noiseRef, (snapshot) => {
    try {
      const data = snapshot.val();
      if (data) {
        // Convert Firebase object to array with error handling
        const noiseArray = Object.keys(data).map(key => {
          try {
            return {
              id: key,
              ...data[key]
            };
          } catch (e) {
            console.warn('[Firebase] Error processing record:', key, e);
            return null;
          }
        }).filter(Boolean); // Remove null entries
        callback(noiseArray);
      } else {
        callback([]);
      }
    } catch (error) {
      console.error('[Firebase] Error processing snapshot:', error);
      callback([]);
    }
  }, (error) => {
    console.error('[Firebase] Error fetching data:', error);
    callback([]);
  });

  return unsubscribe;
}
