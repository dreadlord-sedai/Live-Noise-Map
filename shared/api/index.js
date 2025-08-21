export async function postNoise(baseUrl, reading) {
  const res = await fetch(`${baseUrl}/noise`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reading),
  });
  if (!res.ok) throw new Error(`POST /noise failed: ${res.status}`);
}

export async function getNoise(baseUrl, params = {}) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
  const query = new URLSearchParams(Object.fromEntries(entries));
  const url = `${baseUrl}/noise${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET /noise failed: ${res.status}`);
  return res.json();
}

export async function getUserNoiseHistory(baseUrl) {
  const res = await fetch(`${baseUrl}/user/noise-history`);
  if (!res.ok) throw new Error(`GET /user/noise-history failed: ${res.status}`);
  return res.json();
}
