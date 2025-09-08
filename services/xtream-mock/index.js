const express = require('express');
const app = express();
app.get('/player_api.php', (_req, res) => {
  res.json({
    user_info: { auth:1, status:'Active' },
    available_channels: [
      { name:'News HD', stream_url:'http://example/stream.m3u8', epg_channel_id:'news' }
    ]
  });
});
app.listen(8888, () => console.log('xtream-mock on 8888'));
