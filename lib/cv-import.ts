import { unzipSync } from 'fflate';
import {
  defaultProfile,
  validateProfile,
  type Profile,
  type ProfileItem,
} from './profile.ts';

/*
 * Turns an uploaded CV into a filled-in profile.
 *
 * Everything happens in the browser — the file is read with FileReader, parsed
 * here, and never sent anywhere. That keeps a document full of personal detail
 * off the network, and means this works with no backend at all.
 */

export type ImportResult = {
  profile: Profile;
  /** Which fields we actually managed to fill, for the "here's what I found" summary. */
  filled: string[];
  /** Things worth telling the user about — a scanned PDF, a very short file. */
  notes: string[];
};

const MAX_BYTES = 8 * 1024 * 1024;

/* ------------------------------------------------------------ file → text */

function stripXml(xml: string) {
  return (
    xml
      // keep paragraph and line breaks as newlines before tags are dropped
      .replace(/<w:p[ >]/g, '\n<w:p ')
      .replace(/<\/w:p>/g, '\n')
      .replace(/<w:br\s*\/?>/g, '\n')
      .replace(/<w:tab\s*\/?>/g, '\t')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
  );
}

async function docxToText(buf: ArrayBuffer) {
  const files = unzipSync(new Uint8Array(buf), {
    filter: (entry) => {
      if (entry.name !== 'word/document.xml') return false;
      if (entry.originalSize > 4 * 1024 * 1024)
        throw new Error('The document text is too large to import safely.');
      return true;
    },
  });
  const doc = files['word/document.xml'];
  if (!doc) throw new Error('That .docx has no readable document inside it.');
  return stripXml(new TextDecoder().decode(doc));
}

/**
 * PDF text via pdf.js. A hand-rolled reader gets mojibake on any PDF whose
 * fonts are subset with a custom encoding — which is most of them — so this
 * uses the real library and its ToUnicode handling.
 */
async function pdfToText(buf: ArrayBuffer) {
  const pdfjs = await import('pdfjs-dist');
  // Point at the worker the bundler emits; without this pdf.js refuses to start.
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buf),
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;
  try {
    if (doc.numPages > 50)
      throw new Error('Please use a CV with 50 pages or fewer.');
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      let line = '';
      let lastY: number | null = null;
      const out: string[] = [];
      for (const item of content.items) {
        const it = item as {
          str?: string;
          transform?: number[];
          hasEOL?: boolean;
        };
        if (typeof it.str !== 'string') continue;
        const y = it.transform?.[5] ?? null;
        // a new baseline means a new line
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) {
          if (line.trim()) out.push(line.trim());
          line = '';
        }
        line += it.str;
        if (it.hasEOL) {
          if (line.trim()) out.push(line.trim());
          line = '';
        }
        lastY = y;
      }
      if (line.trim()) out.push(line.trim());
      pages.push(out.join('\n'));
    }
    return pages.join('\n');
  } finally {
    await doc.destroy();
  }
}

export async function fileToText(file: File): Promise<string> {
  if (file.size > MAX_BYTES)
    throw new Error('That file is over 8MB. Try a smaller export.');
  const name = file.name.toLowerCase();

  if (name.endsWith('.docx')) return docxToText(await file.arrayBuffer());
  if (name.endsWith('.pdf')) return pdfToText(await file.arrayBuffer());
  if (name.endsWith('.doc'))
    throw new Error(
      'Old .doc files cannot be read here — re-save it as .docx or PDF.',
    );
  // .txt, .md, .json, .rtf and anything else text-shaped
  return file.text();
}

/* ------------------------------------------------------- text → profile */

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]{2,}/;
const URLRE = /https?:\/\/[^\s<>()]+/gi;
const PHONE = /(?:\+\d{1,3}[\s-]?)?(?:\(?\d{3,5}\)?[\s-]?){2,4}\d{3,4}/;

/** Month-year or year ranges: "Sep 2024 - Present", "2018 – 2021", "01/2020". */
const DATE_RANGE =
  /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*\d{4}|\d{1,2}\/\d{4}|\b(?:19|20)\d{2}\b)\s*(?:–|—|-|to|until)\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*\d{4}|\d{1,2}\/\d{4}|present|now|current|\b(?:19|20)\d{2}\b)/i;

const HEADINGS: Record<string, string[]> = {
  experience: [
    'experience',
    'employment',
    'work history',
    'career history',
    'professional experience',
    'work experience',
    'employment history',
  ],
  projects: ['projects', 'technical projects', 'side projects', 'portfolio'],
  skills: [
    'skills',
    'core skills',
    'technical skills',
    'key skills',
    'competencies',
    'technologies',
  ],
  about: [
    'profile',
    'summary',
    'about',
    'about me',
    'personal statement',
    'objective',
    'professional profile',
  ],
  education: [
    'education',
    'qualifications',
    'education & certification',
    'certifications',
    'training',
  ],
};

function classifyHeading(line: string): string | null {
  const t = line
    .toLowerCase()
    .replace(/[^a-z& ]/g, '')
    .trim();
  if (!t || t.length > 40) return null;
  for (const [key, names] of Object.entries(HEADINGS))
    if (names.includes(t)) return key;
  return null;
}

function looksLikeHeading(line: string) {
  const t = line.trim();
  if (!t || t.length > 48) return false;
  // ALL CAPS, or Title Case with no sentence punctuation
  if (/^[A-Z0-9 &/,'-]+$/.test(t) && t.length > 2) return true;
  return classifyHeading(t) !== null;
}

/**
 * Some PDFs ship a subset font whose ToUnicode table is incomplete, so glyphs
 * (very often digits) decode to control characters. Nothing can recover the
 * real characters from the file, so strip them and report the damage instead
 * of writing mojibake into someone's profile.
 */
// oxlint-disable-next-line no-control-regex -- Detect damaged PDF glyphs, not user-facing text.
const CONTROL = /[\u0000-\u0008\u000b\u000e-\u001f\u007f\ufffd]/g;

/** How many characters failed to decode. A healthy PDF scores zero. */
export function textDamage(text: string) {
  return text ? (text.match(CONTROL)?.length ?? 0) : 0;
}

/**
 * CSS letter-spacing arrives from a PDF as "S E N I O R  H E L P D E S K".
 * Both the letter gaps and the word gaps end up as single spaces, so the words
 * cannot be put back reliably — closing it up gives "SENIORHELPDESK". These
 * lines are decorative headings, so they are recognised and skipped instead.
 */
function isLetterSpaced(line: string) {
  const tokens = line.split(' ').filter(Boolean);
  if (tokens.length < 6) return false;
  return tokens.filter((t) => t.length === 1).length / tokens.length >= 0.7;
}

function cleanLines(text: string) {
  return text
    .replace(/\r/g, '')
    .replace(CONTROL, '')
    .split('\n')
    .map((l) => l.replace(/[•●▪·]\s*/g, '').trim())
    .filter((l) => l.length > 0);
}

/** Split the CV into named sections using its own headings. */
function sections(lines: string[]) {
  const out: Record<string, string[]> = { _head: [] };
  let current = '_head';
  for (const line of lines) {
    const kind = classifyHeading(line);
    if (kind) {
      current = kind;
      out[current] ||= [];
      continue;
    }
    (out[current] ||= []).push(line);
  }
  return out;
}

/**
 * Group an experience section into entries. A new entry starts at a line that
 * carries a date range, or a heading-ish line followed by one.
 */
function toItems(lines: string[], limit: number): ProfileItem[] {
  const items: ProfileItem[] = [];
  let current: { title: string; subtitle: string; body: string[] } | null =
    null;

  const push = () => {
    if (!current) return;
    const description = current.body.join('\n').trim().slice(0, 1800);
    if (current.title)
      items.push({
        title: current.title.slice(0, 100),
        subtitle: current.subtitle.slice(0, 140),
        description,
        url: '',
      });
    current = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const dated = DATE_RANGE.exec(line);
    const next = lines[i + 1] ?? '';
    const startsEntry =
      dated || (looksLikeHeading(line) && DATE_RANGE.test(next));

    if (startsEntry && items.length < limit) {
      push();
      let title = line;
      let subtitle = '';
      if (dated) {
        subtitle = `${dated[1]} – ${dated[2]}`.replace(/\s+/g, ' ');
        // strip the dates out of the title, plus any leftover separators
        title = line
          .replace(dated[0], '')
          .replace(/[|·•–—-]\s*$/, '')
          .replace(/^\s*[|·•–—-]/, '')
          .trim();
      }
      if (!title) {
        // The line held only dates, so the job title is usually the line
        // above it; fall forward only if there is nothing usable behind.
        const prev = (lines[i - 1] ?? '').trim();
        const takenAsPrev =
          prev &&
          !DATE_RANGE.test(prev) &&
          prev.length <= 120 &&
          (!items.length || items[items.length - 1].title !== prev);
        if (takenAsPrev) {
          title = prev;
          // that line was appended to the previous entry's body — take it back
          const last = items[items.length - 1];
          if (last && last.description.endsWith(prev))
            last.description = last.description.slice(0, -prev.length).trim();
        } else if (next) {
          title = next;
          i++;
        }
      }
      current = { title, subtitle, body: [] };
    } else if (current) {
      current.body.push(line);
    }
  }
  push();
  return items.slice(0, limit);
}

/**
 * PDFs often break an address across text runs, so "sophie1997wilson@…" can
 * arrive as two lines. Test each line and each adjacent pair joined up, and
 * keep the longest valid address — the fragment is always shorter.
 */
function bestEmail(lines: string[]) {
  let best = '';
  // Joining two lines can also glue the following word onto the domain
  // ("…@gmail.comProfessional"), so cut back to the real top-level domain
  // before judging which candidate is the most complete.
  const tidy = (e: string) =>
    e.replace(/\.([a-z]{2,12})(?=[A-Z]).*$/, '.$1').replace(/[.,;:)]+$/, '');
  const consider = (candidate: string) => {
    const m = EMAIL.exec(candidate);
    if (!m) return;
    const clean = tidy(m[0]);
    if (
      /^[\w.+-]+@[\w-]+\.[a-z]{2,12}$/i.test(clean) &&
      clean.length > best.length
    )
      best = clean;
  };
  for (let i = 0; i < lines.length; i++) {
    consider(lines[i]);
    if (i + 1 < lines.length) consider(lines[i] + lines[i + 1]);
  }
  return best;
}

function firstName(lines: string[]) {
  for (const line of lines.slice(0, 8)) {
    const t = line.trim();
    if (!t || EMAIL.test(t) || /https?:/i.test(t) || isLetterSpaced(t))
      continue;
    const words = t.split(/\s+/);
    if (
      words.length >= 2 &&
      words.length <= 4 &&
      t.length <= 48 &&
      !/\d/.test(t) &&
      words.every((w) => /^[A-ZÀ-Þ]/.test(w) || w.length <= 3)
    )
      return t;
  }
  return '';
}

export function parseCv(text: string): ImportResult {
  const damage = textDamage(text);
  const lines = cleanLines(text);
  const notes: string[] = [];
  const filled: string[] = [];
  const profile: Profile = structuredClone(defaultProfile);

  // A well-formed PDF decodes to zero control characters; a handful means the
  // font's character map is incomplete and real characters — usually digits —
  // have been lost, so dates, phone numbers and emails cannot be trusted.
  const mangled = damage > 3;
  if (mangled)
    notes.push(
      'This PDF stores its text in a way that loses some characters — numbers especially, so dates and email addresses may be wrong or missing. Uploading the Word version, or pasting the text in, will read it accurately.',
    );

  if (lines.length < 5) {
    notes.push(
      'Barely any text came out of that file. If it is a scanned or photographed CV there is no text layer to read — paste the text in instead.',
    );
    return { profile, filled, notes };
  }

  const head = lines.slice(0, 12).join('\n');
  const sec = sections(lines);

  // name
  const name = firstName(lines);
  if (name) {
    profile.name = name;
    filled.push('name');
  }

  // Headline: the first real line under the name. Skips the running header or
  // footer a PDF repeats on every page, which contains the name and reads like
  // "Sophie Wilson | IT CV".
  const surname = name.split(/\s+/).slice(-1)[0]?.toLowerCase() ?? '';
  for (const line of lines.slice(0, 8)) {
    const t = line.trim();
    if (!t || t === name || EMAIL.test(t) || /https?:/i.test(t)) continue;
    if (isLetterSpaced(t)) continue;
    const lower = t.toLowerCase();
    const repeatsName = name && lower.includes(name.toLowerCase());
    const looksLikeFooter =
      repeatsName ||
      (surname &&
        lower.includes(surname) &&
        /\bcv\b|resume|curriculum/i.test(t));
    if (looksLikeFooter) continue;
    if (t.length > 4 && t.length <= 140 && !PHONE.test(t)) {
      profile.headline = t;
      filled.push('headline');
      break;
    }
  }

  // Location — a "Town, County" line near the top. Kept deliberately tight:
  // a loose pattern happily matches things like "Microsoft Intune, Entra ID".
  const TECH =
    /microsoft|intune|entra|azure|windows|linux|python|powershell|aws|google|cisco|office|sql|react|node|docker|active directory/i;
  for (const line of lines.slice(0, 12)) {
    const t = line.replace(/\|/g, ',').trim();
    if (EMAIL.test(t) || /https?:/i.test(t) || TECH.test(t)) continue;
    // no more than three words either side, and not a comma-separated list
    if ((t.match(/,/g) ?? []).length > 1) continue;
    const m =
      /^([A-Z][\w'-]+(?:[ -][A-Z][\w'-]+){0,2},\s*[A-Z][\w'-]+(?:[ -][A-Z][\w'-]+){0,2})$/.exec(
        t,
      );
    if (m && m[1].length < 60) {
      profile.location = m[1];
      filled.push('location');
      break;
    }
  }

  // contact link — prefer an explicit URL, fall back to the email
  const urls = head.match(URLRE);
  if (urls?.length) {
    profile.contactUrl = urls[0].replace(/[.,)]+$/, '');
    filled.push('link');
  } else {
    const email = bestEmail(lines);
    // A damaged text layer produces plausible-looking but wrong addresses,
    // so leave the field empty rather than fill in something incorrect.
    if (email && !mangled) {
      profile.contactUrl = `mailto:${email}`;
      filled.push('link');
    } else if (email && mangled) {
      notes.push(
        `An email like "${email}" was found, but characters are missing from this file — type it in yourself to be safe.`,
      );
    }
  }

  // about
  const about = (sec.about ?? []).join('\n').trim();
  if (about) {
    profile.bio = about.slice(0, 3000);
    filled.push('about');
  } else {
    // no labelled profile section — use the longest early paragraph
    const candidate = lines
      .slice(0, 30)
      .filter((l) => l.length > 120)
      .sort((a, b) => b.length - a.length)[0];
    if (candidate) {
      profile.bio = candidate.slice(0, 3000);
      filled.push('about');
    }
  }

  // skills
  const skills = (sec.skills ?? []).join(', ').replace(/,\s*,/g, ',').trim();
  if (skills) {
    profile.skills = skills.slice(0, 1000);
    filled.push('skills');
  }

  // experience — fall back to scanning the whole document for dated entries
  let experience = toItems(sec.experience ?? [], 12);
  if (!experience.length) experience = toItems(lines, 12);
  if (experience.length) {
    profile.experience = experience;
    filled.push(`${experience.length} roles`);
  }

  // projects
  const projects = toItems(sec.projects ?? [], 12);
  if (projects.length) {
    profile.projects = projects;
    filled.push(`${projects.length} projects`);
  }

  // education gets folded into the bio, since there is no field for it
  const education = (sec.education ?? []).join(' · ').trim();
  if (education) {
    profile.bio = `${profile.bio}\n\nEducation: ${education}`
      .trim()
      .slice(0, 3000);
    if (!filled.includes('about')) filled.push('about');
  }

  if (!experience.length)
    notes.push(
      'No dated roles were recognised, so Experience is empty — add them by hand on the next step.',
    );
  if (!name)
    notes.push('Could not spot a name at the top — fill that in yourself.');

  return { profile, filled, notes };
}

export async function importCvFile(file: File): Promise<ImportResult> {
  const text = await fileToText(file);
  // A previously exported profile comes back as JSON — take it verbatim.
  if (file.name.toLowerCase().endsWith('.json')) {
    try {
      const data = JSON.parse(text);
      const p =
        data && typeof data === 'object' && 'profile' in data
          ? (data as { profile: unknown }).profile
          : data;
      if (!p || typeof p !== 'object' || Array.isArray(p))
        throw new Error('Invalid profile.');
      return {
        profile: validateProfile(
          { ...structuredClone(defaultProfile), ...(p as object) },
          true,
        ),
        filled: ['everything from the saved file'],
        notes: [],
      };
    } catch {
      throw new Error('That .json file could not be read.');
    }
  }
  return parseCv(text);
}
