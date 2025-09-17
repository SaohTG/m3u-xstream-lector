import axios from 'axios';
import https from 'https';

export const http = axios.create({
  timeout: parseInt(process.env.REQUEST_TIMEOUT_MS || '20000', 10),
  maxRedirects: 5,
  headers: {
    'User-Agent': process.env.DEFAULT_USER_AGENT || 'Mozilla/5.0'
  },
  httpsAgent: new https.Agent({ rejectUnauthorized: false })
});
