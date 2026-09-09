import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { dirname, resolve, extname, sep } from 'node:path';
import { validSlug, validateProfile } from '../lib/profile.ts';

const hash = (key) => createHash('sha256').update(key).digest();
const fail = (status, message) => Object.assign(new Error(message), { status });
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.txt': 'text/x-component',
  '.rsc': 'text/x-component',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

export function createApp({
  dbPath = 'data/attic.sqlite',
  staticRoot = 'dist/client',
  origin = 'http://localhost:5192',
  maxProfiles = 1000,
  publishing = true,
  trustCloudflare = false,
} = {}) {
  const publicOrigin = new URL(origin).origin;
  if (!Number.isInteger(maxProfiles) || maxProfiles < 1)
    throw new Error('MAX_PROFILES must be a positive integer.');
  mkdirSync(dirname(resolve(dbPath)), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(dbPath);
  db.exec(
    'PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS portfolios (slug TEXT PRIMARY KEY, profile TEXT NOT NULL, key_hash BLOB NOT NULL, revision INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)',
  );
  const get = db.prepare('SELECT * FROM portfolios WHERE slug = ?');
  const root = resolve(staticRoot),
    buckets = new Map();
  function rate(req, kind, limit) {
    const now = Date.now();
    for (const [key, b] of buckets) if (b.until < now) buckets.delete(key);
    const ip = trustCloudflare
      ? String(req.headers['cf-connecting-ip'] || req.socket.remoteAddress)
      : req.socket.remoteAddress;
    const key = `${kind}:${ip}`;
    let b = buckets.get(key);
    if (!b) {
      if (buckets.size >= 10000) throw fail(429, 'Please try again later.');
      b = { count: 0, until: now + 3600000 };
      buckets.set(key, b);
    }
    if (++b.count > limit)
      throw fail(429, 'Too many requests. Please try again in an hour.');
  }
  async function body(req) {
    if (req.headers.origin !== publicOrigin)
      throw fail(403, 'This request must come from this site.');
    if (
      !/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')
    )
      throw fail(415, 'Send JSON.');
    let size = 0;
    const chunks = [];
    await new Promise((resolveBody, rejectBody) => {
      req.on('data', (chunk) => {
        size += chunk.length;
        if (size > 65536) {
          rejectBody(fail(413, 'Page is too large (maximum 64 KB).'));
          return;
        }
        chunks.push(chunk);
      });
      req.on('end', resolveBody);
      req.on('error', rejectBody);
      req.on('aborted', () => rejectBody(fail(400, 'Request interrupted.')));
    });
    try {
      const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!result || typeof result !== 'object' || Array.isArray(result))
        throw new Error();
      return result;
    } catch {
      throw fail(400, 'Invalid JSON.');
    }
  }
  const json = (res, status, data) => {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(JSON.stringify(data));
  };
  const publicRow = (row) => ({
    slug: row.slug,
    profile: JSON.parse(row.profile),
    revision: row.revision,
  });
  const profile = (data) => {
    try {
      return validateProfile(data);
    } catch (error) {
      throw fail(400, error.message);
    }
  };
  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    );
    try {
      let pathname;
      try {
        pathname = decodeURIComponent(new URL(req.url, publicOrigin).pathname);
      } catch {
        throw fail(400, 'Invalid address.');
      }
      if (pathname === '/healthz' && req.method === 'GET') {
        db.prepare('SELECT 1').get();
        return json(res, 200, { ok: true });
      }
      if (pathname.startsWith('/api/')) {
        if (pathname === '/api/config' && req.method === 'GET')
          return json(res, 200, { publishing, origin: publicOrigin });
        const available = /^\/api\/availability\/([^/]+)$/.exec(pathname);
        if (available && req.method === 'GET') {
          if (!validSlug(available[1]))
            throw fail(
              400,
              'Use 3–40 lowercase letters, numbers or hyphens. This name may be reserved.',
            );
          return json(res, 200, { available: !get.get(available[1]) });
        }
        const unlock = /^\/api\/unlock\/([^/]+)$/.exec(pathname);
        if (unlock && req.method === 'POST') {
          rate(req, 'write', 120);
          await body(req);
          const row = get.get(unlock[1]);
          const supplied = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(
            req.headers.authorization || '',
          );
          if (
            !row ||
            !supplied ||
            !timingSafeEqual(hash(supplied[1]), Buffer.from(row.key_hash))
          )
            throw fail(403, 'The page name or private edit key is incorrect.');
          return json(res, 200, publicRow(row));
        }
        const match = /^\/api\/portfolios(?:\/([^/]+))?$/.exec(pathname);
        if (!match) throw fail(404, 'Not found.');
        const slug = match[1];
        if (slug && !validSlug(slug)) throw fail(400, 'Invalid page name.');
        if (req.method === 'GET' && slug) {
          const row = get.get(slug);
          if (!row)
            throw fail(
              404,
              'This page has not been published, or has been removed.',
            );
          return json(res, 200, publicRow(row));
        }
        if (!['POST', 'PUT', 'DELETE'].includes(req.method))
          throw fail(405, 'Method not allowed.');
        rate(req, 'write', 120);
        const data = await body(req);
        if (req.method === 'POST' && !slug) {
          if (!publishing) throw fail(403, 'New pages are currently closed.');
          if (!validSlug(data.slug))
            throw fail(
              400,
              'Choose a different page name: 3–40 lowercase letters, numbers or hyphens.',
            );
          const clean = profile(data.profile);
          if (
            data.editKey !== undefined &&
            (typeof data.editKey !== 'string' ||
              !/^[A-Za-z0-9_-]{43}$/.test(data.editKey))
          )
            throw fail(400, 'Invalid edit key.');
          const existing = get.get(data.slug);
          if (existing) {
            if (
              data.editKey &&
              timingSafeEqual(
                hash(data.editKey),
                Buffer.from(existing.key_hash),
              )
            )
              return json(res, 200, {
                ...publicRow(existing),
                editKey: data.editKey,
              });
            throw fail(409, 'That address is already taken.');
          }
          if (
            db.prepare('SELECT count(*) AS total FROM portfolios').get()
              .total >= maxProfiles
          )
            throw fail(503, 'This site is full. Please contact the host.');
          rate(req, 'create', 10);
          const editKey = data.editKey || randomBytes(32).toString('base64url');
          db.prepare(
            'INSERT INTO portfolios(slug, profile, key_hash) VALUES (?, ?, ?)',
          ).run(data.slug, JSON.stringify(clean), hash(editKey));
          return json(res, 201, {
            slug: data.slug,
            profile: clean,
            editKey,
            revision: 1,
          });
        }
        if (!slug || req.method === 'POST')
          throw fail(405, 'Method not allowed.');
        const row = get.get(slug);
        const supplied = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(
          req.headers.authorization || '',
        );
        if (
          !row ||
          !supplied ||
          !timingSafeEqual(hash(supplied[1]), Buffer.from(row.key_hash))
        )
          throw fail(403, 'The page name or private edit key is incorrect.');
        if (req.method === 'DELETE') {
          db.prepare('DELETE FROM portfolios WHERE slug = ?').run(slug);
          return json(res, 200, { deleted: true });
        }
        if (data.revision !== row.revision)
          throw fail(
            409,
            'This page changed in another session. Reopen it before saving. Your draft has been kept.',
          );
        const clean = profile(data.profile);
        db.prepare(
          'UPDATE portfolios SET profile = ?, revision = revision + 1, updated_at = CURRENT_TIMESTAMP WHERE slug = ?',
        ).run(JSON.stringify(clean), slug);
        return json(res, 200, {
          slug,
          profile: clean,
          revision: row.revision + 1,
        });
      }
      if (!['GET', 'HEAD'].includes(req.method))
        throw fail(405, 'Method not allowed.');
      let file;
      if (pathname === '/') file = resolve(root, 'index.html');
      else if (pathname === '/edit' || pathname === '/edit/')
        file = resolve(root, 'edit/index.html');
      else if (pathname === '/view' || /^\/[a-z0-9-]+\/?$/.test(pathname)) {
        const slug = pathname.replace(/^\/|\/$/g, '');
        if (pathname !== '/view' && (!validSlug(slug) || !get.get(slug)))
          throw fail(404, 'Page not found.');
        file = resolve(root, 'view/index.html');
      } else file = resolve(root, `.${pathname}`);
      if (
        !file.startsWith(root + sep) ||
        pathname.includes('\0') ||
        pathname.includes('\\')
      )
        throw fail(404, 'Not found.');
      try {
        if (!(await stat(file)).isFile()) throw new Error();
      } catch {
        throw fail(404, 'Not found.');
      }
      res.setHeader(
        'Content-Type',
        types[extname(file)] || 'application/octet-stream',
      );
      res.setHeader(
        'Cache-Control',
        extname(file) === '.html' ? 'no-store' : 'public, max-age=3600',
      );
      res.end(req.method === 'HEAD' ? undefined : await readFile(file));
    } catch (error) {
      if (!res.headersSent)
        json(res, error.status || 500, {
          error: error.status
            ? error.message
            : 'Something went wrong. Please try again.',
        });
      else res.end();
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  return { server, close: () => db.close() };
}
