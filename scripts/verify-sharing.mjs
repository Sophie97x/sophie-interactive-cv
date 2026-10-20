import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeRoom, decodeRoom } from '../lib/share.ts';
import { defaultProfile, validateProfile } from '../lib/profile.ts';
import { zipSync, strToU8 } from 'fflate';
import { importCvFile } from '../lib/cv-import.ts';
import { petPose } from '../components/room/pet-motion.ts';

const profile = {
  ...structuredClone(defaultProfile),
  name: 'Alex Test',
  headline: 'Maker',
  bio: 'Hello 🌼 — a tiny room.',
  projects: [
    {
      title: 'A garden',
      subtitle: '2026',
      description: 'Made for bees.',
      url: '',
    },
  ],
};
test('share snapshots preserve every room choice and Unicode', () => {
  const p = structuredClone(profile);
  Object.assign(p.room, {
    pet: 'cat',
    zones: [],
    layout: 'mirrored',
    shell: 'cabin',
    timeOfDay: 'night',
  });
  const link = encodeRoom(p);
  assert.deepEqual(decodeRoom(`#${link}`), validateProfile(p));
  assert.ok(link.length < 16000);
});
test('bad, truncated, oversized and unsafe links are rejected', () => {
  for (const value of [
    '',
    '#room1.99999.AA',
    'room1.1.AA',
    'x'.repeat(16001),
    encodeRoom(profile).slice(0, -8),
  ])
    assert.throws(() => decodeRoom(value), /invalid/);
  assert.throws(() =>
    encodeRoom({ ...profile, contactUrl: 'javascript:alert(1)' }),
  );
});
test('JSON backups validate data and preserve room customisation', async () => {
  const p = structuredClone(profile);
  p.room.pet = 'fox';
  const result = await importCvFile(
    new File([JSON.stringify({ profile: p })], 'room.json'),
  );
  assert.deepEqual(result.profile, validateProfile(p, true));
  const unsafe = await importCvFile(
    new File(
      [JSON.stringify({ ...p, contactUrl: 'javascript:alert(1)' })],
      'bad.json',
    ),
  );
  assert.throws(() => encodeRoom(unsafe.profile));
  await assert.rejects(
    importCvFile(
      new File(
        [JSON.stringify({ ...p, projects: 'not an array' })],
        'bad.json',
      ),
    ),
  );
});
test('pets never jump onto a hidden desk', () => {
  for (let t = 0; t < 180; t += 0.2) assert.ok(petPose(t, false).y < 0.1);
});

// Exercise the actual DOCX import boundary rather than a second decoder.
test('DOCX entities decode once while imported text remains literal', async () => {
  const paragraph = text => `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`;
  const xml = `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${[
    'Alex Test', 'Maker &amp;lt;img src=x&amp;gt;', 'alex@example.com',
    'Summary', 'Builds tools &amp; gardens &lt;safely&gt;.', 'Skills', 'Writing and design',
  ].map(paragraph).join('')}</w:body></w:document>`;
  const file = new File([zipSync({'word/document.xml': strToU8(xml)})], 'sample.docx');
  const result = await importCvFile(file);
  assert.equal(result.profile.name, 'Alex Test');
  assert.equal(result.profile.headline, 'Maker &lt;img src=x&gt;');
  assert.ok(JSON.stringify(result.profile).includes('tools & gardens <safely>'));
});
