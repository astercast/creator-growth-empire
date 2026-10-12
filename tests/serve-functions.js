'use strict';
/* tests/serve-functions.js — minimal local runtime for the serverless functions.
   Used by tests/api.test.sh when BASE is unset (mirrors what `vercel dev`
   does for these plain CommonJS handlers: route -> require(handler) -> (req,res)).
   Serves:
     /api/health, /api/changes, /api/niches, /api/cron/algorithm-watch  (functions)
     /data/v1/* (static files from site/data/v1)
   Usage: node tests/serve-functions.js [port]   (default 32113) */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const SITE = path.join(__dirname, '..', 'site');

const ROUTES = {
  '/api/health': '../api/functions/health.js',
  '/api/changes': '../api/functions/changes.js',
  '/api/niches': '../api/functions/niches.js',
  '/api/cron/algorithm-watch': '../api/functions/cron/algorithm-watch.js',
};

const MIME = { '.json': 'application/json; charset=utf-8', '.html': 'text/html; charset=utf-8' };

function loadStatic(urlPath, res) {
  const rel = urlPath.replace(/^\/data\/v1\//, '');
  if (rel.includes('..')) { res.statusCode = 400; res.end('bad path'); return; }
  const file = path.join(SITE, 'data', 'v1', rel);
  fs.readFile(file, (err, data) => {
    if (err) { res.statusCode = 404; res.end('not found'); return; }
    res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.statusCode = 200;
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url || '/', 'http://localhost');
  const p = u.pathname.replace(/\/$/, '') || '/';

  if (p.startsWith('/data/v1/')) return loadStatic(p, res);

  const modPath = ROUTES[p];
  if (!modPath) { res.statusCode = 404; res.end('no such function'); return; }

  // Vercel-shaped request: parsed query object, headers, method.
  req.query = Object.fromEntries(u.searchParams.entries());
  try {
    const handler = require(path.join(__dirname, modPath));
    Promise.resolve(handler(req, res)).catch((e) => {
      console.error('[harness] handler threw:', e && e.message);
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.statusCode = 500;
        res.end(JSON.stringify({ ok: false, data: null, meta: {}, error: { code: 'INTERNAL', message: 'harness: handler threw' } }));
      }
    });
  } catch (e) {
    console.error('[harness] require failed:', e && e.message);
    res.statusCode = 500;
    res.end('require failed');
  }
});

const port = Number(process.argv[2] || 32113);
server.listen(port, () => console.log('[harness] listening on :' + port));
