const http = require('http');
const CryptoJS = require('crypto-js');
const APP_SECRET = "chate-secure-transport-key-2024";

const password = 'Password@123';
const encryptedPassword = CryptoJS.AES.encrypt(password, APP_SECRET).toString();

const data = JSON.stringify({
  username: 'santhosh',
  email: 'santhoshkvkd222@gmail.com',
  password: encryptedPassword,
  isEncrypted: true
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    console.log('BODY: ' + body);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
