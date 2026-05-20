import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const data = req.body;
    const timestamp = new Date().toISOString();
    const key = `log:${timestamp}:${Math.random().toString(36).slice(2, 7)}`;

    const entry = {
      timestamp,
      event:      data.event      || '',
      detail:     data.detail     || '',
      row_no:     data.row_no     || 0,
      machine_id: data.machine_id || '',
      hostname:   data.hostname   || '',
      version:    data.version    || '',
      car_type:   data.car_type   || '',
    };

    // KV에 저장 (30일 TTL)
    await kv.set(key, JSON.stringify(entry), { ex: 60 * 60 * 24 * 30 });

    // 최근 로그 키 목록 유지 (최대 500개)
    await kv.lpush('log_keys', key);
    await kv.ltrim('log_keys', 0, 499);

    console.log(`[LOG] ${entry.event} | ${entry.hostname} | ${entry.car_type} | ${entry.detail}`);

    return res.status(200).json({ ok: true, timestamp });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
