FROM node:20-slim

RUN apt-get update && apt-get install -y \
    chromium \
    --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY puppet.js .
RUN npm init -y && npm install puppeteer-core ws

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

CMD ["node", "puppet.js"]