module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const accessToken = process.env.META_ACCESS_TOKEN;
  const pixelId = process.env.META_PIXEL_ID || '1566611764859334';

  if (!accessToken) {
    return res.status(500).json({ error: 'META_ACCESS_TOKEN not configured' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const {
    event_name = 'Lead',
    event_id,
    event_source_url,
    fbc,
    fbp,
    user_agent,
  } = body;

  if (!event_id || !event_source_url) {
    return res.status(400).json({ error: 'event_id and event_source_url are required' });
  }

  const clientIp =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    '';

  const userData = {
    client_ip_address: clientIp,
    client_user_agent: user_agent || req.headers['user-agent'] || '',
  };

  if (fbc) userData.fbc = fbc;
  if (fbp) userData.fbp = fbp;

  const payload = {
    data: [
      {
        event_name,
        event_time: Math.floor(Date.now() / 1000),
        event_id,
        action_source: 'website',
        event_source_url,
        user_data: userData,
      },
    ],
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(result);
    }

    return res.status(200).json({ ok: true, events_received: result.events_received ?? 1 });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to send event to Meta', message: error.message });
  }
};
