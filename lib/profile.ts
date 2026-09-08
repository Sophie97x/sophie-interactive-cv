export type ProfileItem = {
  title: string;
  subtitle: string;
  description: string;
  url: string;
};
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
    hoodie: string;
    accent: string;
    night: boolean;
  };
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
    hoodie: '#5683a9',
    accent: '#7059ce',
    night: false,
  },
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
      hoodie: color(a.hoodie),
      accent: color(a.accent),
      night: a.night,
    },
  };
}
