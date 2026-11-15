const https = require('https');

const BASE_URL = process.env.RENDER_URL || 'https://your-app-name.onrender.com';
const HEALTH_ENDPOINT = process.env.HEALTH_ENDPOINT || '/';
const INTERVAL_MINUTES = parseInt(process.env.INTERVAL_MINUTES) || 10;

const URL = `${BASE_URL.replace(/\/$/, '')}${HEALTH_ENDPOINT}`;

function ping() {
  https.get(URL, (res) => {
    console.log(`[${new Date().toISOString()}] Health check: ${res.statusCode} - ${URL}`);
  }).on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Error: ${err.message}`);
  });
}

console.log(`Starting keep-alive for ${URL} every ${INTERVAL_MINUTES} minutes`);
ping();
setInterval(ping, INTERVAL_MINUTES * 60 * 1000);