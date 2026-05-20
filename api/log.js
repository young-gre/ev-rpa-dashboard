export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const data = req.body;
    const timestamp = new Date().toISOString();
    const key = `log:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;

    const entry = JSON.stringify({
      timestamp,
      event:      data.event      || '',
      detail:     data.detail     || '',
      row_no:     data.row_no     || 0,
      machine_id: data.machine_id || '',
      hostname:   data.hostname   || '',
      version:    data.version    || '',
      car_type:   data.car_type   || '',
    });

    const url   = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    // 로그 저장 (30일 TTL)
    await fetch(`${url}/set/${key}/${encodeURIComponent(entry)}?ex=${60*60*24*30}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // 키 목록에 추가 (최대 500개)
    await fetch(`${url}/lpush/log_keys/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    await fetch(`${url}/ltrim/log_keys/0/499`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log(`[LOG] ${data.event} | ${data.hostname} | ${data.car_type} | ${data.detail}`);
    return res.status(200).json({ ok: true, timestamp });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
