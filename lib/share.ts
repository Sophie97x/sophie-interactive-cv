import { deflateSync, inflateSync, strToU8, strFromU8 } from 'fflate';
import { validateProfile, type Profile } from './profile.ts';

const MAX_TEXT = 64 * 1024;
const MAX_LINK = 16000;

/** Versioned snapshots. No account, edit key or server is involved. */
export function encodeRoom(profile: Profile): string {
  const text = strToU8(JSON.stringify(validateProfile(profile)));
  if (text.length > MAX_TEXT)
    throw new Error(
      'This CV is too long for a share link. Shorten the descriptions.',
    );
  const compressed = deflateSync(text, { level: 9 });
  const body = btoa(String.fromCharCode(...compressed))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const result = `room1.${text.length}.${body}`;
  if (result.length > MAX_LINK)
    throw new Error(
      'This CV is too long for a share link. Download a backup and shorten the descriptions.',
    );
  return result;
}

export function decodeRoom(fragment: string): Profile {
  try {
    const value = fragment.replace(/^#/, '');
    if (value.length > MAX_LINK) throw new Error();
    const match = /^room1\.([1-9][0-9]{0,4})\.([A-Za-z0-9_-]+)$/.exec(value);
    if (!match) throw new Error();
    const length = Number(match[1]);
    if (length > MAX_TEXT) throw new Error();
    const bytes = Uint8Array.from(
      atob(match[2].replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0),
    );
    // A fixed output buffer prevents a forged link allocating unbounded memory.
    const text = inflateSync(bytes, { out: new Uint8Array(length) });
    if (text.length !== length) throw new Error();
    const profile = validateProfile(JSON.parse(strFromU8(text)));
    // Also reject truncated streams, extra data and false size declarations.
    if (encodeRoom(profile) !== value) throw new Error();
    return profile;
  } catch {
    throw new Error(
      'This room link is incomplete or invalid. Ask its owner for the full link.',
    );
  }
}
