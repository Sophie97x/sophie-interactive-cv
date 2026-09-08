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
} from 'lucide-react';
import PersonalPortfolio from './personal-portfolio';
import {
  defaultProfile,
  suggestedSlug,
  validSlug,
  validateProfile,
  type Profile,
  type ProfileItem,
} from '@/lib/profile';

type Draft = {
  profile: Profile;
  slug: string;
  editKey: string;
  revision: number;
};
const storageKey = 'attic-studio-v1';
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
  const data = await response.json();
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
        download(
          `${slug}-edit-key.txt`,
          `Page: ${origin}/${slug}\nPrivate edit key: ${key}\nKeep this private. Open ${origin}/edit to edit or remove your page.\n`,
        );
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
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage('Link copied.');
    } catch {
      setError('Copy is unavailable here. Select and copy the link instead.');
    }
  }
  const shareUrl = `${origin}/${slug || 'your-name'}`;
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
        <a className="studio-brand" href="/">
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
          <div className="studio-welcome">
            <span className="studio-eyebrow">Your story, your space</span>
            <h1>
              Make yourself
              <br />
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
                    'Pick your address. Check the details. Let people in.',
                  ][step]
                }
              </p>
            </div>
            <fieldset disabled={busy || !hydrated}>
              {step === 0 && (
                <>
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
                  <label className="studio-check" aria-label="A cosy evening">
                    <input
                      type="checkbox"
                      checked={profile.appearance.night}
                      onChange={(e) =>
                        field('appearance', {
                          ...profile.appearance,
                          night: e.target.checked,
                        })
                      }
                    />
                    <span>
                      <strong>A cosy evening</strong>
                      <small>Start your room in night mode.</small>
                    </span>
                  </label>
                  <div className="studio-note">
                    Your room keeps the typing, curious quail and working 3D
                    printer. Try them in the preview.
                  </div>
                </>
              )}
              {step === 4 && (
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
                  <div className="studio-publish-summary">
                    <Check size={18} />
                    <span>
                      {profile.name || 'Name needed'}
                      <small>
                        {profile.experience.length} experiences ·{' '}
                        {profile.projects.length} projects
                      </small>
                    </span>
                  </div>
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
                      !online || (!revision && (!publishing || !consent))
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
                          onClick={() =>
                            download(
                              `${slug}-edit-key.txt`,
                              `Page: ${shareUrl}\nPrivate edit key: ${editKey}\nOpen ${origin}/edit to edit or remove your page.\nKeep this key private. Anyone with it can change or remove this page.\n`,
                            )
                          }
                        >
                          <Download size={16} />
                          Save edit key
                        </button>
                      </div>
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
          <button
            className="studio-start-over"
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  'Start a fresh draft? Save your existing edit key first. Any published page will stay live, but its key will no longer be stored in this editor.',
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
