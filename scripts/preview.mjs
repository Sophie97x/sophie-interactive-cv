import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve('dist/client');
const port = Number(process.env.PORT || 5192);
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.rsc': 'text/x-component',
  '.woff2': 'font/woff2',
};
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, 'http://localhost').pathname,
    );
    let path = resolve(root, '.' + pathname);
    if (!path.startsWith(root + sep) && path !== root)
      throw new Error('Invalid path');
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    res.setHeader(
      'Content-Type',
      types[extname(path)] || 'application/octet-stream',
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(await readFile(path));
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}).listen(port, '127.0.0.1', () =>
  console.log(`Static preview: http://127.0.0.1:${port}`),
);
