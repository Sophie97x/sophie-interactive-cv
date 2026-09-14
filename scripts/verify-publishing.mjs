import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { defaultProfile } from '../lib/profile.ts';
import { createApp } from './server.mjs';

const origin = 'http://localhost';
const profile = () =>
  structuredClone({
    ...defaultProfile,
    name: 'Test person',
    headline: 'Test role',
  });

async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'cv-publishing-'));
  const staticRoot = join(dir, 'static');
  await Promise.all([
    mkdir(staticRoot, { recursive: true }),
    mkdir(join(staticRoot, 'edit'), { recursive: true }),
    mkdir(join(staticRoot, 'view'), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(join(staticRoot, 'index.html'), 'home'),
    writeFile(join(staticRoot, 'edit/index.html'), 'edit'),
    writeFile(join(staticRoot, 'view/index.html'), 'view'),
    writeFile(join(staticRoot, 'worker.mjs'), 'export default null;'),
  ]);
  return { dir, staticRoot, dbPath: join(dir, 'portfolios.sqlite') };
}

async function listen(app) {
  await new Promise((resolve, reject) => {
    app.server.once('error', reject);
    app.server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = app.server.address();
  return `http://127.0.0.1:${port}`;
}

async function withApp(options, run) {
  const app = createApp({ ...options, origin, maxProfiles: 3 });
  const base = await listen(app);
  try {
    await run(base);
  } finally {
    await new Promise((resolve) => app.server.close(resolve));
    await app.close();
  }
}

async function request(base, path, options = {}) {
  const response = await fetch(base + path, options);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { response, body };
}

function write(body, key) {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
    },
    body: JSON.stringify(body),
  };
}

test('independent owners, page quotas and disabled registrations', async (t) => {
  const files = await fixture();
  t.after(() => rm(files.dir, { recursive: true, force: true }));
  let key;
  await withApp(files, async (base) => {
    const first = await request(
      base,
      '/api/portfolios',
      write({
        slug: 'owner-one',
        profile: { ...profile(), unexpected: 'discard this field' },
      }),
    );
    const second = await request(
      base,
      '/api/portfolios',
      write({ slug: 'owner-two', profile: profile() }),
    );
    key = first.body.editKey;
    assert.equal('unexpected' in first.body.profile, false);
    assert.notEqual(key, second.body.editKey);
    for (const method of ['PUT', 'DELETE']) {
      const attempt = write(
        { profile: profile(), revision: 1 },
        second.body.editKey,
      );
      attempt.method = method;
      assert.equal(
        (await request(base, '/api/portfolios/owner-one', attempt)).response
          .status,
        403,
      );
    }
    const raced = await Promise.all(
      [1, 2].map(() =>
        request(
          base,
          '/api/portfolios',
          write({ slug: 'same-address', profile: profile() }),
        ),
      ),
    );
    assert.deepEqual(
      raced.map((r) => r.response.status).sort((a, b) => a - b),
      [201, 409],
    );
    assert.equal(
      (
        await request(
          base,
          '/api/portfolios',
          write({ slug: 'over-quota', profile: profile() }),
        )
      ).response.status,
      503,
    );
    assert.equal(
      (
        await request(base, '/api/portfolios', {
          method: 'POST',
          headers: { Origin: origin, 'Content-Type': 'text/plain' },
          body: '{}',
        })
      ).response.status,
      415,
    );
    assert.equal(
      (
        await request(
          base,
          '/api/portfolios',
          write({
            slug: 'bad-colour',
            profile: {
              ...profile(),
              appearance: {
                ...profile().appearance,
                accent: 'url(javascript:alert(1))',
              },
            },
          }),
        )
      ).response.status,
      400,
    );
  });
  await withApp({ ...files, publishing: false }, async (base) => {
    assert.equal((await request(base, '/api/config')).body.publishing, false);
    assert.equal(
      (
        await request(
          base,
          '/api/portfolios',
          write({ slug: 'new-room', profile: profile() }),
        )
      ).response.status,
      403,
    );
    assert.equal(
      (await request(base, '/api/portfolios/owner-one')).response.status,
      200,
    );
    const update = write(
      { profile: { ...profile(), headline: 'Still editable' }, revision: 1 },
      key,
    );
    update.method = 'PUT';
    assert.equal(
      (await request(base, '/api/portfolios/owner-one', update)).response
        .status,
      200,
    );
  });
});

test('publishing API and static routes', async (t) => {
  const files = await fixture();
  t.after(() => rm(files.dir, { recursive: true, force: true }));

  await withApp(files, async (base) => {
    let result = await request(
      base,
      '/api/portfolios',
      write({ slug: 'test-site', profile: profile() }),
    );
    assert.equal(result.response.status, 201);
    assert.deepEqual(result.body.slug, 'test-site');
    assert.deepEqual(result.body.profile.name, 'Test person');
    assert.equal(result.body.revision, 1);
    assert.equal(typeof result.body.editKey, 'string');
    const key = result.body.editKey;

    result = await request(
      base,
      '/api/portfolios',
      write({ slug: 'test-site', profile: profile(), editKey: key }),
    );
    assert.equal(result.response.status, 200);
    assert.equal(result.body.revision, 1);
    assert.equal(
      (
        await request(
          base,
          '/api/portfolios',
          write({
            slug: 'test-site',
            profile: profile(),
            editKey: 'A'.repeat(43),
          }),
        )
      ).response.status,
      409,
    );

    result = await request(base, '/api/unlock/test-site', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        Authorization: `Bearer ${key}`,
      },
      body: '{}',
    });
    assert.equal(result.response.status, 200);
    result = await request(base, '/api/unlock/test-site', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        Authorization: 'Bearer wrong',
      },
      body: '{}',
    });
    assert.equal(result.response.status, 403);

    result = await request(base, '/api/portfolios/test-site');
    assert.equal(result.response.status, 200);
    assert.deepEqual(result.body, {
      slug: 'test-site',
      profile: profile(),
      revision: 1,
    });
    assert.equal('editKey' in result.body, false);

    result = await request(base, '/api/availability/test-site');
    assert.deepEqual(result.body, { available: false });
    result = await request(base, '/api/availability/new-site');
    assert.deepEqual(result.body, { available: true });
    result = await request(base, '/api/availability/NOPE');
    assert.equal(result.response.status, 400);

    result = await request(base, '/api/portfolios/test-site', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        profile: { ...profile(), headline: 'Updated role' },
        revision: 1,
      }),
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.revision, 2);

    result = await request(base, '/api/portfolios/test-site', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ profile: profile(), revision: 1 }),
    });
    assert.equal(result.response.status, 409);

    result = await request(base, '/api/portfolios/test-site', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        Authorization: 'Bearer wrong',
      },
      body: JSON.stringify({ profile: profile(), revision: 2 }),
    });
    assert.equal(result.response.status, 403);

    assert.equal((await request(base, '/edit')).body, 'edit');
    assert.equal((await request(base, '/test-site')).body, 'view');
    result = await request(base, '/worker.mjs');
    assert.equal(
      result.response.headers.get('content-type'),
      'text/javascript',
    );
    assert.equal(result.body, 'export default null;');
  });
});

test('publishing rejects invalid writes and preserves data across restart', async (t) => {
  const files = await fixture();
  t.after(() => rm(files.dir, { recursive: true, force: true }));
  let key;

  await withApp(files, async (base) => {
    for (const options of [
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: 'no-origin', profile: profile() }),
      },
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://foreign.example',
        },
        body: JSON.stringify({ slug: 'foreign', profile: profile() }),
      },
    ])
      assert.equal(
        (await request(base, '/api/portfolios', options)).response.status,
        403,
      );

    assert.equal(
      (
        await request(base, '/api/portfolios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Origin: origin },
          body: '{',
        })
      ).response.status,
      400,
    );
    assert.equal(
      (
        await request(
          base,
          '/api/portfolios',
          write({ slug: 'edit', profile: profile() }),
        )
      ).response.status,
      400,
    );
    assert.equal(
      (
        await request(
          base,
          '/api/portfolios',
          write({ slug: 'Bad', profile: profile() }),
        )
      ).response.status,
      400,
    );

    const unsafe = profile();
    unsafe.contactUrl = 'javascript:alert(1)';
    assert.equal(
      (
        await request(
          base,
          '/api/portfolios',
          write({ slug: 'unsafe', profile: unsafe }),
        )
      ).response.status,
      400,
    );

    const created = await request(
      base,
      '/api/portfolios',
      write({ slug: 'kept-site', profile: profile() }),
    );
    assert.equal(created.response.status, 201);
    key = created.body.editKey;
    assert.equal(
      (
        await request(
          base,
          '/api/portfolios',
          write({ slug: 'kept-site', profile: profile() }),
        )
      ).response.status,
      409,
    );

    const huge = JSON.stringify({
      slug: 'large-site',
      profile: { ...profile(), padding: 'x'.repeat(2 * 1024 * 1024) },
    });
    assert.equal(
      (
        await request(base, '/api/portfolios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Origin: origin },
          body: huge,
        })
      ).response.status,
      413,
    );
  });

  await withApp(files, async (base) => {
    let result = await request(base, '/api/portfolios/kept-site');
    assert.equal(result.response.status, 200);
    assert.equal(result.body.revision, 1);

    result = await request(base, '/api/portfolios/kept-site', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        Authorization: `Bearer ${key}`,
      },
      body: '{}',
    });
    assert.equal(result.response.status, 200);
    assert.equal(
      (await request(base, '/api/portfolios/kept-site')).response.status,
      404,
    );
  });
});

test('rejected origins do not spend the write budget', async (t) => {
  const files = await fixture();
  t.after(() => rm(files.dir, { recursive: true, force: true }));
  await withApp(files, async (base) => {
    for (let i = 0; i < 125; i++) {
      const attempt = write({});
      attempt.headers.Origin = 'https://unrelated.example';
      const result = await request(
        base,
        i % 2 ? '/api/portfolios' : '/api/unlock/test-room',
        attempt,
      );
      assert.equal(result.response.status, 403);
      assert.equal(result.body.error, 'This request must come from this site.');
    }
    const created = await request(
      base,
      '/api/portfolios',
      write({ slug: 'valid-owner', profile: profile() }),
    );
    assert.equal(created.response.status, 201);
  });
});

test('trusted proxy required; client addresses are validated and budgets stay separate', async (t) => {
  const files = await fixture();
  t.after(() => rm(files.dir, { recursive: true, force: true }));
  assert.throws(
    () => createApp({ ...files, trustCloudflare: true }),
    /TRUSTED_PROXY_IPS/,
  );
  await withApp(
    { ...files, trustCloudflare: true, trustedProxyIps: ['192.0.2.100'] },
    async (base) => {
      assert.equal(
        (
          await request(base, '/api/config', {
            headers: { 'CF-Connecting-IP': '192.0.2.1' },
          })
        ).response.status,
        403,
      );
      assert.equal((await request(base, '/')).response.status, 403);
      assert.equal((await request(base, '/healthz')).response.status, 200);
    },
  );
  await withApp(
    { ...files, trustCloudflare: true, trustedProxyIps: ['::ffff:127.0.0.1'] },
    async (base) => {
      for (const ip of [
        undefined,
        'unknown',
        '192.0.2.1, 192.0.2.2',
        'x'.repeat(1000),
        'fe80::1%eth0',
      ]) {
        assert.equal(
          (
            await request(base, '/api/config', {
              headers: ip ? { 'CF-Connecting-IP': ip } : {},
            })
          ).response.status,
          403,
        );
      }
      const unlockAs = async (ip) => {
        const attempt = write({});
        attempt.headers['CF-Connecting-IP'] = ip;
        return request(base, '/api/unlock/no-such-room', attempt);
      };
      for (let i = 0; i < 120; i++)
        assert.equal((await unlockAs('2001:db8::1')).response.status, 403);
      assert.equal(
        (await unlockAs('2001:0db8:0:0:0:0:0:1')).response.status,
        429,
      );
      assert.equal((await unlockAs('2001:db8::2')).response.status, 403);
      const attempt = write({ slug: 'proxy-owner', profile: profile() });
      attempt.headers['CF-Connecting-IP'] = '192.0.2.5';
      assert.equal(
        (await request(base, '/api/portfolios', attempt)).response.status,
        201,
      );
    },
  );
});

test('direct mode ignores forged client headers and HTTPS origins send HSTS', async (t) => {
  const files = await fixture();
  t.after(() => rm(files.dir, { recursive: true, force: true }));
  await withApp(files, async (base) => {
    for (let i = 0; i < 121; i++) {
      const attempt = write({});
      attempt.headers['CF-Connecting-IP'] = `192.0.2.${i + 1}`;
      assert.equal(
        (await request(base, '/api/unlock/no-such-room', attempt)).response
          .status,
        i < 120 ? 403 : 429,
      );
    }
    assert.equal(
      (await request(base, '/')).response.headers.get(
        'strict-transport-security',
      ),
      null,
    );
  });
  const app = createApp({ ...files, origin: 'https://cv.example.com' });
  const base = await listen(app);
  try {
    for (const path of ['/', '/api/config', '/not-found'])
      assert.equal(
        (await request(base, path)).response.headers.get(
          'strict-transport-security',
        ),
        'max-age=31536000',
      );
  } finally {
    await new Promise((resolve) => app.server.close(resolve));
    app.close();
  }
});
