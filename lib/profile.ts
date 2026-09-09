export type ProfileItem = {
  title: string;
  subtitle: string;
  description: string;
  url: string;
};
export type PetKind =
  | 'quail'
  | 'cat'
  | 'dog'
  | 'rabbit'
  | 'fox'
  | 'hamster'
  | 'none';
export const petKinds: PetKind[] = [
  'quail',
  'cat',
  'dog',
  'rabbit',
  'fox',
  'hamster',
  'none',
];

export type HairStyle =
  | 'long'
  | 'bob'
  | 'short'
  | 'bun'
  | 'ponytail'
  | 'curly'
  | 'buzz';
export const hairStyles: HairStyle[] = [
  'long',
  'bob',
  'short',
  'bun',
  'ponytail',
  'curly',
  'buzz',
];

/** The kind of room the whole thing sits in. */
export type ShellKind = 'attic' | 'loft' | 'cabin' | 'studio';
export const shellKinds: ShellKind[] = ['attic', 'loft', 'cabin', 'studio'];

export type LayoutKind = 'classic' | 'mirrored' | 'cosy';
export const layoutKinds: LayoutKind[] = ['classic', 'mirrored', 'cosy'];

/** Every zone that can be shown or hidden in the room. */
export const zoneIds = [
  'desk',
  'printer',
  'homelab',
  'repair',
  'radio',
  'projects',
  'work',
] as const;
export type ZoneId = (typeof zoneIds)[number];

/**
 * Zones whose contents physically rest on another zone's furniture. The 3D
 * printer sits on the workbench top, so without the bench it would hang in
 * mid-air — hiding the parent hides the child too.
 */
export const zoneRequires: Partial<Record<ZoneId, ZoneId>> = {
  printer: 'repair',
};

export type TimeOfDay = 'day' | 'golden' | 'night';
export const timesOfDay: TimeOfDay[] = ['day', 'golden', 'night'];

export type RoomOptions = {
  pet: PetKind;
  petName: string;
  petColor: string;
  shell: ShellKind;
  layout: LayoutKind;
  /** Zones on show. Anything not listed is hidden from the room. */
  zones: ZoneId[];
  wall: string;
  floor: string;
  rug: string;
  showRug: boolean;
  desk: string;
  beanbag: string;
  shelf: string;
  /** Pot plants dotted around the floor, 0-3. */
  plants: number;
  /** Up to three posters on the wall, as colours. */
  posters: string[];
  timeOfDay: TimeOfDay;
};

/** One-click palettes, so a whole room can be themed without picking six colours. */
export type Theme = {
  id: string;
  label: string;
  wall: string;
  floor: string;
  rug: string;
  desk: string;
  beanbag: string;
  shelf: string;
  accent: string;
  timeOfDay: TimeOfDay;
};

export const themes: Theme[] = [
  {
    id: 'attic',
    label: 'Warm attic',
    wall: '#e7dbd7',
    floor: '#efe7d8',
    rug: '#c98d86',
    desk: '#d8a866',
    beanbag: '#e8749c',
    shelf: '#f0ebe4',
    accent: '#7059ce',
    timeOfDay: 'day',
  },
  {
    id: 'forest',
    label: 'Forest',
    wall: '#cddac9',
    floor: '#e6e2d2',
    rug: '#7f9b78',
    desk: '#a9793f',
    beanbag: '#6f9e77',
    shelf: '#f2efe6',
    accent: '#3f7a52',
    timeOfDay: 'day',
  },
  {
    id: 'dusk',
    label: 'Dusk',
    wall: '#b9a7c4',
    floor: '#e3dbe4',
    rug: '#8b6f9c',
    desk: '#9c7350',
    beanbag: '#d1789e',
    shelf: '#efe9f0',
    accent: '#6a4a8f',
    timeOfDay: 'golden',
  },
  {
    id: 'seaside',
    label: 'Seaside',
    wall: '#bcd6dd',
    floor: '#eee9dd',
    rug: '#7fa9bb',
    desk: '#c9a071',
    beanbag: '#5fa0b8',
    shelf: '#f1f3f2',
    accent: '#2f7f96',
    timeOfDay: 'day',
  },
  {
    id: 'midnight',
    label: 'Midnight',
    wall: '#5d6480',
    floor: '#7b7a86',
    rug: '#4a5270',
    desk: '#8a6a4a',
    beanbag: '#6c6fb0',
    shelf: '#d9dae4',
    accent: '#8d7ce8',
    timeOfDay: 'night',
  },
  {
    id: 'bakery',
    label: 'Bakery',
    wall: '#f0dcc6',
    floor: '#f3ead9',
    rug: '#d9a06a',
    desk: '#c08b52',
    beanbag: '#e0a05e',
    shelf: '#fdf6ec',
    accent: '#b06a2c',
    timeOfDay: 'golden',
  },
];

export type Profile = {
  name: string;
  headline: string;
  location: string;
  bio: string;
  contactUrl: string;
  skills: string;
  experience: ProfileItem[];
  projects: ProfileItem[];
  appearance: {
    skin: string;
    hair: string;
    hairStyle: HairStyle;
    hoodie: string;
    accent: string;
    night: boolean;
  };
  room: RoomOptions;
};

export const defaultRoom: RoomOptions = {
  pet: 'quail',
  petName: '',
  petColor: '#c9873f',
  shell: 'attic',
  layout: 'classic',
  zones: [...zoneIds],
  wall: '#e7dbd7',
  floor: '#efe7d8',
  rug: '#c98d86',
  showRug: false,
  desk: '#d8a866',
  beanbag: '#e8749c',
  shelf: '#f0ebe4',
  plants: 1,
  posters: [],
  timeOfDay: 'day',
};
export const defaultProfile: Profile = {
  name: '',
  headline: '',
  location: '',
  bio: '',
  contactUrl: '',
  skills: '',
  experience: [],
  projects: [],
  appearance: {
    skin: '#efc6b5',
    hair: '#963f3a',
    hairStyle: 'long',
    hoodie: '#5683a9',
    accent: '#7059ce',
    night: false,
  },
  room: defaultRoom,
};
const reserved = new Set([
  'edit',
  'view',
  'api',
  'healthz',
  'admin',
  'login',
  'logout',
  'www',
  'assets',
  'sophie',
  'favicon',
  'robots',
  'sitemap',
  'data',
]);
export function validSlug(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/.test(value) &&
    !reserved.has(value)
  );
}
export function suggestedSlug(name: string) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
    .replace(/-$/, '');
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Please check the page details.');
  return value as Record<string, unknown>;
}
function field(value: unknown, name: string, max: number, required = false) {
  if (
    typeof value !== 'string' ||
    value.length > max ||
    (required && !value.trim())
  )
    throw new Error(
      `${name}: ${required ? 'required, ' : ''}maximum ${max} characters.`,
    );
  return value.trim();
}
function url(value: unknown) {
  const text = field(value, 'Link', 500);
  if (!text) return '';
  try {
    const parsed = new URL(text);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password)
      throw new Error();
    return parsed.href;
  } catch {
    throw new Error(
      'Links must be full https:// addresses, without passwords.',
    );
  }
}
function items(value: unknown, name: string, draft: boolean): ProfileItem[] {
  if (!Array.isArray(value) || value.length > 12)
    throw new Error(`${name}: maximum 12 entries.`);
  return value.map((item) => {
    const v = object(item);
    return {
      title: field(v.title, `${name} title`, 100, !draft),
      subtitle: field(v.subtitle, 'Subtitle', 140),
      description: field(v.description, 'Description', 1800),
      url: draft ? field(v.url, 'Link', 500) : url(v.url),
    };
  });
}
/**
 * Reads the room block leniently. Drafts saved before the room options existed
 * have no `room` key, so anything missing or unrecognised falls back to the
 * default rather than throwing and locking someone out of their own draft.
 */
function roomOptions(value: unknown): RoomOptions {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return { ...defaultRoom, zones: [...zoneIds] };
  const r = value as Record<string, unknown>;
  const hex = (v: unknown, fallback: string) =>
    typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : fallback;
  const zones = Array.isArray(r.zones)
    ? (r.zones.filter(
        (z): z is ZoneId =>
          typeof z === 'string' && (zoneIds as readonly string[]).includes(z),
      ) as ZoneId[])
    : [...zoneIds];
  const posters = Array.isArray(r.posters)
    ? r.posters
        .filter(
          (c): c is string =>
            typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c),
        )
        .slice(0, 3)
    : [];
  const plants = Number(r.plants);
  return {
    pet: petKinds.includes(r.pet as PetKind)
      ? (r.pet as PetKind)
      : defaultRoom.pet,
    petColor: hex(r.petColor, defaultRoom.petColor),
    shell: shellKinds.includes(r.shell as ShellKind)
      ? (r.shell as ShellKind)
      : defaultRoom.shell,
    showRug: typeof r.showRug === 'boolean' ? r.showRug : defaultRoom.showRug,
    plants: Number.isFinite(plants)
      ? Math.min(3, Math.max(0, Math.round(plants)))
      : defaultRoom.plants,
    posters,
    timeOfDay: timesOfDay.includes(r.timeOfDay as TimeOfDay)
      ? (r.timeOfDay as TimeOfDay)
      : defaultRoom.timeOfDay,
    petName: typeof r.petName === 'string' ? r.petName.trim().slice(0, 24) : '',
    layout: layoutKinds.includes(r.layout as LayoutKind)
      ? (r.layout as LayoutKind)
      : defaultRoom.layout,
    // Preserve hidden corners when restoring a saved room.
    zones: [...new Set(zones)],
    wall: hex(r.wall, defaultRoom.wall),
    floor: hex(r.floor, defaultRoom.floor),
    rug: hex(r.rug, defaultRoom.rug),
    desk: hex(r.desk, defaultRoom.desk),
    beanbag: hex(r.beanbag, defaultRoom.beanbag),
    shelf: hex(r.shelf, defaultRoom.shelf),
  };
}

export function validateProfile(value: unknown, draft = false): Profile {
  const p = object(value),
    a = object(p.appearance);
  const color = (value: unknown) => {
    if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value))
      throw new Error('Choose a valid colour.');
    return value;
  };
  if (typeof a.night !== 'boolean') throw new Error('Choose day or night.');
  return {
    name: field(p.name, 'Name', 80, !draft),
    headline: field(p.headline, 'Headline', 140, !draft),
    location: field(p.location, 'Location', 100),
    bio: field(p.bio, 'About you', 3000),
    contactUrl: draft ? field(p.contactUrl, 'Link', 500) : url(p.contactUrl),
    skills: field(p.skills, 'Skills', 1000),
    experience: items(p.experience, 'Experience', draft),
    projects: items(p.projects, 'Projects', draft),
    appearance: {
      skin: color(a.skin),
      hair: color(a.hair),
      // Older drafts predate hair styles, so fall back rather than throw.
      hairStyle: hairStyles.includes(a.hairStyle as HairStyle)
        ? (a.hairStyle as HairStyle)
        : 'long',
      hoodie: color(a.hoodie),
      accent: color(a.accent),
      night: a.night,
    },
    room: roomOptions(p.room),
  };
}
