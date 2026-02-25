const axios = require('axios');

(async () => {
  try {
    const res = await axios.post('http://localhost:5001/api/auth/login', {
      username: 'santhosh',
      password: 'vkdsanthosh2',
      isEncrypted: false
    });
    console.log('OK', res.status, res.data);
  } catch (e) {
    const status = e.response ? e.response.status : 'NO_STATUS';
    const data = e.response ? e.response.data : e.message;
    console.log('ERR', status, data);
  }
})(); 
