import baseline from './baseline.json' with { type: 'json' };

export type Entry = {
  id: string;
  title: string;
  date: string;
  year: number | null;
  category: string;
  status: string;
  metrics: string[];
  stack: string[];
  description: string;
  kind: string;
  url?: string;
};
export const categories: Record<string, { label: string; color: string }> = {
  career: { label: 'Career', color: '#c8f477' },
  telecoms: { label: 'Telecoms', color: '#f4ca79' },
  endpoint: { label: 'Endpoints', color: '#a8caed' },
  identity: { label: 'Identity & access', color: '#bcadf1' },
  infrastructure: { label: 'Infrastructure', color: '#77d5c5' },
  automation: { label: 'Automation', color: '#f0a99b' },
  licensing: { label: 'Licensing & budgets', color: '#d4cfaa' },
  'contact-centre': { label: 'Contact centre', color: '#9fbbea' },
  personal: { label: 'Personal projects', color: '#c8f477' },
  making: { label: 'Hardware & making', color: '#edb5a2' },
};
export const milestones: Entry[] = baseline.milestones;
export const ongoing: Entry[] = baseline.ongoing;
export const projects: Entry[] = baseline.projects;
const workEntries: Entry[] = [
  ...milestones.filter((m) => m.category !== 'career'),
  ...ongoing,
];
const featuredWork = [
  'm-autopilot-rollout',
  'm-ee-migration',
  'm-card-reader',
  'm-licensing-register',
  'm-water-detection',
  'm-playwright',
  'm-meraki',
  'm-server-rebuild',
];
export const workProjects: Entry[] = [
  ...featuredWork
    .map((id) => workEntries.find((p) => p.id === id)!)
    .filter(Boolean),
  ...workEntries.filter((p) => !featuredWork.includes(p.id)),
];
export const skills = baseline.skills;
export const employers = [
  {
    id: 'png',
    name: 'Procter & Gamble',
    from: '2015-01',
    to: '2018-07',
    role: 'Production Operative → Material Manager',
    detail:
      'From the production line to managing a team of 5–10 and the movement of production materials.',
    color: '#8bb8c5',
  },
  {
    id: 'blyth',
    name: 'Blyth Repair',
    from: '2018-01',
    to: '2021-01',
    role: 'Founder & Technician',
    detail:
      'Built and ran a computer, phone and console repair business, from diagnosis and repairs to customer support and finances.',
    color: '#d5ac82',
  },
  {
    id: 'bureau',
    name: 'Document scanning bureau',
    from: '2021-01',
    to: '2022-01',
    role: 'Bureau Operative',
    detail:
      'High-volume scanning, document preparation and quality control before client release.',
    color: '#b5a4d0',
  },
  {
    id: 'verisure',
    name: 'Verisure',
    from: '2022-08',
    to: 'Present',
    role: 'Senior Helpdesk Technician',
    detail:
      'Telecoms, frontline support and senior technical delivery for the UK and Ireland operation.',
    color: '#c8f477',
  },
];
export const yearTitles: Record<number, string> = {
  2015: 'Learning how things work.',
  2016: 'Building the foundations.',
  2017: 'Taking responsibility.',
  2018: 'Building something of my own.',
  2019: 'Fixing it. Earning trust.',
  2020: 'Keeping people connected.',
  2021: 'Precision at scale.',
  2022: 'A new chapter in IT.',
  2023: 'Connecting the whole estate.',
  2024: 'Stepping into senior support.',
  2025: 'Making the complex repeatable.',
  2026: 'Systems, software & what comes next.',
};
export const years = Array.from({ length: 12 }, (_, i) => 2015 + i);
export const dateLabel = (value: string): string =>
  value
    .split(' → ')
    .map((p) =>
      /^\d{4}-\d{2}(-\d{2})?$/.test(p)
        ? new Date(
            p + (p.length === 7 ? '-01' : '') + 'T12:00:00Z',
          ).toLocaleDateString('en-GB', {
            day: p.length === 10 ? 'numeric' : undefined,
            month: 'short',
            year: 'numeric',
            timeZone: 'UTC',
          })
        : p,
    )
    .join(' – ');
export const statusLabel = (s: string) =>
  (
    ({
      live: 'Built / used',
      prototype: 'Prototype',
      abandoned: 'Experiment',
      delivered: 'Delivered',
      ongoing: 'Ongoing',
      research: 'Research',
      planned: 'Planned',
    }) as Record<string, string>
  )[s] ?? s;
