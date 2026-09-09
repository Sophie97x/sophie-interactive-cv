import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
const base = process.env.PAGES_BASE_PATH || '/sophie-interactive-cv';
const root = path.resolve(`dist/client${base}`);
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.mjs': 'text/javascript',
};
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (!url.pathname.startsWith(`${base}/`)) {
        res.writeHead(404).end();
        return;
      }
      let file = path.resolve(
        root,
        `.${decodeURIComponent(url.pathname.slice(base.length))}`,
      );
      if (!file.startsWith(`${root}/`) && file !== root) throw new Error();
      if ((await stat(file)).isDirectory())
        file = path.join(file, 'index.html');
      const body = await readFile(file);
      res.writeHead(200, {
        'Content-Type': types[path.extname(file)] || 'application/octet-stream',
      });
      res.end(body);
    } catch {
      res.writeHead(404).end('Not found');
    }
  })
  .listen(5194, 'localhost', () =>
    console.log(`Pages preview: http://localhost:5194${base}/`),
  );
