#!/usr/bin/env node
/**
 * TrueNAS WebSocket API Client
 * Usage: node truenas-ws.mjs <method> [params_json]
 * Example: node truenas-ws.mjs system.info
 *          node truenas-ws.mjs app.query '[]'
 *          node truenas-ws.mjs pool.dataset.create '{"name":"apps/config/test"}'
 */

import WebSocket from 'ws';

const TRUENAS_URL = process.env.TRUENAS_URL;
const TRUENAS_API_KEY = process.env.TRUENAS_API_KEY;

if (!TRUENAS_URL) {
  console.error('Error: TRUENAS_URL env var required (e.g., https://10.0.0.5:444)');
  process.exit(1);
}

if (!TRUENAS_API_KEY) {
  console.error('Error: TRUENAS_API_KEY env var required');
  process.exit(1);
}

const method = process.argv[2];
const params = process.argv[3] ? JSON.parse(process.argv[3]) : [];

if (!method) {
  console.error('Usage: truenas-ws.mjs <method> [params_json]');
  console.error('Example: truenas-ws.mjs system.info');
  process.exit(1);
}

const wsUrl = TRUENAS_URL.replace('https://', 'wss://').replace('http://', 'ws://') + '/websocket';
const ws = new WebSocket(wsUrl, { rejectUnauthorized: false });

let msgId = 1;

ws.on('open', () => {
  ws.send(JSON.stringify({ msg: 'connect', version: '1', support: ['1'] }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());

  if (msg.msg === 'connected') {
    ws.send(JSON.stringify({
      id: String(msgId++),
      msg: 'method',
      method: 'auth.login_with_api_key',
      params: [TRUENAS_API_KEY]
    }));
    return;
  }

  if (msg.id === '1') {
    if (msg.result === true) {
      ws.send(JSON.stringify({
        id: String(msgId++),
        msg: 'method',
        method: method,
        params: Array.isArray(params) ? params : [params]
      }));
    } else {
      console.error('Authentication failed:', msg.error?.reason || msg.result);
      ws.close();
      process.exit(1);
    }
    return;
  }

  if (msg.id === '2') {
    if (msg.error) {
      console.error('Error:', msg.error.reason);
      process.exit(1);
    }
    console.log(JSON.stringify(msg.result, null, 2));
    ws.close();
    process.exit(0);
  }
});

ws.on('error', (err) => {
  console.error('WebSocket error:', err.message);
  process.exit(1);
});

setTimeout(() => {
  console.error('Timeout');
  ws.close();
  process.exit(1);
}, 30000);
