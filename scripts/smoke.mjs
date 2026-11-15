#!/usr/bin/env node

/**
 * Smoke test script for Keepprint
 * Checks that the deployed URL, preview server, or built dist responds and contains the app shell string.
 */

import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';

const arg = process.argv[2];
const EXPECTED_STRING = 'Keepprint';

function checkDistFile() {
  const filePath = 'dist/index.html';
  if (!fs.existsSync(filePath)) {
    console.error(`[smoke] FAILURE: ${filePath} does not exist. Run npm run build first.`);
    process.exit(1);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  if (content.includes(EXPECTED_STRING)) {
    console.log(`[smoke] SUCCESS: Found expected string "${EXPECTED_STRING}" in ${filePath}.`);
    process.exit(0);
  } else {
    console.error(
      `[smoke] FAILURE: Expected string "${EXPECTED_STRING}" not found in ${filePath}.`
    );
    process.exit(1);
  }
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        return reject(new Error(`HTTP status ${res.statusCode}`));
      }
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(data);
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
  });
}

async function serveAndCheck() {
  const filePath = 'dist/index.html';
  if (!fs.existsSync(filePath)) {
    console.error(`[smoke] FAILURE: ${filePath} does not exist. Run npm run build first.`);
    process.exit(1);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(content);
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const liveUrl = `http://127.0.0.1:${port}`;
  console.log(`[smoke] Ephemeral preview server started at ${liveUrl}`);

  try {
    const html = await fetchUrl(liveUrl);
    if (html.includes(EXPECTED_STRING)) {
      console.log(`[smoke] SUCCESS: Live server at ${liveUrl} served "${EXPECTED_STRING}".`);
      server.close();
      process.exit(0);
    } else {
      console.error(`[smoke] FAILURE: Expected string "${EXPECTED_STRING}" not found in response.`);
      server.close();
      process.exit(1);
    }
  } catch (err) {
    console.error(`[smoke] FAILURE: Error fetching ephemeral server: ${err.message}`);
    server.close();
    process.exit(1);
  }
}

if (arg === '--serve') {
  await serveAndCheck();
} else if (arg === '--build' || (arg && fs.existsSync(arg))) {
  checkDistFile();
} else {
  const targetUrl = process.env.VITE_APP_URL || arg || 'http://localhost:5173';
  console.log(`[smoke] Checking target URL: ${targetUrl}`);
  try {
    const html = await fetchUrl(targetUrl);
    if (html.includes(EXPECTED_STRING)) {
      console.log(`[smoke] SUCCESS: Found expected string "${EXPECTED_STRING}" in response.`);
      process.exit(0);
    } else {
      console.error(`[smoke] FAILURE: Expected string "${EXPECTED_STRING}" not found in response.`);
      process.exit(1);
    }
  } catch (err) {
    if (!arg && fs.existsSync('dist/index.html')) {
      console.log(
        `[smoke] Target server not running (${err.message}), falling back to verifying dist/index.html...`
      );
      checkDistFile();
    } else {
      console.error(`[smoke] FAILURE: Unable to fetch URL: ${err.message}`);
      process.exit(1);
    }
  }
}
