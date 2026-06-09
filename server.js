const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const Docker = require('dockerode');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const docker = new Docker();

app.use(express.static('public'));

let container = null;
let puppetWs = null;

async function startBrowser() {
  if (container) return;

  container = await docker.createContainer({
    Image: 'remote-browser',
    ExposedPorts: { '3001/tcp': {} },
    HostConfig: {
      PortBindings: { '3001/tcp': [{ HostPort: '3001' }] },
    },
  });
  await container.start();
  console.log('Container started');

  // Give Puppeteer a moment to boot, then connect
  await new Promise(r => setTimeout(r, 4000));
  puppetWs = new WebSocket('ws://localhost:3001');
  puppetWs.on('error', err => console.error('Puppet WS error:', err.message));
}

async function stopBrowser() {
  if (!container) return;
  try { await container.stop(); await container.remove(); } catch {}
  container = null;
  puppetWs = null;
}

// Proxy between browser clients and the puppet container
wss.on('connection', (clientWs) => {
  console.log('UI client connected');

  // Forward frames from puppet → browser
  const forwardFrame = (data) => {
    if (clientWs.readyState === WebSocket.OPEN) clientWs.send(data);
  };

  const attachPuppet = () => {
    if (puppetWs) puppetWs.on('message', forwardFrame);
  };

  attachPuppet();

  // Forward input events browser → puppet
  clientWs.on('message', async (raw) => {
    const msg = JSON.parse(raw);
    if (msg.type === 'start') {
      await startBrowser();
      attachPuppet();
      clientWs.send(JSON.stringify({ type: 'status', status: 'ready' }));
    } else if (msg.type === 'stop') {
      await stopBrowser();
      clientWs.send(JSON.stringify({ type: 'status', status: 'stopped' }));
    } else if (puppetWs && puppetWs.readyState === WebSocket.OPEN) {
      puppetWs.send(raw.toString());
    }
  });

  clientWs.on('close', () => {
    if (puppetWs) puppetWs.off('message', forwardFrame);
  });
});

server.listen(8080, () => console.log('Server at http://localhost:8080'));