// Compose ICE servers from environment variables with safe defaults
// TURN is optional; when not set we return STUN-only which still works on open networks

function parseTurnUrls() {
  const raw = process.env.TURN_URLS || process.env.TURN_URL || '';
  const urls = raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  return urls;
}

exports.getIceServers = async (req, res) => {
  try {
    const stunDefaults = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ];

    const iceServers = [...stunDefaults];
    const turnUrls = parseTurnUrls();
    const turnUser = process.env.TURN_USERNAME || process.env.TURN_USER || '';
    const turnCred = process.env.TURN_CREDENTIAL || process.env.TURN_PASS || '';

    if (turnUrls.length && turnUser && turnCred) {
      iceServers.push({
        urls: turnUrls,
        username: turnUser,
        credential: turnCred
      });
    }

    res.json({ iceServers });
  } catch (e) {
    console.error('ICE config error:', e);
    res.json({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
  }
};

