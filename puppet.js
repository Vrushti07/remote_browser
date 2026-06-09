const puppeteer = require('puppeteer-core');
const http = require('http');
const WebSocket = require('ws'); // Use built-in ws from puppeteer-core deps

(async () => {
  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    headless: 'new',
    defaultViewport: { width: 1280, height: 800 },
  });

  const page = await browser.newPage();
  await page.goto('https://example.com');

  // WebSocket server so the host Node.js server can talk to us
  const wss = new (require('ws').Server)({ port: 3001 });

  wss.on('connection', (ws) => {
    // Screenshot loop — sends a frame every 200ms
    const interval = setInterval(async () => {
      try {
        const shot = await page.screenshot({ encoding: 'base64', type: 'jpeg', quality: 70 });
        if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'frame', data: shot }));
      } catch {}
    }, 200);

    ws.on('message', async (raw) => {
      const msg = JSON.parse(raw);
      const { type, x, y, key, url } = msg;
      if (type === 'click')      await page.mouse.click(x, y);
      if (type === 'move')       await page.mouse.move(x, y);
      if (type === 'keydown')    await page.keyboard.press(key);
      if (type === 'scroll')     await page.mouse.wheel({ deltaY: msg.deltaY });
      if (type === 'navigate')   await page.goto(url);
    });

    ws.on('close', () => clearInterval(interval));
  });

  console.log('Puppet ready on ws://0.0.0.0:3001');
})();