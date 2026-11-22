'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const assert = require('assert');
const vm = require('vm');

const {
  createFeedbackHandler,
  createRateLimiter,
  evictOldestIfNeeded,
  MAX_BODY_BYTES,
  MAX_DIAGNOSTICS_BYTES
} = require('../scripts/feedback-server');

const html = fs.readFileSync('index.html', 'utf8');

// ===================================================================
// 1. Static HTML & Client UI Contract Assertions
// ===================================================================
assert(html.includes('id="feedbackMenuBtn"'), 'View menu must include Send Feedback button');
assert(html.includes('id="feedbackModal"'), 'Must include feedbackModal');
assert(html.includes('id="feedbackMessage"'), 'Must include feedbackMessage textarea');
assert(html.includes('maxlength="20000"'), 'Message textarea must cap at 20,000 chars');
assert(html.includes('id="feedbackEmail"'), 'Must include feedbackEmail input');
assert(html.includes('maxlength="320"'), 'Email input must cap at 320 chars');
assert(html.includes('id="feedbackAttachDiag" checked'), 'Attach diagnostics checkbox must default to checked');
assert(html.includes('window.igevDiagnostics'), 'Must expose window.igevDiagnostics()');
assert(html.includes('igev-feedback.json'), 'Must support static/offline igev-feedback.json download fallback');

// ===================================================================
// 2. Client Diagnostics Ring Buffer & Truncation Tests (VM)
// ===================================================================
const diagMatch = html.match(/const FEEDBACK_APP_VERSION =[\s\S]*?const IGEVDiagnostics = \(function\(\) \{[\s\S]*?\}\)\(\);/);
assert(diagMatch, 'IGEVDiagnostics block must be present in index.html');

{
  const listeners = {};
  const ctx = {
    window: {
      innerWidth: 1280,
      innerHeight: 800,
      location: { protocol: 'https:' },
      addEventListener(type, fn) { listeners[type] = fn; }
    },
    navigator: { userAgent: 'TestAgent/1.0' },
    document: { documentElement: { getAttribute: () => 'light' } },
    gantt: {
      getTaskCount: () => 5,
      getLinks: () => [{ id: 1 }],
      getSelectedId: () => 't1',
      attachEvent() {}
    },
    historyStack: ['s1', 's2'],
    historyPointer: 1,
    isLocked: false,
    snapEnabled: true,
    Date,
    Object,
    Array,
    String,
    JSON
  };
  vm.createContext(ctx);
  vm.runInContext(diagMatch[0] + '\nIGEVDiagnostics.attachHooks(); this.IGEVDiagnostics = IGEVDiagnostics;', ctx);

  // Ring buffer cap at 4,000
  for (let i = 0; i < 4050; i++) {
    ctx.IGEVDiagnostics.push('action', `act_${i}`);
  }
  assert.strictEqual(ctx.IGEVDiagnostics.getBuffer().length, 4000, 'Ring buffer must cap at 4,000 entries');
  assert.strictEqual(ctx.IGEVDiagnostics.getBuffer()[0].label, 'act_50', 'Oldest entries must be evicted');

  // Error hooks
  listeners.error({ message: 'Boom', lineno: 42 });
  listeners.unhandledrejection({ reason: new Error('AsyncBoom') });
  const buf = ctx.IGEVDiagnostics.getBuffer();
  assert.strictEqual(buf[buf.length - 2].kind, 'error');
  assert.strictEqual(buf[buf.length - 2].label, 'window.onerror');
  assert.strictEqual(buf[buf.length - 1].kind, 'error');
  assert.strictEqual(buf[buf.length - 1].label, 'unhandledrejection');

  // Dump & 256 KB truncation guard
  const dump = ctx.IGEVDiagnostics.dumpDiagnostics();
  assert.strictEqual(dump.app, 'IGEV');
  assert.strictEqual(dump.state.taskCount, 5);
  assert.strictEqual(dump.state.linkCount, 1);
  const bigDump = Object.assign({}, dump, {
    logs: Array.from({ length: 1000 }, (_, i) => ({ t: i, kind: 'action', label: 'x'.repeat(100), detail: 'y'.repeat(400) }))
  });
  const truncated = ctx.IGEVDiagnostics.truncateDiagnostics(bigDump);
  assert(Buffer.byteLength(truncated, 'utf8') <= MAX_DIAGNOSTICS_BYTES, 'Truncated diagnostics must be <= 256 KB');
}

// ===================================================================
// 3. Bounded Server Storage Tests (HTTP + Temp Dir)
// ===================================================================
function request(port, method, urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: urlPath, method, headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try { json = JSON.parse(text); } catch (_) {}
        resolve({ status: res.statusCode, headers: res.headers, text, json });
      });
    });
    req.on('error', reject);
    if (body !== undefined && body !== null) req.write(body);
    req.end();
  });
}

async function runServerTests() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'igev-feedback-test-'));
  let fakeNow = 1_700_000_000_000;
  const handler = createFeedbackHandler({
    feedbackDir: tmpDir,
    maxFiles: 3,
    maxFolderMb: 1,
    rateLimit: {
      maxPerHour: 5,
      minSpacingMs: 10_000,
      maxTrackedIps: 512,
      now: () => fakeNow
    }
  });

  const server = http.createServer((req, res) => {
    handler(req, res).then((handled) => {
      if (!handled) {
        res.writeHead(404);
        res.end();
      }
    });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  try {
    // Valid POST
    const r1 = await request(port, 'POST', '/api/feedback', JSON.stringify({
      message: 'First feedback message',
      email: 'user@example.com',
      appVersion: '1.0.0',
      diagnostics: '{"ok":true}'
    }), { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.0.1' });
    assert.strictEqual(r1.status, 201);
    assert(r1.json && r1.json.ok && r1.json.file.endsWith('.json'));

    // Rate limit: spacing (< 10s)
    fakeNow += 2_000;
    const rSpacing = await request(port, 'POST', '/api/feedback', JSON.stringify({
      message: 'Too fast'
    }), { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.0.1' });
    assert.strictEqual(rSpacing.status, 429);
    assert(rSpacing.headers['retry-after'], 'Must include Retry-After header');

    // Validation: message too short
    fakeNow += 15_000;
    const rShort = await request(port, 'POST', '/api/feedback', JSON.stringify({
      message: 'hi'
    }), { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.0.2' });
    assert.strictEqual(rShort.status, 400);

    // Validation: body > 512 KB -> 413
    const hugeBody = JSON.stringify({ message: 'a'.repeat(MAX_BODY_BYTES + 1024) });
    const rHuge = await request(port, 'POST', '/api/feedback', hugeBody, {
      'Content-Type': 'application/json',
      'X-Forwarded-For': '10.0.0.3'
    });
    assert.strictEqual(rHuge.status, 413);

    // Validation: diagnostics > 256 KB -> 400
    const rBigDiag = await request(port, 'POST', '/api/feedback', JSON.stringify({
      message: 'Valid message',
      diagnostics: 'x'.repeat(MAX_DIAGNOSTICS_BYTES + 10)
    }), { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.0.4' });
    assert.strictEqual(rBigDiag.status, 400);

    // Folder maxFiles eviction (maxFiles = 3): add 3 more files from distinct IPs
    for (let i = 0; i < 3; i++) {
      fakeNow += 15_000;
      const r = await request(port, 'POST', '/api/feedback', JSON.stringify({
        message: `Feedback entry #${i + 2}`
      }), { 'Content-Type': 'application/json', 'X-Forwarded-For': `10.0.1.${i}` });
      assert.strictEqual(r.status, 201);
    }
    const storedFiles = fs.readdirSync(tmpDir).filter((f) => f.endsWith('.json'));
    assert.strictEqual(storedFiles.length, 3, 'Oldest files must be evicted to stay within maxFiles=3');

    // GET list
    const rList = await request(port, 'GET', '/api/feedback');
    assert.strictEqual(rList.status, 200);
    assert.strictEqual(rList.json.items.length, 3);

    // GET single file
    const firstFile = rList.json.items[0].file;
    const rOne = await request(port, 'GET', `/api/feedback?file=${encodeURIComponent(firstFile)}`);
    assert.strictEqual(rOne.status, 200);
    assert(rOne.json && typeof rOne.json.message === 'string');

    // GET path traversal rejection
    const rTrav = await request(port, 'GET', '/api/feedback?file=..%2Fpackage.json');
    assert.strictEqual(rTrav.status, 400);

    // Rate limiter unit test: hourly limit (5/hr)
    let t = 1000;
    const rl = createRateLimiter({ maxPerHour: 2, minSpacingMs: 100, maxTrackedIps: 2, now: () => t });
    assert.strictEqual(rl.check('1.1.1.1').allowed, true);
    t += 200;
    assert.strictEqual(rl.check('1.1.1.1').allowed, true);
    t += 200;
    assert.strictEqual(rl.check('1.1.1.1').allowed, false);
  } finally {
    server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

runServerTests().then(() => {
  console.log('Feedback system tests passed.');
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
