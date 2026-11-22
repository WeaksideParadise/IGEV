#!/usr/bin/env node
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAX_BODY_BYTES = 512 * 1024; // 512 KB
const MAX_MESSAGE_LEN = 20000;
const MIN_MESSAGE_LEN = 3;
const MAX_EMAIL_LEN = 320;
const MAX_DIAGNOSTICS_BYTES = 256 * 1024; // 256 KB
const MAX_LIST_ITEMS = 50;
const SAFE_FILENAME_RE = /^[A-Za-z0-9._-]+\.json$/;

function envInt(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function createRateLimiter(options = {}) {
  const maxPerWindow = options.maxPerHour || 5;
  const windowMs = options.windowMs || 60 * 60 * 1000;
  const minSpacingMs = options.minSpacingMs || 10 * 1000;
  const maxTrackedIps = options.maxTrackedIps || 512;
  const nowFn = options.now || (() => Date.now());
  const store = new Map(); // ip -> { timestamps: number[], lastSeen: number }

  function check(ip) {
    const now = nowFn();
    let entry = store.get(ip);

    if (entry) {
      // Refresh LRU order
      store.delete(ip);
      store.set(ip, entry);
      entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
    } else {
      if (store.size >= maxTrackedIps) {
        const oldestKey = store.keys().next().value;
        if (oldestKey !== undefined) store.delete(oldestKey);
      }
      entry = { timestamps: [], lastSeen: now };
      store.set(ip, entry);
    }

    const last = entry.timestamps[entry.timestamps.length - 1];
    if (last !== undefined && now - last < minSpacingMs) {
      const retryAfterSec = Math.max(1, Math.ceil((minSpacingMs - (now - last)) / 1000));
      return { allowed: false, retryAfterSec, reason: 'spacing' };
    }

    if (entry.timestamps.length >= maxPerWindow) {
      const oldest = entry.timestamps[0];
      const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
      return { allowed: false, retryAfterSec, reason: 'hourly_limit' };
    }

    entry.timestamps.push(now);
    entry.lastSeen = now;
    return { allowed: true };
  }

  return { check, _store: store };
}

function evictOldestIfNeeded(feedbackDir, maxFolderBytes, maxFiles) {
  if (!fs.existsSync(feedbackDir)) return;
  const names = fs.readdirSync(feedbackDir).filter((f) => SAFE_FILENAME_RE.test(f));
  const entries = [];
  let totalBytes = 0;

  for (const name of names) {
    const fullPath = path.join(feedbackDir, name);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isFile()) {
        entries.push({ name, fullPath, size: stat.size, mtimeMs: stat.mtimeMs });
        totalBytes += stat.size;
      }
    } catch (_) {
      // Ignore files deleted concurrently
    }
  }

  if (entries.length <= maxFiles && totalBytes <= maxFolderBytes) {
    return;
  }

  // Sort oldest first by mtimeMs, then filename for determinism
  entries.sort((a, b) => a.mtimeMs - b.mtimeMs || a.name.localeCompare(b.name));

  let remainingFiles = entries.length;
  for (const entry of entries) {
    if (remainingFiles <= maxFiles && totalBytes <= maxFolderBytes) break;
    try {
      fs.unlinkSync(entry.fullPath);
      totalBytes -= entry.size;
      remainingFiles -= 1;
    } catch (_) {
      // Ignore unlink errors
    }
  }
}

function sendJson(res, status, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders
  });
  res.end(body);
}

function readBoundedBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const contentLength = req.headers['content-length'];
    if (contentLength && Number.parseInt(contentLength, 10) > maxBytes) {
      const err = new Error('Payload too large');
      err.statusCode = 413;
      return reject(err);
    }

    const chunks = [];
    let total = 0;
    let aborted = false;

    req.on('data', (chunk) => {
      if (aborted) return;
      total += chunk.length;
      if (total > maxBytes) {
        aborted = true;
        const err = new Error('Payload too large');
        err.statusCode = 413;
        reject(err);
        req.resume();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (!aborted) resolve(Buffer.concat(chunks).toString('utf8'));
    });

    req.on('error', (err) => {
      if (!aborted) reject(err);
    });
  });
}

function createFeedbackHandler(options = {}) {
  const feedbackDir = path.resolve(options.feedbackDir || process.env.FEEDBACK_DIR || path.join(process.cwd(), 'feedback'));
  const maxFolderBytes = (options.maxFolderMb || envInt('FEEDBACK_MAX_FOLDER_MB', 32)) * 1024 * 1024;
  const maxFiles = options.maxFiles || envInt('FEEDBACK_MAX_FILES', 2000);
  const rateLimiter = createRateLimiter(options.rateLimit || {});

  function getClientIp(req) {
    const xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string' && xff.trim()) {
      return xff.split(',')[0].trim();
    }
    return (req.socket && req.socket.remoteAddress) || '127.0.0.1';
  }

  return async function handleFeedback(req, res) {
    const url = new URL(req.url || '/', 'http://localhost');
    if (url.pathname !== '/api/feedback') {
      return false;
    }

    if (req.method === 'GET') {
      const fileParam = url.searchParams.get('file');
      if (fileParam !== null) {
        if (!SAFE_FILENAME_RE.test(fileParam)) {
          sendJson(res, 400, { error: 'Invalid filename' });
          return true;
        }
        const fullPath = path.join(feedbackDir, fileParam);
        if (!fullPath.startsWith(feedbackDir + path.sep) && fullPath !== feedbackDir) {
          sendJson(res, 400, { error: 'Invalid filename' });
          return true;
        }
        if (!fs.existsSync(fullPath)) {
          sendJson(res, 404, { error: 'Feedback entry not found' });
          return true;
        }
        try {
          const raw = fs.readFileSync(fullPath, 'utf8');
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store'
          });
          res.end(raw);
        } catch (_) {
          sendJson(res, 500, { error: 'Failed to read feedback entry' });
        }
        return true;
      }

      if (!fs.existsSync(feedbackDir)) {
        sendJson(res, 200, { items: [], count: 0 });
        return true;
      }

      const files = fs.readdirSync(feedbackDir).filter((f) => SAFE_FILENAME_RE.test(f));
      const metas = [];
      for (const name of files) {
        try {
          const stat = fs.statSync(path.join(feedbackDir, name));
          if (stat.isFile()) {
            metas.push({ file: name, size: stat.size, mtime: new Date(stat.mtimeMs).toISOString(), mtimeMs: stat.mtimeMs });
          }
        } catch (_) {
          // Ignore
        }
      }
      metas.sort((a, b) => b.mtimeMs - a.mtimeMs || b.file.localeCompare(a.file));
      const items = metas.slice(0, MAX_LIST_ITEMS).map(({ file, size, mtime }) => ({ file, size, mtime }));
      sendJson(res, 200, { items, count: items.length, total: metas.length });
      return true;
    }

    if (req.method === 'POST') {
      const ip = getClientIp(req);
      const limit = rateLimiter.check(ip);
      if (!limit.allowed) {
        sendJson(
          res,
          429,
          { error: 'Too many feedback submissions. Please try again later.' },
          { 'Retry-After': String(limit.retryAfterSec) }
        );
        return true;
      }

      let rawBody;
      try {
        rawBody = await readBoundedBody(req, MAX_BODY_BYTES);
      } catch (err) {
        if (err && err.statusCode === 413) {
          sendJson(res, 413, { error: 'Payload too large (max 512 KB)' });
          return true;
        }
        sendJson(res, 400, { error: 'Failed to read request body' });
        return true;
      }

      let body;
      try {
        body = JSON.parse(rawBody);
      } catch (_) {
        sendJson(res, 400, { error: 'Invalid JSON payload' });
        return true;
      }

      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        sendJson(res, 400, { error: 'Payload must be a JSON object' });
        return true;
      }

      const message = typeof body.message === 'string' ? body.message.trim() : '';
      if (message.length < MIN_MESSAGE_LEN || message.length > MAX_MESSAGE_LEN) {
        sendJson(res, 400, { error: `Message must be between ${MIN_MESSAGE_LEN} and ${MAX_MESSAGE_LEN} characters` });
        return true;
      }

      let email = '';
      if (body.email !== undefined && body.email !== null) {
        if (typeof body.email !== 'string') {
          sendJson(res, 400, { error: 'Email must be a string' });
          return true;
        }
        email = body.email.trim();
        if (email.length > MAX_EMAIL_LEN) {
          sendJson(res, 400, { error: `Email must be at most ${MAX_EMAIL_LEN} characters` });
          return true;
        }
      }

      let diagnostics = null;
      if (body.diagnostics !== undefined && body.diagnostics !== null) {
        const diagSerialized = typeof body.diagnostics === 'string'
          ? body.diagnostics
          : JSON.stringify(body.diagnostics);
        if (Buffer.byteLength(diagSerialized, 'utf8') > MAX_DIAGNOSTICS_BYTES) {
          sendJson(res, 400, { error: 'Diagnostics payload exceeds 256 KB limit' });
          return true;
        }
        diagnostics = body.diagnostics;
      }

      const appVersion = typeof body.appVersion === 'string' ? body.appVersion.slice(0, 64) : 'unknown';

      fs.mkdirSync(feedbackDir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rand = crypto.randomBytes(6).toString('hex');
      const filename = `${stamp}-${rand}.json`;
      const record = {
        id: filename.replace(/\.json$/, ''),
        receivedAt: new Date().toISOString(),
        appVersion,
        message,
        email: email || undefined,
        diagnostics
      };

      fs.writeFileSync(path.join(feedbackDir, filename), JSON.stringify(record, null, 2), 'utf8');
      evictOldestIfNeeded(feedbackDir, maxFolderBytes, maxFiles);

      sendJson(res, 201, { ok: true, id: record.id, file: filename });
      return true;
    }

    sendJson(res, 405, { error: 'Method not allowed' });
    return true;
  };
}

if (require.main === module) {
  const port = envInt('PORT', 8788);
  const handler = createFeedbackHandler();
  const server = http.createServer(async (req, res) => {
    const handled = await handler(req, res);
    if (!handled) {
      sendJson(res, 404, { error: 'Not found' });
    }
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`IGEV feedback server listening on http://127.0.0.1:${port}/api/feedback`);
  });
}

module.exports = {
  createFeedbackHandler,
  createRateLimiter,
  evictOldestIfNeeded,
  MAX_BODY_BYTES,
  MAX_MESSAGE_LEN,
  MIN_MESSAGE_LEN,
  MAX_EMAIL_LEN,
  MAX_DIAGNOSTICS_BYTES,
  SAFE_FILENAME_RE
};
