# Remote Browser

A mini TeamViewer for the browser. Streams a headless Chromium instance to a web UI with full mouse, keyboard, and scroll control.

## Stack
- Node.js + Express + ws (host server)
- Puppeteer + Chromium (inside Docker)
- Plain HTML frontend

## Requirements
- Docker Desktop
- Node.js 18+

## Setup

\```bash
npm install
docker build -t remote-browser .
node server.js
\```

Open http://localhost:8080, click **Start Browser**.