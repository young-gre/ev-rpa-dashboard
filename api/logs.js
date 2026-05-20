import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // 최근 로그 키 목록 조회
    const keys = await kv.lrange('log_keys', 0, 199);
    if (!keys || keys.length === 0) return res.status(200).json({ logs: [] });

    // 병렬로 로그 데이터 조회
    const values = await Promise.all(keys.map(k => kv.get(k)));
    const logs = values
      .filter(Boolean)
      .map(v => typeof v === 'string' ? JSON.parse(v) : v)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return res.status(200).json({ logs });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
