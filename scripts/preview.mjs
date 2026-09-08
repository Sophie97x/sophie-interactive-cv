import { createApp } from './server.mjs';

const port = Number(process.env.PORT || 5192);
const origin = process.env.PUBLIC_ORIGIN || `http://localhost:${port}`;
if (
  process.env.NODE_ENV === 'production' &&
  (!process.env.PUBLIC_ORIGIN || new URL(origin).protocol !== 'https:')
)
  throw new Error('Set PUBLIC_ORIGIN to your public https:// hostname.');
const app = createApp({
  origin,
  dbPath: process.env.DATABASE_PATH || 'data/attic.sqlite',
  maxProfiles: Number(process.env.MAX_PROFILES || 1000),
  publishing: process.env.ENABLE_PUBLISHING !== 'false',
  trustCloudflare: process.env.TRUST_CLOUDFLARE === 'true',
});
app.server.listen(port, process.env.HOST || '127.0.0.1', () =>
  console.log(`Attic is ready on port ${port}. Public address: ${origin}`),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () =>
    app.server.close(() => {
      app.close();
      process.exit(0);
    }),
  );
