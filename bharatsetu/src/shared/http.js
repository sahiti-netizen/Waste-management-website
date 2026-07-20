'use strict';

/** Tiny promise-based HTTP helpers over Node's built-in http module. */

const http = require('http');
const { URL } = require('url');

/** POST a JSON body and resolve with the parsed JSON response. */
function postJson(url, body, { timeoutMs = 8000 } = {}) {
  return request('POST', url, body, { timeoutMs });
}

function getJson(url, { timeoutMs = 8000 } = {}) {
  return request('GET', url, undefined, { timeoutMs });
}

function request(method, url, body, { timeoutMs = 8000 } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const payload = body === undefined ? null : Buffer.from(JSON.stringify(body));
    const req = http.request(
      {
        method,
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        headers: {
          'content-type': 'application/json',
          ...(payload ? { 'content-length': payload.length } : {}),
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let parsed = null;
          try {
            parsed = text ? JSON.parse(text) : null;
          } catch (_e) {
            parsed = { raw: text };
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`request timed out after ${timeoutMs}ms`));
    });
    if (payload) req.write(payload);
    req.end();
  });
}

/** Read and JSON-parse the body of an incoming request. */
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      if (!text) return resolve(null);
      try {
        resolve(JSON.parse(text));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, obj) {
  const data = Buffer.from(JSON.stringify(obj, null, 2));
  res.writeHead(status, {
    'content-type': 'application/json',
    'content-length': data.length,
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': '*',
  });
  res.end(data);
}

module.exports = { postJson, getJson, request, readBody, sendJson };
