export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const url   = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    // 키 목록 조회
    const keysRes = await fetch(`${url}/lrange/log_keys/0/199`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const keysData = await keysRes.json();
    const keys = keysData.result || [];

    if (!keys.length) return res.status(200).json({ logs: [] });

    // 병렬로 로그 데이터 조회
    const values = await Promise.all(
      keys.map(k =>
        fetch(`${url}/get/${encodeURIComponent(k)}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.json()).then(d => d.result)
      )
    );

    const logs = values
      .filter(Boolean)
      .map(v => {
        try { return JSON.parse(decodeURIComponent(v)); }
        catch { return null; }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return res.status(200).json({ logs });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
