'use client';
/* oxlint-disable next/no-html-link-for-pages -- Use full navigation to the self-hosted editor. */

import { useEffect, useState, type CSSProperties } from 'react';
import {
  ArrowUpRight,
  Home,
  Moon,
  Pause,
  Play,
  Printer,
  Sun,
} from 'lucide-react';
import World, { type PlaceId } from './room/world';
import { RoomAppearance } from './room/appearance';
import { PRINT_DURATION } from './room/print-motion';
import type { Profile } from '@/lib/profile';
import { sitePath, staticHosting } from '@/lib/site';

export default function PersonalPortfolio({
  profile,
  preview = false,
}: {
  profile: Profile;
  preview?: boolean;
}) {
  const [focus, setFocus] = useState<PlaceId | null>(null);
  const [reset, setReset] = useState(0);
  const [motion, setMotion] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printTime, setPrintTime] = useState(0);
  const [windowOpen, setWindowOpen] = useState(false);
  const [hatchOpen, setHatchOpen] = useState(false);
  const [loved, setLoved] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [nightOverride, setNightOverride] = useState<boolean | null>(null);
  const initialNight = profile.room.timeOfDay === 'night';
  const night = preview ? initialNight : (nightOverride ?? initialNight);
  useEffect(() => {
    if (!loved) return;
    const timer = setTimeout(() => setLoved(false), 2400);
    return () => clearTimeout(timer);
  }, [loved]);
  const completed = printTime >= PRINT_DURATION;
  useEffect(() => {
    // Honour the visitor's motion preference on first load.
    // oxlint-disable-next-line react/react-compiler
    setMotion(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);
  useEffect(() => {
    if (!printing || !motion || completed) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now(),
        delta = Math.min((now - last) / 1000, 0.5);
      last = now;
      setPrintTime((t) => Math.min(PRINT_DURATION, t + delta));
    }, 100);
    return () => window.clearInterval(timer);
  }, [printing, motion, completed]);
  const selectedSection =
    focus === 'desk' || focus === 'work' || focus === 'repair'
      ? 'experience'
      : 'projects';
  function jump(event: React.MouseEvent<HTMLAnchorElement>, id: string) {
    if (!staticHosting || preview) return;
    // Keep the CV snapshot in the URL while moving between sections.
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: motion ? 'smooth' : 'instant' });
  }
  return (
    <article
      className={`personal-page ${preview ? 'is-preview' : ''}`}
      style={{ '--profile-accent': profile.appearance.accent } as CSSProperties}
    >
      <header className="personal-intro">
        <span className="studio-eyebrow">A little room. My whole story.</span>
        <h1>
          {profile.name || 'Your name here'}
          <span>.</span>
        </h1>
        <p>{profile.headline || 'What you do, in a few words.'}</p>
        {profile.location && <small>{profile.location}</small>}
        {profile.contactUrl && (
          <a
            className="studio-button secondary"
            href={profile.contactUrl}
            target="_blank"
            rel="noreferrer"
          >
            Get in touch <ArrowUpRight size={16} />
          </a>
        )}
      </header>
      <div className={`personal-room ${night ? 'at-night' : ''}`}>
        {!failed && (
          <RoomAppearance.Provider
            value={{
              ...profile.appearance,
              name: profile.name,
              personalized: true,
            }}
          >
            <World
              room={{
                ...profile.room,
                timeOfDay: night
                  ? 'night'
                  : profile.room.timeOfDay === 'night'
                    ? 'day'
                    : profile.room.timeOfDay,
              }}
              focus={focus}
              reset={reset}
              motion={motion}
              night={night}
              printing={printing && !completed}
              printTime={printTime}
              onSelect={setFocus}
              onHover={() => {}}
              onPet={() => setLoved(true)}
              loved={loved}
              windowOpen={windowOpen}
              onWindowToggle={() => setWindowOpen((v) => !v)}
              hatchOpen={hatchOpen}
              onHatchToggle={() => setHatchOpen((v) => !v)}
              onReady={() => setReady(true)}
              onFail={() => setFailed(true)}
              zoomCommand={{ id: 0, direction: 'in' }}
            />
          </RoomAppearance.Provider>
        )}
        {(!ready || failed) && (
          <p className="personal-room-status">
            {failed
              ? 'The 3D room is unavailable here. Everything is still readable below.'
              : 'Opening your little room…'}
          </p>
        )}
        <div className="personal-room-controls">
          <button
            aria-label="Reset room view"
            onClick={() => {
              setFocus(null);
              setReset((v) => v + 1);
            }}
          >
            <Home size={17} />
          </button>
          <button
            aria-label={motion ? 'Pause room motion' : 'Resume room motion'}
            onClick={() => setMotion((v) => !v)}
          >
            {motion ? <Pause size={17} /> : <Play size={17} />}
          </button>
          <button
            hidden={preview}
            aria-label={night ? 'Switch to day' : 'Switch to night'}
            onClick={() => setNightOverride(!night)}
          >
            {night ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button
            hidden={
              !profile.room.zones.includes('printer') ||
              !profile.room.zones.includes('repair')
            }
            onClick={() => {
              if (completed) {
                setPrintTime(0);
                setPrinting(true);
              } else setPrinting((v) => !v);
              setMotion(true);
              setFocus('printer');
            }}
          >
            <Printer size={17} />{' '}
            {completed
              ? 'Print again'
              : printing
                ? `${Math.floor((printTime / PRINT_DURATION) * 100)}% · Pause print`
                : printTime
                  ? 'Resume print'
                  : 'Print a bunny'}
          </button>
        </div>
      </div>
      <p className="personal-room-hint">
        Drag to look around · Scroll to zoom · Tap an object to explore
      </p>
      {focus && (
        <div className="personal-focus">
          <a href={`#${selectedSection}`} onClick={e => jump(e, selectedSection)}>Explore my {selectedSection} ↓</a>
        </div>
      )}
      <nav className="personal-section-nav" aria-label="CV sections">
        <a href="#about" onClick={e => jump(e, 'about')}>About</a>
        <a href="#experience" onClick={e => jump(e, 'experience')}>Experience</a>
        <a href="#projects" onClick={e => jump(e, 'projects')}>Projects</a>
      </nav>
      <div className="personal-content">
        <section id="about">
          <span className="studio-eyebrow">Hello there</span>
          <h2>A bit about me.</h2>
          <p className="preserve-lines">
            {profile.bio ||
              (preview
                ? 'Your introduction will appear here. Tell people what you care about and what you enjoy making.'
                : 'Thanks for stopping by my room.')}
          </p>
          {profile.skills && (
            <div className="personal-skills">
              {profile.skills
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
                .map((s, i) => (
                  <span key={i}>{s}</span>
                ))}
            </div>
          )}
        </section>
        {(['experience', 'projects'] as const).map((kind) => (
          <section
            id={kind}
            key={kind}
            className={focus && selectedSection === kind ? 'is-selected' : ''}
          >
            <span className="studio-eyebrow">
              {kind === 'experience'
                ? 'The journey so far'
                : 'Made with curiosity'}
            </span>
            <h2>
              {kind === 'experience' ? 'Where I’ve been.' : 'Things I’ve made.'}
            </h2>
            {profile[kind].length ? (
              profile[kind].map((item, i) => (
                <article className="personal-card" key={i}>
                  <h3>{item.title}</h3>
                  <small>{item.subtitle}</small>
                  <p className="preserve-lines">{item.description}</p>
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noreferrer">
                      Take a look ↗
                    </a>
                  )}
                </article>
              ))
            ) : (
              <p className="studio-muted">
                {preview
                  ? `Add your ${kind} in the editor to fill this shelf.`
                  : 'More to come.'}
              </p>
            )}
          </section>
        ))}
      </div>
      {!preview && (
        <footer className="personal-footer">
          <a href={sitePath('edit/')}>Make your own little room ↗</a>
          <button onClick={() => window.print()}>Print / save as PDF</button>
        </footer>
      )}
    </article>
  );
}
