'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { sitePath } from '@/lib/site';
import {
  ArrowUp,
  Settings2,
  ArrowUpRight,
  Code2,
  FileText,
  Heart,
  Home,
  Moon,
  Pause,
  Play,
  Printer,
  Sun,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import World, { places, type PlaceId } from './room/world';
import ProjectShelf from './room/shelf';
import type { ZoomCommand } from './room/zoom';
import { PRINT_DURATION, printPose } from './room/print-motion';
import Portfolio from './portfolio';
import {
  projects,
  milestones,
  ongoing,
  workProjects,
  statusLabel,
  type Entry,
} from '@/content';

const roomCopy: Record<
  PlaceId,
  { title: string; intro: string; tags: string[]; ids: string[] }
> = {
  work: {
    title: 'The work shelf.',
    intro: 'Projects, rollouts and ongoing responsibilities.',
    tags: [],
    ids: [],
  },
  desk: {
    title: 'Where the problem solving happens.',
    intro:
      'I help people get back to work, make fiddly jobs simpler and keep our IT running.',
    tags: ['Senior Helpdesk Technician', 'Verisure', 'UK & Ireland'],
    ids: [
      'm-autopilot-rollout',
      'm-playwright',
      'm-card-reader',
      'm-licensing-register',
      'm-ee-migration',
    ],
  },
  printer: {
    title: 'From an idea to something you can hold.',
    intro:
      'My Bambu A1 turns little ideas into real things: radio cases, sliding keyboards and plenty of fun prints.',
    tags: ['Bambu Lab A1 Combo', 'CAD → STL → 3MF', 'PLA & PETG'],
    ids: ['p-heltec-case', 'p-simpsons'],
  },
  homelab: {
    title: 'My own little infrastructure.',
    intro:
      'My Lenovo Tiny, Dell rack server and MacBook. A little playground for Linux, macOS and self-hosted projects.',
    tags: ['Proxmox VE', 'Docker', 'Linux', 'macOS'],
    ids: ['p-homelab', 'p-autopick', 'p-agents', 'p-hermes'],
  },
  repair: {
    title: 'It started with taking things apart.',
    intro:
      'I ran my own repair business: fixing PCs, phones and consoles, looking after customers and keeping the whole thing ticking.',
    tags: ['PCs, phones & consoles', 'Diagnostics & customer care'],
    ids: ['m-blyth-start', 'm-overlap', 'm-png-start', 'm-bureau'],
  },
  radio: {
    title: 'Small devices. Interesting connections.',
    intro:
      'I set up Meshtastic and MeshCore, flash radios and make cases for them. Tiny hardware, lots to explore.',
    tags: ['EU 868 MHz', 'Heltec ESP32-S3', 'Meshtastic', 'MeshCore'],
    ids: ['p-meshtastic', 'p-bobcat', 'p-heltec-case'],
  },
  projects: {
    title: 'The things I make because I’m curious.',
    intro:
      'Games, tools, local applications and experiments. Each project shows what it does, the technology involved and how far it actually got.',
    tags: ['Software', 'Creative tools', 'Always learning'],
    ids: [
      'p-interactive-cv',
      'p-surgewars',
      'p-hermes',
      'p-red-quail-dashboard',
      'p-storysketch',
      'p-pokedex',
      'p-brownie',
      'p-household',
      'p-pantry',
    ],
  },
};

function EntryDetail({ entry }: { entry: Entry }) {
  return (
    <article className="room-entry">
      <div className="room-entry-meta">
        <span>{statusLabel(entry.status)}</span>
      </div>
      <h3>{entry.title}</h3>
      {entry.url && (
        <a href={entry.url} target="_blank" rel="noreferrer">
          Open project ↗
        </a>
      )}
      <p>{entry.description}</p>
      {entry.stack.length > 0 && (
        <div className="room-tags">
          {entry.stack.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
      )}
      {entry.metrics.length > 0 && (
        <div className="room-tags">
          {entry.metrics.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
      )}
    </article>
  );
}

export default function Workshop() {
  const [zoomCommand, setZoomCommand] = useState<ZoomCommand>({
    id: 0,
    direction: 'in',
  });
  const [mounted, setMounted] = useState(false),
    [failed, setFailed] = useState(false),
    [focus, setFocus] = useState<PlaceId | null>(null),
    [hover, setHover] = useState<PlaceId | null>(null),
    [reset, setReset] = useState(0),
    [motion, setMotion] = useState(true),
    [night, setNight] = useState(false),
    [printing, setPrinting] = useState(true),
    [pet, setPet] = useState(false),
    [windowOpen, setWindowOpen] = useState(false),
    [hatchOpen, setHatchOpen] = useState(false),
    [visible, setVisible] = useState(true),
    [ready, setReady] = useState(false),
    [plain, setPlain] = useState(false);
  const [gallery, setGallery] = useState<'work' | 'hobby' | null>(null),
    [shelfPage, setShelfPage] = useState(0),
    [selectedProject, setSelectedProject] = useState<Entry | null>(null),
    [hoveredProject, setHoveredProject] = useState<Entry | null>(null);
  const [printTime, setPrintTime] = useState(0);
  const print = printPose(printTime);
  const printComplete = printTime >= PRINT_DURATION;
  useEffect(() => {
    if (
      printComplete ||
      !printing ||
      !motion ||
      !visible ||
      !ready ||
      gallery ||
      plain ||
      failed
    )
      return;
    const timer = setInterval(
      () => setPrintTime((t) => Math.min(PRINT_DURATION, t + 0.1)),
      100,
    );
    return () => clearInterval(timer);
  }, [printComplete, printing, motion, visible, ready, gallery, plain, failed]);
  const shelfItems = gallery === 'work' ? workProjects : projects;
  const pageItems = shelfItems.slice(shelfPage * 8, shelfPage * 8 + 8);
  const root = useRef<HTMLElement>(null),
    previousGallery = useRef(gallery),
    petTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    // Browser preferences and WebGL are deliberately enabled after SSR hydration.
    // oxlint-disable-next-line react/react-compiler
    setMounted(true);
    setPlain(new URLSearchParams(location.search).get('view') === 'plain');
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    setMotion(!preference.matches);
    const onMotion = () => setMotion(!preference.matches);
    preference.addEventListener('change', onMotion);
    const observer = new IntersectionObserver(
      ([e]) => setVisible(e.isIntersecting),
      { threshold: 0.05 },
    );
    if (root.current) observer.observe(root.current);
    return () => {
      preference.removeEventListener('change', onMotion);
      observer.disconnect();
      if (petTimer.current) clearTimeout(petTimer.current);
    };
  }, []);
  const onReady = useCallback(() => setReady(true), []),
    onFail = useCallback(() => {
      setFailed(true);
      setReady(false);
    }, []);
  useEffect(() => {
    // Keep switching shelves from anchoring the page to a removed button.
    if (previousGallery.current === gallery) return;
    previousGallery.current = gallery;
    const frame = requestAnimationFrame(() => {
      if (root.current && !plain)
        window.scrollTo({ top: root.current.offsetTop, behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, [gallery, plain]);
  const onHatchToggle = useCallback(() => setHatchOpen((v) => !v), []);
  const onWindowToggle = useCallback(() => setWindowOpen((v) => !v), []);
  const onPet = useCallback(() => {
    setPet(true);
    if (petTimer.current) clearTimeout(petTimer.current);
    petTimer.current = setTimeout(() => setPet(false), 2200);
  }, []);
  const select = useCallback((id: PlaceId) => {
    if (id === 'work' || id === 'projects') {
      setGallery(id === 'work' ? 'work' : 'hobby');
      setShelfPage(0);
      setFocus(null);
      setSelectedProject(null);
      setHover(null);
      return;
    }
    setGallery(null);
    setFocus(id);
    setHover(null);
  }, []);
  const back = () => {
    setFocus(null);
    setSelectedProject(null);
    setGallery(null);
    setReset((r) => r + 1);
  };
  const closePanel = () => {
    setFocus(null);
    setSelectedProject(null);
    setReset((r) => r + 1);
  };
  const chosen = focus ? roomCopy[focus] : null;
  const entries = chosen
    ? chosen.ids
        .map((id) =>
          [...projects, ...milestones, ...ongoing].find((p) => p.id === id),
        )
        .filter((e): e is Entry => !!e)
    : [];
  return (
    <div
      className={
        'experience' +
        (night ? ' night' : '') +
        (plain ? ' plain-experience' : '')
      }
    >
      <section
        ref={root}
        id="room"
        className={'workshop' + (gallery ? ' gallery-open' : '')}
        aria-label="Sophie's interactive attic"
      >
        <header className="room-topbar">
          <h1 className="sr-only">Sophie’s interactive attic</h1>
          <a className="room-brand" href="#room">
            <span className="room-mark">
              s<span>w</span>.
            </span>
            <span>Sophie’s attic</span>
          </a>
          <nav aria-label="Portfolio views">
            <a className="room-nav-active" href="#room">
              <Home size={15} /> My room
            </a>
            <a href="#journey">
              <FileText size={15} /> My timeline
            </a>
            <a href="#projects">
              <Code2 size={15} /> All projects
            </a>
            {/* Full navigation opens the self-hosted editor shell. */}
            {/* oxlint-disable-next-line next/no-html-link-for-pages */}
            <a href={sitePath('edit/')}>Make your own ↗</a>
          </nav>
          <button
            className="theme-toggle"
            onClick={() => setNight((v) => !v)}
            aria-label={night ? 'Use light mode' : 'Use dark mode'}
            aria-pressed={night}
          >
            {night ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <a className="room-contact" href="https://github.com/Sophie97x">
            Say hello <ArrowUpRight size={15} />
          </a>
        </header>
        {gallery && (
          <div className="shelf-intro">
            <button onClick={back}>
              <Home size={14} /> Back to my room
            </button>
            <p className="room-eyebrow">
              {gallery === 'work'
                ? 'THE DAY JOB'
                : 'EVENINGS, WEEKENDS & WHAT-IFS'}
            </p>
            <h1>
              {gallery === 'work' ? 'The work shelf.' : 'The hobby shelf.'}
            </h1>
            <p>Pick up a little project to find out more.</p>
            <div className="shelf-tabs">
              <button
                aria-pressed={gallery === 'work'}
                onClick={() => {
                  setGallery('work');
                  setShelfPage(0);
                }}
              >
                Work · {workProjects.length}
              </button>
              <button
                aria-pressed={gallery === 'hobby'}
                onClick={() => {
                  setGallery('hobby');
                  setShelfPage(0);
                }}
              >
                Hobbies · {projects.length}
              </button>
            </div>
          </div>
        )}
        <div
          className="world-shell"
          style={{ cursor: hover ? 'pointer' : 'grab' }}
          aria-label="Interactive 3D room. Drag to rotate; right-drag or Shift-drag to move. Scroll to zoom; use two fingers to move and pinch on touchscreens."
        >
          {mounted && !failed && !plain && !gallery && (
            <World
              zoomCommand={zoomCommand}
              focus={focus}
              reset={reset}
              motion={motion && visible}
              night={night}
              printing={printing}
              printTime={printTime}
              onSelect={select}
              onHover={setHover}
              onPet={onPet}
              loved={pet}
              hatchOpen={hatchOpen}
              onHatchToggle={onHatchToggle}
              windowOpen={windowOpen}
              onWindowToggle={onWindowToggle}
              onReady={onReady}
              onFail={onFail}
            />
          )}
          {mounted && !failed && !plain && gallery && (
            <ProjectShelf
              zoomCommand={zoomCommand}
              entries={pageItems}
              hobby={gallery === 'hobby'}
              motion={motion && visible}
              onSelect={setSelectedProject}
              onHover={setHoveredProject}
              onFail={onFail}
            />
          )}
          {(failed || (!ready && !gallery)) && (
            <div className="room-loading">
              {failed
                ? 'The 3D room is unavailable here. All the projects and CV are below.'
                : 'Putting the kettle on…'}
              {failed && <a href="#journey">Read my CV ↓</a>}
            </div>
          )}
        </div>
        {gallery && (
          <aside className="shelf-index" aria-label="Projects on this shelf">
            <p className="room-eyebrow">ON THIS SHELF</p>
            {pageItems.map((p, i) => (
              <button key={p.id} onClick={() => setSelectedProject(p)}>
                <span>{String(i + 1).padStart(2, '0')}</span>
                {p.title}
                <ArrowUpRight size={13} />
              </button>
            ))}
          </aside>
        )}
        {gallery && (
          <div className="shelf-pagination">
            <button
              disabled={shelfPage === 0}
              onClick={() => {
                setShelfPage((p) => p - 1);
                setHoveredProject(null);
              }}
            >
              ← Previous
            </button>
            <span>
              {shelfPage * 8 + 1}–
              {Math.min(shelfPage * 8 + 8, shelfItems.length)} of{' '}
              {shelfItems.length}
            </span>
            <button
              disabled={(shelfPage + 1) * 8 >= shelfItems.length}
              onClick={() => {
                setShelfPage((p) => p + 1);
                setHoveredProject(null);
              }}
            >
              Next →
            </button>
          </div>
        )}
        {gallery && hoveredProject && (
          <div className="room-hover">
            <strong>{hoveredProject.title}</strong>
            <span>{statusLabel(hoveredProject.status)}</span>
          </div>
        )}
        <details className="room-menu">
          <summary aria-label="Explore and settings">
            <Settings2 size={18} />
          </summary>
          <div className="room-menu-content">
            {places.map((p) => (
              <button key={p.id} onClick={() => select(p.id)}>
                {p.label}
              </button>
            ))}
            <hr />
            <button onClick={onHatchToggle} aria-pressed={hatchOpen}>
              {hatchOpen ? 'Close attic hatch' : 'Open attic hatch'}
            </button>
            <button onClick={onWindowToggle} aria-pressed={windowOpen}>
              {windowOpen ? 'Close window' : 'Open window'}
            </button>
            <button
              onClick={() =>
                setZoomCommand((c) => ({ id: c.id + 1, direction: 'in' }))
              }
            >
              <ZoomIn size={16} /> Zoom in
            </button>
            <button
              onClick={() =>
                setZoomCommand((c) => ({ id: c.id + 1, direction: 'out' }))
              }
            >
              <ZoomOut size={16} /> Zoom out
            </button>
            <button onClick={() => setMotion((v) => !v)}>
              {motion ? <Pause size={16} /> : <Play size={16} />}{' '}
              {motion ? 'Pause motion' : 'Resume motion'}
            </button>
            <button onClick={back}>Reset view</button>
          </div>
        </details>
        {hover && (
          <div className="room-hover">
            <strong>{places.find((p) => p.id === hover)?.label}</strong>
            <span>{places.find((p) => p.id === hover)?.hint}</span>
          </div>
        )}
        {pet && (
          <output className="pet-message">
            <Heart size={18} fill="currentColor" /> A little love for the quail.{' '}
            <span>+1 morale</span>
          </output>
        )}
        <div className="room-hint">
          <span className="hint-dot" /> Drag to turn · Shift-drag / two fingers
          to move · Scroll / pinch to zoom
        </div>
      </section>
      <div className="reading-banner">
        <a href="#room">
          <Home size={16} /> Back to my room
        </a>
        <span>The full story, in order.</span>
        <button onClick={() => window.print()}>
          <Printer size={16} /> Print / save PDF
        </button>
      </div>
      <button
        className="back-to-attic"
        aria-label="Back to the attic at the top"
        onClick={() => {
          back();
          setPlain(false);
          window.scrollTo({ top: 0, behavior: motion ? 'smooth' : 'instant' });
        }}
      >
        <ArrowUp size={20} />
      </button>
      <div className="reading-area">
        <Portfolio />
      </div>
      <Sheet
        open={!!focus || !!selectedProject}
        onOpenChange={(open) => {
          if (!open) closePanel();
        }}
      >
        <SheetContent
          className={'room-panel' + (night ? ' panel-night' : '')}
          showCloseButton={false}
        >
          <div className="room-panel-top">
            <span>
              {selectedProject
                ? 'From the ' + gallery + ' shelf'
                : focus && places.find((p) => p.id === focus)?.label}
            </span>
            <button onClick={closePanel} aria-label="Close room details">
              <X size={20} />
            </button>
          </div>
          <SheetTitle className="room-panel-title">
            {selectedProject?.title ?? chosen?.title}
          </SheetTitle>
          <SheetDescription className="room-panel-description">
            {selectedProject?.description ?? chosen?.intro}
          </SheetDescription>
          <div className="room-tags">
            {chosen?.tags.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
          {focus === 'printer' && (
            <div className="print-control">
              <div>
                <strong>
                  {print.phase === 'Complete'
                    ? 'Your little bunny is ready!'
                    : `${!printing || !motion ? 'Printer paused' : print.phase} · ${Math.round(print.progress * 100)}%`}
                </strong>
                <span>
                  Bambu Lab A1 Combo · {PRINT_DURATION}-second bunny print
                </span>
              </div>
              <button
                onClick={() => {
                  if (printTime >= PRINT_DURATION) {
                    setPrintTime(0);
                    setPrinting(true);
                  } else setPrinting((v) => !v);
                }}
                aria-label={
                  printTime >= PRINT_DURATION
                    ? 'Print another bunny'
                    : printing
                      ? 'Pause printer animation'
                      : 'Start printer animation'
                }
              >
                {printing && printTime < PRINT_DURATION ? (
                  <Pause size={17} />
                ) : (
                  <Play size={17} />
                )}
              </button>
            </div>
          )}
          <div className="room-panel-entries">
            {selectedProject && (
              <div className="project-facts">
                <p>{statusLabel(selectedProject.status)}</p>
                <div className="room-tags">
                  {[...selectedProject.stack, ...selectedProject.metrics].map(
                    (s) => (
                      <span key={s}>{s}</span>
                    ),
                  )}
                </div>
                {selectedProject.url && (
                  <a
                    href={selectedProject.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Visit project <ArrowUpRight size={14} />
                  </a>
                )}
              </div>
            )}
            {entries.map((e) => (
              <EntryDetail key={e.id} entry={e} />
            ))}
          </div>
          <a
            className="room-panel-link"
            href={
              focus === 'desk' || focus === 'repair' ? '#journey' : '#projects'
            }
            onClick={() => {
              setFocus(null);
              setSelectedProject(null);
            }}
          >
            See the full{' '}
            {focus === 'desk' || focus === 'repair'
              ? 'timeline'
              : 'project collection'}{' '}
            <ArrowUpRight size={16} />
          </a>
        </SheetContent>
      </Sheet>
      <noscript>
        <style>
          {
            '.workshop{display:none!important}.reading-area .portfolio{display:block!important}'
          }
        </style>
      </noscript>
    </div>
  );
}
