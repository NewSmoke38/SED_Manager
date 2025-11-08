const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
require('dotenv').config();

const deviceRoutes = require('./routes/devices');
const sshTerminal = require('./services/sshTerminal');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

app.use('/api/devices', deviceRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

sshTerminal.initialize(wss);

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Edge Device Manager Backend running on port ${PORT}`);
  console.log(`WebSocket server ready for SSH terminals`);
});


