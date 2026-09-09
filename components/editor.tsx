'use client';
/* oxlint-disable next/no-html-link-for-pages -- Full navigation is intentional: published slugs use the self-hosted server's static shell. */

import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Download,
  Eye,
  House,
  Plus,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import PersonalPortfolio from './personal-portfolio';
import ShareRoom from './share-room';
import { staticHosting, sitePath } from '@/lib/site';
import { importCvFile } from '@/lib/cv-import';
import {
  defaultProfile,
  defaultRoom,
  hairStyles,
  layoutKinds,
  petKinds,
  shellKinds,
  suggestedSlug,
  validSlug,
  validateProfile,
  themes,
  timesOfDay,
  zoneIds,
  zoneRequires,
  type HairStyle,
  type LayoutKind,
  type PetKind,
  type ShellKind,
  type Profile,
  type ProfileItem,
  type RoomOptions,
  type TimeOfDay,
  type ZoneId,
} from '@/lib/profile';

type Draft = {
  profile: Profile;
  slug: string;
  editKey: string;
  revision: number;
};
const storageKey = staticHosting ? 'attic-studio-pages-v1' : 'attic-studio-v1';
const emptyDraft = (): Draft => ({
  profile: structuredClone(defaultProfile),
  slug: '',
  editKey: '',
  revision: 0,
});
const steps = ['About you', 'Experience', 'Projects', 'Your room', 'Share it'];
async function api(path: string, method = 'GET', body?: unknown, key?: string) {
  const response = await fetch(`/api/${path}`, {
    method,
    cache: 'no-store',
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = (await response.json()) as {
    error?: string;
    publishing: boolean;
    origin: string;
    available: boolean;
    profile: Profile;
    slug: string;
    revision: number;
  };
  if (!response.ok)
    throw new Error(data.error || 'Could not save. Please try again.');
  return data;
}
function newKey() {
  return btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))),
  )
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
/** Offer the page details as a file, for anyone who would rather keep one. */
function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function TextField({
  label,
  value,
  onChange,
  max = 140,
  multiline = false,
  placeholder = '',
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max?: number;
  multiline?: boolean;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <label className="studio-field">
      <span>{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={max}
          rows={4}
          placeholder={placeholder}
        />
      ) : (
        <input
          readOnly={readOnly}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={max}
          placeholder={placeholder}
        />
      )}
    </label>
  );
}
export default function Editor() {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [step, setStep] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [saved, setSaved] = useState('Loading draft…');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [addressStatus, setAddressStatus] = useState('');
  const [origin, setOrigin] = useState('your-domain');
  const [online, setOnline] = useState(false);
  const [publishing, setPublishing] = useState(true);
  const [openSlug, setOpenSlug] = useState('');
  const [openKey, setOpenKey] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    filled: string[];
    notes: string[];
  } | null>(null);
  const { profile, slug, editKey, revision } = draft;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const data = JSON.parse(raw);
        const clean = validateProfile(data.profile, true);
        if (
          typeof data.slug !== 'string' ||
          typeof data.editKey !== 'string' ||
          !Number.isInteger(data.revision) ||
          data.revision < 0
        )
          throw new Error();
        // Restore browser-only storage after hydration, never during server rendering.
        // oxlint-disable-next-line react/react-compiler
        setDraft({
          profile: clean,
          slug: data.slug,
          editKey: data.editKey,
          revision: data.revision,
        });
      }
    } catch {
      setMessage(
        'Your saved draft could not be loaded. You can reopen a published page with its edit key.',
      );
    }
    setOrigin(window.location.origin);
    setHydrated(true);
    if (staticHosting) return;
    api('config')
      .then((config) => {
        setOnline(true);
        setPublishing(config.publishing);
        setOrigin(config.origin);
      })
      .catch(() =>
        setError(
          'Publishing server unavailable. You can still build your draft; run npm run build and npm start to publish locally.',
        ),
      );
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(draft));
      // This status reflects the result of synchronising with external storage.
      // oxlint-disable-next-line react/react-compiler
      setSaved('Draft saved on this device');
    } catch {
      setSaved('Draft not saved — browser storage unavailable');
    }
  }, [draft, hydrated]);
  useEffect(() => {
    if (revision || !slug || !online) {
      // Reset the previous request's result when the requested address changes.
      // oxlint-disable-next-line react/react-compiler
      setAddressStatus('');
      return;
    }
    if (!validSlug(slug)) {
      setAddressStatus(
        'Use 3–40 lowercase letters, numbers or hyphens. Some names are reserved.',
      );
      return;
    }
    let active = true;
    setAddressStatus('Checking…');
    const timer = setTimeout(() => {
      api(`availability/${encodeURIComponent(slug)}`)
        .then((data) => {
          if (active)
            setAddressStatus(
              data.available
                ? 'Available — yours when you publish.'
                : 'Already taken. Try another name.',
            );
        })
        .catch(() => {
          if (active)
            setAddressStatus(
              'Could not check this address. Try again when you publish.',
            );
        });
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [slug, revision, online]);

  /** Update one room option without disturbing the rest of the profile. */
  function roomField<K extends keyof RoomOptions>(
    key: K,
    value: RoomOptions[K],
  ) {
    setDraft((d) => ({
      ...d,
      profile: {
        ...d.profile,
        room: { ...(d.profile.room ?? defaultRoom), [key]: value },
      },
    }));
  }

  /** Apply a whole palette at once, leaving the pet, zones and layout alone. */
  function applyTheme(id: string) {
    const t = themes.find((x) => x.id === id);
    if (!t) return;
    setDraft((d) => ({
      ...d,
      profile: {
        ...d.profile,
        appearance: {
          ...d.profile.appearance,
          accent: t.accent,
          night: t.timeOfDay === 'night',
        },
        room: {
          ...(d.profile.room ?? defaultRoom),
          wall: t.wall,
          floor: t.floor,
          rug: t.rug,
          desk: t.desk,
          beanbag: t.beanbag,
          shelf: t.shelf,
          timeOfDay: t.timeOfDay,
        },
      },
    }));
  }

  function togglePoster(color: string) {
    const current = draft.profile.room?.posters ?? [];
    roomField(
      'posters',
      current.includes(color)
        ? current.filter((c) => c !== color)
        : [...current, color].slice(0, 3),
    );
  }

  function toggleZone(id: ZoneId) {
    const current = draft.profile.room?.zones ?? defaultRoom.zones;
    const next = current.includes(id)
      ? current.filter((z) => z !== id)
      : [...current, id];
    // Never let the room end up completely empty.
    roomField('zones', next.length ? next : current);
  }

  /**
   * Read an uploaded CV and fill the form from it. Parsing happens in this
   * browser — the file is never uploaded anywhere — and it only overwrites
   * fields it actually found something for, so a partial CV cannot wipe work
   * that has already been typed in.
   */
  async function onCvFile(file: File | null | undefined) {
    if (!file) return;
    setImporting(true);
    setError('');
    setImportSummary(null);
    try {
      const result = await importCvFile(file);
      setDraft((d) => {
        const found = result.profile;
        if (file.name.toLowerCase().endsWith('.json'))
          return { ...emptyDraft(), profile: found };
        const keep = <T,>(incoming: T, existing: T) =>
          incoming && String(incoming).trim() ? incoming : existing;
        return {
          ...d,
          profile: {
            ...d.profile,
            name: keep(found.name, d.profile.name),
            headline: keep(found.headline, d.profile.headline),
            location: keep(found.location, d.profile.location),
            bio: keep(found.bio, d.profile.bio),
            contactUrl: keep(found.contactUrl, d.profile.contactUrl),
            skills: keep(found.skills, d.profile.skills),
            experience: found.experience.length
              ? found.experience
              : d.profile.experience,
            projects: found.projects.length
              ? found.projects
              : d.profile.projects,
          },
        };
      });
      setImportSummary({ filled: result.filled, notes: result.notes });
      setMessage(
        result.filled.length
          ? `Read your CV and filled in ${result.filled.join(', ')}.`
          : 'That file was read, but nothing recognisable came out of it.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That file could not be read.');
    } finally {
      setImporting(false);
    }
  }

  function field<K extends keyof Profile>(key: K, value: Profile[K]) {
    setDraft((d) => ({ ...d, profile: { ...d.profile, [key]: value } }));
    setMessage('');
  }
  function item(
    kind: 'experience' | 'projects',
    index: number,
    key: keyof ProfileItem,
    value: string,
  ) {
    field(
      kind,
      profile[kind].map((v, i) => (i === index ? { ...v, [key]: value } : v)),
    );
  }
  function go(next: number) {
    setStep(next);
    setError('');
    if (next === 4 && !slug)
      setDraft((d) => ({ ...d, slug: suggestedSlug(d.profile.name) }));
  }
  async function publish() {
    setError('');
    setMessage('');
    try {
      const clean = validateProfile(profile);
      if (!validSlug(slug))
        throw new Error(
          'Choose a page address using 3–40 lowercase letters, numbers or hyphens.',
        );
      if (!revision && !consent)
        throw new Error(
          'Please confirm that these details can be made public.',
        );
      setBusy(true);
      const key = editKey || newKey();
      const pending = { ...draft, editKey: key };
      // Persist the key before sending, so a lost response cannot lock its owner out.
      setDraft(pending);
      try {
        localStorage.setItem(storageKey, JSON.stringify(pending));
      } catch {
        // This browser will not keep the draft, so the key only exists here.
        void copy(key, 'Edit key');
      }
      const result = await api(
        revision ? `portfolios/${slug}` : 'portfolios',
        revision ? 'PUT' : 'POST',
        revision
          ? { profile: clean, revision }
          : { slug, profile: clean, editKey: key },
        revision ? key : undefined,
      );
      setDraft({
        profile: clean,
        slug: result.slug,
        revision: result.revision,
        editKey: key,
      });
      setMessage(
        !revision && JSON.stringify(result.profile) !== JSON.stringify(clean)
          ? 'Your earlier publish succeeded. Your newer draft has been kept — save changes to make it live.'
          : revision
            ? 'Your changes are live.'
            : 'Your room is live! Save your private edit key below.',
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not publish. Your draft is still here.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function open() {
    setError('');
    setMessage('');
    if (!validSlug(openSlug)) {
      setError('Enter just the page name, for example alex-smith.');
      return;
    }
    if (
      !window.confirm(
        'Replace the draft in this editor with that published page?',
      )
    )
      return;
    setBusy(true);
    try {
      const result = await api(
        `unlock/${openSlug}`,
        'POST',
        {},
        openKey.trim(),
      );
      setDraft({
        profile: validateProfile(result.profile),
        slug: result.slug,
        revision: result.revision,
        editKey: openKey.trim(),
      });
      setOpenKey('');
      setConsent(true);
      setStep(0);
      setMessage('Page opened. Your changes stay private until you save them.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open this page.');
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (
      !window.confirm(
        `Unpublish /${slug}? The public page will be removed and this address will become available. Your local draft stays here.`,
      )
    )
      return;
    setBusy(true);
    setError('');
    try {
      await api(`portfolios/${slug}`, 'DELETE', {}, editKey);
      setDraft((d) => ({ ...d, revision: 0, editKey: '' }));
      setConsent(false);
      setMessage('Unpublished. Your local draft has been kept.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not unpublish.');
    } finally {
      setBusy(false);
    }
  }
  async function copy(value: string, what = 'Link') {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(`${what} copied.`);
    } catch {
      setError(
        `Copy is unavailable here. Select and copy the ${what.toLowerCase()} by hand instead.`,
      );
    }
  }
  const shareUrl = `${origin}/${slug || 'your-name'}`;

  /*
   * What still stands between this draft and a published page. The publish
   * call validates the same things, but only after the click — this says so
   * up front and offers a way straight to the step that fixes it.
   */
  const readiness: {
    label: string;
    detail: string;
    done: boolean;
    step?: number;
  }[] = [
    {
      label: 'Your name',
      detail: profile.name.trim() || 'Needed on the page itself',
      done: !!profile.name.trim(),
      step: 0,
    },
    {
      label: 'What you do',
      detail: profile.headline.trim() || 'One line under your name',
      done: !!profile.headline.trim(),
      step: 0,
    },
    {
      label: 'Your story',
      detail: `${profile.experience.length} ${
        profile.experience.length === 1 ? 'experience' : 'experiences'
      } · ${profile.projects.length} ${
        profile.projects.length === 1 ? 'project' : 'projects'
      }`,
      done: profile.experience.length > 0 || profile.projects.length > 0,
      step: 1,
    },
    {
      label: 'Your address',
      detail: validSlug(slug) ? shareUrl : 'Pick a page address below',
      done: validSlug(slug),
    },
  ];
  const ready = readiness.every((c) => c.done);
  // Invalid links can remain in a draft, but must never become clickable preview URLs.
  const safeLink = (value: string) => {
    try {
      const u = new URL(value);
      return u.protocol === 'https:' && !u.username && !u.password
        ? u.href
        : '';
    } catch {
      return '';
    }
  };
  const previewProfile = {
    ...profile,
    contactUrl: safeLink(profile.contactUrl),
    projects: profile.projects.map((v) => ({ ...v, url: safeLink(v.url) })),
    experience: profile.experience.map((v) => ({ ...v, url: safeLink(v.url) })),
  };
  return (
    <main className={`studio ${showPreview ? 'preview-open' : ''}`}>
      <header className="studio-header">
        <a className="studio-brand" href={sitePath()}>
          <House size={23} />
          <span>
            little room<span className="studio-brand-dot">.</span>
          </span>
        </a>
        <span className="studio-header-label">
          Make a space that feels like you
        </span>
        <button
          className="studio-button secondary mobile-preview"
          onClick={() => setShowPreview((v) => !v)}
        >
          <Eye size={16} />
          {showPreview ? 'Back to editor' : 'Preview'}
        </button>
        <span className="studio-save-state">
          <Check size={14} /> {saved}
        </span>
      </header>
      <div className="studio-layout">
        <section className="studio-editor" aria-label="CV editor">
          <div className={`studio-welcome${step > 0 ? ' is-compact' : ''}`}>
            <span className="studio-eyebrow">Your story, your space</span>
            <h1>
              Make yourself <br />
              at home<span>.</span>
            </h1>
            <p>
              A CV with a little more you. Add your story, make the room yours,
              then share a link.
            </p>
          </div>
          <nav className="studio-steps" aria-label="Editor steps">
            {steps.map((label, i) => (
              <button
                key={label}
                aria-current={step === i ? 'step' : undefined}
                onClick={() => go(i)}
              >
                <span>{i + 1}</span>
                {label}
              </button>
            ))}
          </nav>
          <div className="studio-form">
            <div className="studio-step-title">
              <span>0{step + 1} / 05</span>
              <h2>{steps[step]}</h2>
              <p>
                {
                  [
                    'Start with the basics. You can change everything later.',
                    'The jobs, studies and experiences that got you here.',
                    'Big ideas, small experiments, things you’re proud of.',
                    'A few little details to make this space feel like yours.',
                    staticHosting ? 'Check your details. Create a link. Let people in.' : 'Pick your address. Check the details. Let people in.',
                  ][step]
                }
              </p>
            </div>
            <fieldset disabled={busy || !hydrated}>
              {step === 0 && (
                <>
                  <div className="studio-import">
                    <div className="studio-import-head">
                      <Upload size={18} />
                      <div>
                        <strong>Start from your CV</strong>
                        <small>
                          Upload a PDF, Word file or plain text and we will fill
                          this in for you. It is read on your own device and
                          never uploaded anywhere.
                        </small>
                      </div>
                    </div>
                    <label className="studio-import-drop">
                      <input
                        type="file"
                        accept=".pdf,.docx,.txt,.md,.json,.rtf,application/pdf,text/plain"
                        disabled={importing}
                        onChange={(e) => {
                          void onCvFile(e.target.files?.[0]);
                          e.target.value = '';
                        }}
                      />
                      <span>
                        {importing
                          ? 'Reading your CV…'
                          : 'Choose a file · PDF, DOCX, TXT'}
                      </span>
                    </label>
                    {importSummary && (
                      <div className="studio-import-result">
                        {importSummary.filled.length > 0 && (
                          <p>
                            <Check size={14} /> Filled in{' '}
                            {importSummary.filled.join(', ')}. Check it over
                            below — nothing is published yet.
                          </p>
                        )}
                        {importSummary.notes.map((note) => (
                          <p key={note} className="studio-import-note">
                            {note}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  <TextField
                    label="Your name *"
                    value={profile.name}
                    onChange={(v) => field('name', v)}
                    max={80}
                    placeholder="What should we call you?"
                  />
                  <TextField
                    label="What do you do? *"
                    value={profile.headline}
                    onChange={(v) => field('headline', v)}
                    placeholder="Designer, developer, curious human…"
                  />
                  <TextField
                    label="Location"
                    value={profile.location}
                    onChange={(v) => field('location', v)}
                    max={100}
                    placeholder="A town or country, not your home address"
                  />
                  <TextField
                    label="A bit about you"
                    value={profile.bio}
                    onChange={(v) => field('bio', v)}
                    max={3000}
                    multiline
                    placeholder="The things you enjoy, what you’re good at, what you’d love to do next."
                  />
                  <TextField
                    label="Contact or social link"
                    value={profile.contactUrl}
                    onChange={(v) => field('contactUrl', v)}
                    max={500}
                    placeholder="https://www.linkedin.com/in/your-name"
                  />
                  <TextField
                    label="Skills · separated by commas"
                    value={profile.skills}
                    onChange={(v) => field('skills', v)}
                    max={1000}
                    placeholder="Problem solving, design, Linux, making tea"
                  />
                </>
              )}
              {(step === 1 || step === 2) &&
                (() => {
                  const kind = step === 1 ? 'experience' : 'projects';
                  return (
                    <>
                      {!profile[kind].length && (
                        <div className="studio-empty">
                          <span>{step === 1 ? '↗' : '✧'}</span>
                          <h3>A shelf waiting for your story.</h3>
                          <p>
                            {step === 1
                              ? 'Add a job, education or volunteering. Put your most recent one first.'
                              : 'Add something you made. A link is optional.'}
                          </p>
                        </div>
                      )}
                      {profile[kind].map((entry, i) => (
                        <div className="studio-entry" key={i}>
                          <div className="studio-entry-heading">
                            <strong>
                              {step === 1 ? 'Experience' : 'Project'} {i + 1}
                            </strong>
                            <button
                              className="studio-icon"
                              aria-label={`Remove ${kind} ${i + 1}`}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    'Remove this entry from your draft?',
                                  )
                                )
                                  field(
                                    kind,
                                    profile[kind].filter((_, j) => j !== i),
                                  );
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <TextField
                            label={
                              step === 1
                                ? 'Role or qualification *'
                                : 'Project name *'
                            }
                            value={entry.title}
                            onChange={(v) => item(kind, i, 'title', v)}
                            max={100}
                          />
                          <TextField
                            label={
                              step === 1
                                ? 'Organisation · dates'
                                : 'A short subtitle'
                            }
                            value={entry.subtitle}
                            onChange={(v) => item(kind, i, 'subtitle', v)}
                          />
                          <TextField
                            label="Tell the story"
                            value={entry.description}
                            onChange={(v) => item(kind, i, 'description', v)}
                            max={1800}
                            multiline
                          />
                          <TextField
                            label="Link (optional)"
                            value={entry.url}
                            onChange={(v) => item(kind, i, 'url', v)}
                            max={500}
                            placeholder="https://…"
                          />
                        </div>
                      ))}
                      <button
                        className="studio-button secondary full"
                        disabled={profile[kind].length >= 12}
                        onClick={() =>
                          field(kind, [
                            ...profile[kind],
                            {
                              title: '',
                              subtitle: '',
                              description: '',
                              url: '',
                            },
                          ])
                        }
                      >
                        <Plus size={17} /> Add{' '}
                        {step === 1 ? 'experience' : 'a project'}
                      </button>
                      <p className="studio-muted">
                        Up to 12 entries. Only include details you’re happy to
                        share.
                      </p>
                    </>
                  );
                })()}
              {step === 3 && (
                <>
                  <details className="studio-group" open>
                    <summary>
                      <span>The room</span>
                      <small>Kind of space, palette and time of day</small>
                    </summary>
                    <div className="studio-group-body">
                      <h3 className="studio-sub">
                        Pick a look
                        <em>sets the colours and the light in one go</em>
                      </h3>
                      <div className="studio-themes">
                        {themes.map((t) => (
                          <button
                            type="button"
                            key={t.id}
                            className="studio-theme"
                            onClick={() => applyTheme(t.id)}
                            title={`Apply the ${t.label} palette`}
                          >
                            <span className="studio-theme-swatch">
                              {[t.wall, t.floor, t.beanbag, t.desk].map((c) => (
                                <i key={c} style={{ background: c }} />
                              ))}
                            </span>
                            {t.label}
                          </button>
                        ))}
                      </div>
                      <h3 className="studio-sub">Kind of room</h3>
                      <div className="studio-choice">
                        {shellKinds.map((kind) => (
                          <button
                            type="button"
                            key={kind}
                            className={
                              (profile.room?.shell ?? 'attic') === kind
                                ? 'is-on'
                                : ''
                            }
                            onClick={() =>
                              roomField('shell', kind as ShellKind)
                            }
                          >
                            <span aria-hidden="true">
                              {
                                {
                                  attic: '🏠',
                                  loft: '🏙️',
                                  cabin: '🌲',
                                  studio: '🖼️',
                                }[kind]
                              }
                            </span>
                            {
                              {
                                attic: 'Attic',
                                loft: 'Loft',
                                cabin: 'Cabin',
                                studio: 'Studio',
                              }[kind]
                            }
                          </button>
                        ))}
                      </div>
                      <h3 className="studio-sub">Time of day</h3>
                      <div className="studio-choice">
                        {timesOfDay.map((t) => (
                          <button
                            type="button"
                            key={t}
                            className={
                              (profile.room?.timeOfDay ?? 'day') === t
                                ? 'is-on'
                                : ''
                            }
                            onClick={() => {
                              roomField('timeOfDay', t as TimeOfDay);
                              field('appearance', {
                                ...profile.appearance,
                                night: t === 'night',
                              });
                            }}
                          >
                            <span aria-hidden="true">
                              {{ day: '☀️', golden: '🌇', night: '🌙' }[t]}
                            </span>
                            {
                              {
                                day: 'Daylight',
                                golden: 'Golden hour',
                                night: 'Night',
                              }[t]
                            }
                          </button>
                        ))}
                      </div>
                      <h3 className="studio-sub">Arrangement</h3>
                      <div className="studio-choice">
                        {layoutKinds.map((kind) => (
                          <button
                            type="button"
                            key={kind}
                            className={
                              (profile.room?.layout ?? defaultRoom.layout) ===
                              kind
                                ? 'is-on'
                                : ''
                            }
                            onClick={() =>
                              roomField('layout', kind as LayoutKind)
                            }
                          >
                            {
                              {
                                classic: 'Classic',
                                mirrored: 'Mirrored',
                                cosy: 'Cosy',
                              }[kind]
                            }
                          </button>
                        ))}
                      </div>
                      <h3 className="studio-sub">Room colours</h3>
                      <div className="studio-colors">
                        {(
                          [
                            ['wall', 'Walls'],
                            ['floor', 'Floor'],
                            ['beanbag', 'Beanbag'],
                            ['desk', 'Desk'],
                            ['rug', 'Rug'],
                          ] as const
                        ).map(([key, label]) => (
                          <label key={key} aria-label={`${label} colour`}>
                            <input
                              type="color"
                              value={profile.room?.[key] ?? defaultRoom[key]}
                              onChange={(e) => roomField(key, e.target.value)}
                            />
                            <span>{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </details>
                  <details className="studio-group">
                    <summary>
                      <span>What’s in it</span>
                      <small>
                        Show or hide each corner, and the small extras
                      </small>
                    </summary>
                    <div className="studio-group-body">
                      <h3 className="studio-sub">What to show</h3>
                      <div className="studio-zones">
                        {zoneIds.map((id) => {
                          const chosen =
                            profile.room?.zones ?? defaultRoom.zones;
                          const on = chosen.includes(id);
                          // Some zones stand on another one's furniture.
                          const needs = zoneRequires[id] as ZoneId | undefined;
                          const blocked = needs
                            ? !chosen.includes(needs)
                            : false;
                          const labels = {
                            desk: 'Desk & screens',
                            printer: '3D printer',
                            homelab: 'Homelab',
                            repair: 'Workbench',
                            radio: 'Radio corner',
                            projects: 'Hobby shelf',
                            work: 'Work shelf',
                          } as const;
                          return (
                            <label
                              key={id}
                              className={`studio-zone${blocked ? ' is-blocked' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={on && !blocked}
                                disabled={blocked}
                                onChange={() => toggleZone(id)}
                              />
                              <span>
                                {labels[id]}
                                {needs && (
                                  <small>
                                    {' '}
                                    · {blocked ? 'needs' : 'sits on'} the{' '}
                                    {labels[needs].toLowerCase()}
                                  </small>
                                )}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      <h3 className="studio-sub">Little touches</h3>
                      <label
                        className="studio-check"
                        aria-label="A rug on the floor"
                      >
                        <input
                          type="checkbox"
                          checked={profile.room?.showRug ?? false}
                          onChange={(e) =>
                            roomField('showRug', e.target.checked)
                          }
                        />
                        <span>
                          <strong>A rug on the floor</strong>
                          <small>Warms the middle of the room up.</small>
                        </span>
                      </label>
                      <div className="studio-stepper">
                        <span>Pot plants</span>
                        <div>
                          {[0, 1, 2, 3].map((n) => (
                            <button
                              type="button"
                              key={n}
                              className={
                                (profile.room?.plants ?? 1) === n ? 'is-on' : ''
                              }
                              onClick={() => roomField('plants', n)}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="studio-stepper studio-posters">
                        <span>Posters · pick up to three</span>
                        <div>
                          {(
                            [
                              ['#e8749c', 'Pink'],
                              ['#6f9e77', 'Green'],
                              ['#5fa0b8', 'Blue'],
                              ['#e0a05e', 'Amber'],
                              ['#8d7ce8', 'Violet'],
                              ['#dc6a5a', 'Red'],
                            ] as const
                          ).map(([c, name]) => (
                            <button
                              type="button"
                              key={c}
                              title={`${name} poster`}
                              aria-label={`${name} poster`}
                              aria-pressed={(
                                profile.room?.posters ?? []
                              ).includes(c)}
                              className={
                                (profile.room?.posters ?? []).includes(c)
                                  ? 'is-on'
                                  : ''
                              }
                              style={{ background: c }}
                              onClick={() => togglePoster(c)}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </details>
                  <details className="studio-group">
                    <summary>
                      <span>You</span>
                      <small>Your colours and hair</small>
                    </summary>
                    <div className="studio-group-body">
                      <h3 className="studio-sub">Your colours</h3>
                      <div className="studio-colors">
                        {(['skin', 'hair', 'hoodie', 'accent'] as const).map(
                          (key) => (
                            <label key={key} aria-label={`${key} colour`}>
                              <input
                                type="color"
                                value={profile.appearance[key]}
                                onChange={(e) =>
                                  field('appearance', {
                                    ...profile.appearance,
                                    [key]: e.target.value,
                                  })
                                }
                              />
                              <span>
                                {
                                  {
                                    skin: 'Skin tone',
                                    hair: 'Hair colour',
                                    hoodie: 'Jumper colour',
                                    accent: 'Page accent',
                                  }[key]
                                }
                              </span>
                            </label>
                          ),
                        )}
                      </div>
                      <h3 className="studio-sub">Hair</h3>
                      <div className="studio-choice">
                        {hairStyles.map((style) => (
                          <button
                            type="button"
                            key={style}
                            className={
                              (profile.appearance.hairStyle ?? 'long') === style
                                ? 'is-on'
                                : ''
                            }
                            onClick={() =>
                              field('appearance', {
                                ...profile.appearance,
                                hairStyle: style as HairStyle,
                              })
                            }
                          >
                            {
                              {
                                long: 'Long',
                                bob: 'Bob',
                                short: 'Short',
                                bun: 'Bun',
                                ponytail: 'Ponytail',
                                curly: 'Curly',
                                buzz: 'Buzzed',
                              }[style]
                            }
                          </button>
                        ))}
                      </div>
                    </div>
                  </details>
                  <details className="studio-group">
                    <summary>
                      <span>Your pet</span>
                      <small>Who keeps you company</small>
                    </summary>
                    <div className="studio-group-body">
                      <h3 className="studio-sub">Who lives here</h3>
                      <div className="studio-choice">
                        {petKinds.map((kind) => (
                          <button
                            type="button"
                            key={kind}
                            className={
                              (profile.room?.pet ?? defaultRoom.pet) === kind
                                ? 'is-on'
                                : ''
                            }
                            onClick={() => roomField('pet', kind as PetKind)}
                          >
                            <span aria-hidden="true">
                              {
                                {
                                  quail: '🐦',
                                  cat: '🐈',
                                  dog: '🐕',
                                  rabbit: '🐇',
                                  fox: '🦊',
                                  hamster: '🐹',
                                  none: '∅',
                                }[kind]
                              }
                            </span>
                            {
                              {
                                quail: 'Quail',
                                cat: 'Cat',
                                dog: 'Dog',
                                rabbit: 'Rabbit',
                                fox: 'Fox',
                                hamster: 'Hamster',
                                none: 'No pet',
                              }[kind]
                            }
                          </button>
                        ))}
                      </div>
                      {(profile.room?.pet ?? 'quail') !== 'none' && (
                        <>
                          <TextField
                            label="Pet’s name"
                            value={profile.room?.petName ?? ''}
                            onChange={(v) => roomField('petName', v)}
                            max={24}
                            placeholder="Give them a name"
                          />
                          {(profile.room?.pet ?? 'quail') !== 'quail' && (
                            <div className="studio-colors">
                              <label aria-label="Pet colour">
                                <input
                                  type="color"
                                  value={
                                    profile.room?.petColor ??
                                    defaultRoom.petColor
                                  }
                                  onChange={(e) =>
                                    roomField('petColor', e.target.value)
                                  }
                                />
                                <span>Their colour</span>
                              </label>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </details>
                  <button
                    type="button"
                    className="studio-reset"
                    onClick={() =>
                      field('room', { ...defaultRoom, zones: [...zoneIds] })
                    }
                  >
                    Reset the room to how it started
                  </button>
                  <div className="studio-note">
                    Everything here shows up in the preview straight away. The
                    typing, the pet and the working 3D printer all keep going —
                    click the pet to say hello.
                  </div>
                </>
              )}

              {step === 4 && staticHosting && <ShareRoom profile={profile} />}
              {step === 4 && !staticHosting && (
                <>
                  <div className="studio-note">
                    Everyone gets a path on this host, like{' '}
                    <strong>/alex-smith</strong>. The host chooses the domain;
                    this doesn’t register a separate domain.
                  </div>
                  <TextField
                    label="Your page address *"
                    readOnly={revision > 0}
                    value={slug}
                    onChange={(v) => {
                      if (!revision)
                        setDraft((d) => ({
                          ...d,
                          slug: v.toLowerCase(),
                          editKey: '',
                        }));
                    }}
                    max={40}
                    placeholder="your-name"
                  />
                  <p className="studio-address">{shareUrl}</p>
                  <output className="studio-muted">
                    {revision
                      ? 'This published address is fixed. Your content can be updated any time.'
                      : addressStatus}
                  </output>
                  <ul className="studio-checklist">
                    {readiness.map((c) => (
                      <li key={c.label} className={c.done ? 'is-done' : ''}>
                        {c.done ? <Check size={15} /> : <span aria-hidden />}
                        <span>
                          {c.label}
                          <small>{c.detail}</small>
                        </span>
                        {!c.done && c.step !== undefined && (
                          <button
                            type="button"
                            onClick={() => setStep(c.step as number)}
                          >
                            Fix this
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                  {!revision && (
                    <label className="studio-check">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                      />
                      <span>
                        I’m happy for these details to be public. I won’t
                        include passwords, private addresses or other people’s
                        personal information.
                      </span>
                    </label>
                  )}
                  <button
                    className="studio-button full"
                    disabled={
                      !online ||
                      !ready ||
                      (!revision && (!publishing || !consent))
                    }
                    onClick={publish}
                  >
                    <Save size={17} />
                    {busy
                      ? 'Saving…'
                      : revision
                        ? 'Save changes to live page'
                        : 'Publish my room'}
                  </button>
                  {!publishing && !revision && (
                    <p className="studio-muted">
                      The host has paused new pages.
                    </p>
                  )}
                  {revision > 0 && (
                    <div className="studio-published">
                      <h3>Your door is open.</h3>
                      <a href={`/${slug}`} target="_blank" rel="noreferrer">
                        {shareUrl} ↗
                      </a>
                      <div className="studio-actions">
                        <button
                          className="studio-button secondary"
                          onClick={() => copy(shareUrl)}
                        >
                          <Copy size={16} />
                          Copy link
                        </button>
                        <button
                          className="studio-button secondary"
                          onClick={() => copy(editKey, 'Edit key')}
                        >
                          <Copy size={16} />
                          Copy edit key
                        </button>
                        <button
                          className="studio-button secondary"
                          onClick={() =>
                            download(
                              `${slug}-little-room.txt`,
                              [
                                `Page address: ${shareUrl}`,
                                `Private edit key: ${editKey}`,
                                '',
                                `Open ${origin}/edit and use the key to change or remove this page.`,
                                'Keep the key private — anyone who has it can edit or delete your page.',
                                '',
                              ].join('\n'),
                            )
                          }
                        >
                          <Download size={16} />
                          Save as a file
                        </button>
                      </div>
                      <p className="studio-key">
                        <span>Your page address</span>
                        <code>{shareUrl}</code>
                      </p>
                      <p className="studio-key">
                        <span>Your edit key</span>
                        <code>{editKey}</code>
                      </p>
                      <p>
                        Keep the edit key somewhere safe. It’s the only way to
                        edit or remove your page from another device. Don’t
                        share it with your CV link.
                      </p>
                      <button className="studio-danger" onClick={remove}>
                        Unpublish this page
                      </button>
                    </div>
                  )}
                </>
              )}
            </fieldset>
            {error && (
              <div className="studio-alert error" role="alert">
                {error}
              </div>
            )}
            {message && <output className="studio-alert">{message}</output>}
            <div className="studio-step-actions">
              <button
                className="studio-button secondary"
                disabled={step === 0 || busy}
                onClick={() => go(step - 1)}
              >
                <ArrowLeft size={16} /> Back
              </button>
              {step < 4 && (
                <button
                  className="studio-button"
                  disabled={busy}
                  onClick={() => go(step + 1)}
                >
                  Next <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
          {!staticHosting && (
            <details className="studio-reopen">
              <summary>Already have a room? Open it to edit</summary>
              <TextField
                label="Page name"
                value={openSlug}
                onChange={setOpenSlug}
                max={40}
                placeholder="alex-smith"
              />
              <label className="studio-field">
                <span>Private edit key</span>
                <input
                  type="password"
                  value={openKey}
                  onChange={(e) => setOpenKey(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <button
                className="studio-button secondary"
                onClick={open}
                disabled={busy || !online || !openKey}
              >
                Open my room
              </button>
            </details>
          )}
          <button
            className="studio-start-over"
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  staticHosting
                    ? 'Start a fresh draft? Download a backup first. Shared links will still work, but this browser draft will be replaced.'
                    : 'Start a fresh draft? Save your existing edit key first. Any published page will stay live, but its key will no longer be stored in this editor.',
                )
              ) {
                setDraft(emptyDraft());
                setStep(0);
                setConsent(false);
                setMessage('Fresh canvas. Make it yours.');
                setError('');
              }
            }}
          >
            Start a new draft
          </button>
        </section>
        <aside className="studio-preview" aria-label="Live preview">
          <div className="studio-preview-bar">
            <span>
              <span className="studio-live-dot" /> Live preview
            </span>
            <span>Only published when you say so</span>
          </div>
          <div className="studio-preview-scroll">
            <PersonalPortfolio profile={previewProfile} preview />
          </div>
        </aside>
      </div>
    </main>
  );
}
