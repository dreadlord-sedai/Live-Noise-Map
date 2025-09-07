// filepath: src/features/HeatmapData.ts
import { supabase } from '../lib/supabase';
export type TimeRange = 'all' | 'hour' | 'day';

export type NoiseSample = {
  lat: number;
  lon: number;
  dB: number;
  timestamp: string;
};

export async function addNoiseSample(sample: NoiseSample) {
  const { error } = await supabase
    .from('noise_samples')
    .insert([sample]);
  if (error) throw error;
}

export function subscribeToSamples(onData: (samples: NoiseSample[]) => void, range: TimeRange = 'all') {
  // Supabase does not have real-time queries for all plans; use polling or Realtime subscriptions
  const fetchSamples = async () => {
    let query = supabase.from('noise_samples').select('*');
    // Add time range filtering logic here if needed
    const { data, error } = await query;
    if (error) return;
    onData(data ?? []);
  };
  fetchSamples();
  // Optionally set up polling or Supabase Realtime subscription here
  return () => { /* cleanup logic */ };
}