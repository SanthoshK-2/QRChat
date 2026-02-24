const axios = require('axios');

const RENDER_API_URL = 'https://qrchat-1.onrender.com/api/sync';
const SYNC_KEY = 'chate-secure-sync-2024';

async function ensureConnections() {
  console.log('--- ENSURING KUMAR CONNECTIONS ---');
  try {
    const res = await axios.get(`${RENDER_API_URL}/full`, {
      headers: { 'x-sync-key': SYNC_KEY },
      timeout: 15000
    });
    const users = res.data.users || [];
    const findUser = (name) => users.find(u => (u.username || '').trim().toLowerCase() === name.trim().toLowerCase());
    const kumar = findUser('Kumar');
    if (!kumar) {
      console.log('Kumar user not found on cloud.');
      return;
    }
    const targets = ['santhosh', 'Narasimma', 'Kishore ']
      .map(findUser)
      .filter(Boolean)
      .filter(u => u.id !== kumar.id);

    if (targets.length === 0) {
      console.log('No target users found to connect.');
      return;
    }

    const connectionsPayload = targets.map(u => ({
      requesterId: kumar.id,
      receiverId: u.id,
      status: 'accepted'
    }));

    console.log('Creating/Updating connections:', connectionsPayload.length);
    await axios.post(`${RENDER_API_URL}/restore`, {
      connections: connectionsPayload
    }, {
      headers: { 'x-sync-key': SYNC_KEY },
      timeout: 15000
    });
    console.log('✅ Connections ensured.');
  } catch (e) {
    console.error('Error:', e.response?.data || e.message);
  }
}

ensureConnections();
