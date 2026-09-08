'use client';
/* oxlint-disable next/no-html-link-for-pages -- Use full navigation to the self-hosted editor. */
import { useEffect, useState } from 'react';
import PersonalPortfolio from './personal-portfolio';
import { validateProfile, type Profile } from '@/lib/profile';
export default function PublishedPortfolio() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    const slug = window.location.pathname.split('/').filter(Boolean)[0];
    fetch(`/api/portfolios/${encodeURIComponent(slug)}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load this page.');
        const clean = validateProfile(data.profile);
        document.title = `${clean.name} — My little room`;
        setProfile(clean);
      })
      .catch((e: Error) => {
        if (e.name !== 'AbortError') setError(e.message);
      });
    return () => controller.abort();
  }, []);
  if (!profile)
    return (
      <main className="studio-loading">
        <h1>{error ? 'Room unavailable' : 'Come on in…'}</h1>
        <output>
          {error || 'Loading this little corner of the internet.'}
        </output>
        <a href="/edit">Make your own room ↗</a>
      </main>
    );
  return <PersonalPortfolio profile={profile} />;
}
