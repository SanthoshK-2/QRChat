export const APP_SECRET = "chate-secure-transport-key-2024";
const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

export const SERVER_URL = (hostname === 'localhost' || hostname.startsWith('192.168.')) 
  ? `http://${hostname}:5001`
  : window.location.origin; // For Cloudflare/Production (serve from same origin)

