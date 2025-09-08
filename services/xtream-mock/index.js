const express = require('express');
const app = express();

app.get('/player_api.php', (req, res) => {
  const { username, password, action } = req.query;
  const ok = username === 'u' && password === 'p';

  if (!ok) {
    return res.json({
      user_info: { auth: 0, status: 'Expired' },
      server_info: { url: req.headers.host }
    });
  }

  if (action === 'get_live_streams') {
    return res.json([
      { name: 'News HD', stream_id: 1, stream_type: 'live', category_id: 1 }
    ]);
  }

  return res.json({
    user_info: { auth: 1, status: 'Active' },
    server_info: { url: req.headers.host },
    available_channels: [
      { name: 'News HD', stream_url: 'http://example/stream.m3u8', epg_channel_id: 'news' }
    ]
  });
});

app.listen(8888, () => console.log('xtream-mock on 8888'));
