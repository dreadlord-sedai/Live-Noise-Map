export type NoiseReading = {
  lat: number;
  lon: number;
  dB: number;
  timestamp: string;
  deviceId?: string;
};

export type TimeRange = '1h' | '24h' | '7d' | 'all';

export async function postNoise(baseUrl: string, reading: NoiseReading): Promise<void> {
  const res = await fetch(`${baseUrl}/noise`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reading),
  });
  if (!res.ok) throw new Error(`POST /noise failed: ${res.status}`);
}

export async function getNoise(baseUrl: string, params: { lat?: number; lon?: number; radius?: number; timeRange?: TimeRange } = {}): Promise<NoiseReading[]> {
  const query = new URLSearchParams(Object.entries(params).reduce((acc, [k, v]) => {
    if (v !== undefined && v !== null) acc[k] = String(v);
    return acc;
  }, {} as Record<string, string>));
  const url = `${baseUrl}/noise${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET /noise failed: ${res.status}`);
  return res.json();
}

export async function getUserNoiseHistory(baseUrl: string): Promise<NoiseReading[]> {
  const res = await fetch(`${baseUrl}/user/noise-history`);
  if (!res.ok) throw new Error(`GET /user/noise-history failed: ${res.status}`);
  return res.json();
}
