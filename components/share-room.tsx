'use client';
/* oxlint-disable next/no-html-link-for-pages -- Static pages use full navigation. */
import { useState } from 'react';
import { encodeRoom } from '@/lib/share';
import { sitePath } from '@/lib/site';
import { validateProfile, type Profile } from '@/lib/profile';

export default function ShareRoom({ profile }: { profile: Profile }) {
  const [consent, setConsent] = useState(false);
  const [link, setLink] = useState('');
  const [snapshot, setSnapshot] = useState('');
  const [message, setMessage] = useState('');
  const changed = !!link && snapshot !== JSON.stringify(profile);
  function create() {
    try {
      const encoded = encodeRoom(profile);
      setLink(`${window.location.origin}${sitePath('view/')}#${encoded}`);
      setSnapshot(JSON.stringify(profile));
      setMessage(
        'Your link is ready. Copy the whole link, including everything after #.',
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Could not create a link.',
      );
    }
  }
  function backup() {
    const clean = validateProfile(profile, true);
    const url = URL.createObjectURL(
      new Blob([JSON.stringify({ profile: clean }, null, 2)], {
        type: 'application/json',
      }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-little-room.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="studio-share">
      <h3>A little room you can send anyone.</h3>
      <p className="studio-note">
        Free, with no account. Your CV and room are packed into the link. Anyone
        with it can read or copy them. Links are snapshots: you cannot recall an
        old link, and changes need a new one.
      </p>
      <label className="studio-check">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>
          I’m happy to share these details. There are no passwords, private
          addresses or other people’s personal information.
        </span>
      </label>
      <button
        className="studio-button full"
        disabled={!consent}
        onClick={create}
      >
        {link ? 'Create updated link' : 'Create share link'}
      </button>
      {link && (
        <div className="studio-published">
          {changed && (
            <output>
              You have changes. Create an updated link before sharing.
            </output>
          )}
          <label className="studio-field">
            <span>Your share link</span>
            <textarea
              readOnly
              rows={3}
              value={link}
              onFocus={(e) => e.target.select()}
            />
          </label>
          <div className="studio-actions">
            <button
              className="studio-button secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setMessage('Link copied.');
                } catch {
                  setMessage('Select the link above and copy it by hand.');
                }
              }}
            >
              Copy link
            </button>
            <a
              className="studio-button secondary"
              href={link}
              target="_blank"
              rel="noreferrer"
            >
              Open your room ↗
            </a>
          </div>
        </div>
      )}
      <button className="studio-button secondary" onClick={backup}>
        Download a backup
      </button>
      <p className="studio-muted">
        Keep a backup to edit on another device. Import it in “About you”. Your
        draft stays in this browser; GitHub does not save your CV. This version
        does not reserve names or register domains.
      </p>
      {message && <output className="studio-alert">{message}</output>}
    </section>
  );
}
