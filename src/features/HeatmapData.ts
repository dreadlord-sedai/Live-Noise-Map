import { supabase } from '../lib/supabase';

export type NoiseSample = {
  lat: number;
  lon: number;
  dB: number;
  timestamp: string;
};

export type TimeRange = 'all' | 'hour' | 'day';

function getTimeRangeFilter(range: TimeRange) {
  if (range === 'all') return {};
  const now = new Date();
  let since: Date;
  if (range === 'hour') {
    since = new Date(now.getTime() - 60 * 60 * 1000);
  } else if (range === 'day') {
    since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  } else {
    return {};
  }
  return { gte: since.toISOString() };
}

export async function addNoiseSample(sample: NoiseSample) {
  const { error } = await supabase
    .from('noise_samples')
    .insert([sample]);
  if (error) throw error;
}

export function subscribeToSamples(
  onData: (samples: NoiseSample[]) => void,
  range: TimeRange = 'all'
) {
  let active = true;

  async function fetchSamples() {
    let query = supabase.from('noise_samples').select('*');
    const filter = getTimeRangeFilter(range);
    if (filter.gte) {
      query = query.gte('timestamp', filter.gte);
    }
    const { data, error } = await query;
    if (!active) return;
    if (error) return;
    onData(data ?? []);
  }

  // Poll every 5 seconds for new data
  fetchSamples();
  const interval = setInterval(fetchSamples, 5000);

  // Optionally: Supabase Realtime subscription (if enabled on your table)
  // const channel = supabase
  //   .channel('noise_samples_changes')
  //   .on('postgres_changes', { event: '*', schema: 'public', table: 'noise_samples' }, payload => {
  //     fetchSamples();
  //   })
  //   .subscribe();

  return () => {
	active = false;
	clearInterval(interval);
	// channel.unsubscribe();
  }
}