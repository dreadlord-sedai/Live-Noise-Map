import { collection, addDoc, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type NoiseSample = {
  lat: number;
  lon: number;
  dB: number;
  timestamp: string;
};

export async function addNoiseSample(sample: NoiseSample) {
  await addDoc(collection(db, 'noise_samples'), {
    ...sample,
    timestamp: Timestamp.fromDate(new Date(sample.timestamp)),
  });
}

export function subscribeToSamples(onData: (samples: NoiseSample[]) => void) {
  const q = query(collection(db, 'noise_samples'), orderBy('timestamp', 'desc'));
  return onSnapshot(q, (snap) => {
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
