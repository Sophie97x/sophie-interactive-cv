'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import {
  ArrowUpRight,
  ArrowDown,
  MapPin,
  Printer,
  Layers3,
  Code2,
  Plus,
} from 'lucide-react';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  milestones,
  ongoing,
  projects,
  skills,
  employers,
  years,
  yearTitles,
  categories,
  statusLabel,
  type Entry,
} from '@/content';

export default function Portfolio() {
  const [plain, setPlain] = useState(false);
  const [activeYear, setActiveYear] = useState(2026);
  const [selected, setSelected] = useState<Entry | null>(null);
  useEffect(() => {
    // URL preferences are browser-only; keep the initial SSR render stable.
    // oxlint-disable-next-line react/react-compiler
    setPlain(new URLSearchParams(location.search).get('view') === 'plain');
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.find((e) => e.isIntersecting);
        if (entry) setActiveYear(Number(entry.target.id.slice(1)));
      },
      { rootMargin: '-15% 0px -65% 0px' },
    );
    document
      .querySelectorAll('.year-section')
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  const togglePlain = (checked: boolean) => {
    setPlain(!checked);
    const u = new URL(location.href);
    if (checked) u.searchParams.delete('view');
    else u.searchParams.set('view', 'plain');
    history.replaceState(null, '', u);
  };
  return (
    <div className={plain ? 'portfolio plain' : 'portfolio'}>
      <noscript>
        <style>
          {
            '.compact-milestone [data-slot="accordion-content"]{display:block!important;height:auto!important;content-visibility:visible!important}.milestone-body{height:auto!important}.milestone-plus{display:none}'
          }
        </style>
      </noscript>
      <a className="skip-link" href="#journey">
        Skip to career timeline
      </a>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Sophie Wilson, home">
          <span className="monogram">
            sw<span>.</span>
          </span>
          <span>
            SOPHIE WILSON
            <span className="brand-sub">INTERACTIVE CV / 2026</span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#journey">The journey</a>
          <a href="#projects">The projects</a>
          <a href="#skills">The skills</a>
        </nav>
        <a className="contact-link" href="https://github.com/Sophie97x">
          Say hello <ArrowUpRight size={16} />
        </a>
      </header>
      <main id="top">
        <div className="cv-heading section-wrap">
          <p className="eyebrow">SOPHIE WILSON · THE FULL STORY</p>
          <h2>
            Senior Helpdesk Technician.
            <br />
            <span>Hands-on builder.</span>
          </h2>
          <p>Hebburn, UK</p>
        </div>
        <section className="hero" aria-labelledby="intro-title">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="live-dot" /> IT PROFESSIONAL. CURIOUS BY DEFAULT.
            </p>
            <h1 id="intro-title">
              Sophie
              <br />
              Wilson<span className="lime">.</span>
            </h1>
            <p className="hero-title">
              I figure things out.
              <br />
              <span>Then I make them work.</span>
            </p>
            <p className="hero-intro">
              Senior helpdesk technician, problem solver and hands-on builder.
              From repairing computers to connecting an entire business — and
              building what comes next.
            </p>
            <div className="hero-actions">
              <a className="button-primary" href="#journey">
                Explore my journey <ArrowDown size={17} />
              </a>
              <a className="button-text" href="#projects">
                What I build <ArrowUpRight size={17} />
              </a>
            </div>
            <p className="location">
              <MapPin size={14} /> Hebburn, South Tyneside · UK
            </p>
          </div>
          <div className="hero-visual">
            <div className="visual-heading">
              <span>EVERY CHAPTER CONNECTS</span>
              <span>2015 — 2026</span>
            </div>
            <div className="orbit-placeholder">
              <span className="orbit-caption">A career in motion</span>
              <div className="career-nodes">
                {employers.map((e, i) => (
                  <a
                    key={e.id}
                    className={'node-label node-' + i}
                    href={'#y' + e.from.slice(0, 4)}
                  >
                    <span style={{ color: e.color }}>{e.from.slice(0, 4)}</span>
                    {e.name}
                    <ArrowUpRight size={14} />
                  </a>
                ))}
              </div>
            </div>
            <div className="visual-footer">
              <span>
                <Layers3 size={14} /> EXPLORE THE CONNECTIONS
              </span>
              <label className="mode-control">
                3D view{' '}
                <Switch
                  checked={!plain}
                  onCheckedChange={togglePlain}
                  aria-label="3D view"
                />
              </label>
            </div>
          </div>
          <div className="hero-bottom">
            <span>01 / A LITTLE CONTEXT</span>
            <p>
              Support. Build. Automate. <span>Keep learning.</span>
            </p>
            <a href="#journey" aria-label="Scroll to timeline">
              <ArrowDown size={18} />
            </a>
          </div>
        </section>
        <section className="context-strip" aria-label="Career at a glance">
          <div>
            <strong>4</strong>
            <span>career chapters</span>
          </div>
          <div>
            <strong>2</strong>
            <span>promotions at Verisure</span>
          </div>
          <div>
            <strong>60</strong>
            <span>career highlights</span>
          </div>
          <div>
            <strong>UK + IE</strong>
            <span>business support</span>
          </div>
        </section>
        <section id="journey" className="journey section-wrap">
          <div className="section-heading">
            <div>
              <p className="eyebrow">01 / THE JOURNEY</p>
              <h2>
                Experience,
                <br />
                <span>built over time.</span>
              </h2>
            </div>
            <p>
              Every role added something. Follow the years to see how repairs
              became support, and support became systems, projects and
              automation.
            </p>
          </div>
          <nav className="year-nav" aria-label="Jump to year">
            {years.map((y) => (
              <a
                key={y}
                href={'#y' + y}
                className={activeYear === y ? 'active' : ''}
                onClick={() => setActiveYear(y)}
              >
                {y}
                <span />
              </a>
            ))}
          </nav>
          <div className="career-overview">
            {employers.map((e) => (
              <a
                href={'#y' + e.from.slice(0, 4)}
                key={e.id}
                style={{ '--item-color': e.color } as CSSProperties}
              >
                <span className="timeline-dot" />
                <span className="small-date">
                  {e.from.slice(0, 4)} –{' '}
                  {e.to.slice(0, 4) === 'Pres' ? 'Present' : e.to.slice(0, 4)}
                </span>
                <h3>{e.name}</h3>
                <p>{e.role}</p>
              </a>
            ))}
          </div>
          <div className="years-content">
            {years.map((y) => (
              <section id={'y' + y} key={y} className="year-section">
                <div className="year-aside">
                  <span className="year-number">{y}</span>
                  <h3>{yearTitles[y]}</h3>
                  <span className="year-count">
                    {milestones.filter((m) => m.year === y).length} career
                    milestones
                  </span>
                </div>
                <Accordion
                  className="milestone-list"
                  multiple
                  defaultValue={[]}
                  keepMounted
                >
                  {milestones
                    .filter((m) => m.year === y)
                    .map((m) => (
                      <AccordionItem
                        className="milestone-card compact-milestone"
                        key={m.id}
                        id={m.id}
                        value={m.id}
                      >
                        <AccordionTrigger className="milestone-toggle">
                          <span>{m.title}</span>
                          <Plus className="milestone-plus" size={18} />
                        </AccordionTrigger>
                        <AccordionContent className="milestone-body">
                          <div className="card-meta">
                            <span
                              style={{ color: categories[m.category]?.color }}
                            >
                              {categories[m.category]?.label}
                            </span>
                          </div>
                          <p>{m.description}</p>
                          {m.metrics.length > 0 && (
                            <div className="metrics">
                              {m.metrics.map((x) => (
                                <span key={x}>{x}</span>
                              ))}
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  {!milestones.some((m) => m.year === y) && (
                    <AccordionItem
                      className="milestone-card compact-milestone quiet-card"
                      value={`quiet-${y}`}
                    >
                      <AccordionTrigger className="milestone-toggle">
                        <span>
                          {y === 2017 ? 'Procter & Gamble' : 'Blyth Repair'}
                        </span>
                        <Plus className="milestone-plus" size={18} />
                      </AccordionTrigger>
                      <AccordionContent className="milestone-body">
                        <p className="eyebrow">CONTINUING THE CHAPTER</p>
                        <p>
                          {y === 2017
                            ? employers[0].detail
                            : employers[1].detail}
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              </section>
            ))}
          </div>
        </section>
        <section
          id="responsibilities"
          className="section-wrap responsibilities"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">BETWEEN THE MILESTONES</p>
              <h2>
                The everyday
                <br />
                <span>problem solving.</span>
              </h2>
            </div>
            <p>
              The fixes, improvements and everyday jobs that keep things moving.
            </p>
          </div>
          <div className="skill-grid">
            {ongoing.map((p) => (
              <article key={p.id} id={p.id}>
                <p className="eyebrow">
                  {categories[p.category]?.label} · {statusLabel(p.status)}
                </p>
                <h3>{p.title}</h3>
                <p>{p.description}</p>
                <div className="tags">
                  {p.stack.map((s) => (
                    <span key={s}>{s}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
        <section id="projects" className="projects section-wrap">
          <div className="section-heading">
            <div>
              <p className="eyebrow">02 / OUTSIDE THE DAY JOB</p>
              <h2>
                Curiosity,
                <br />
                <span>put to work.</span>
              </h2>
            </div>
            <p>
              I build things to understand them. Software, self-hosted systems,
              radio hardware and the small tools that make life easier.
            </p>
          </div>
          <div className="project-grid">
            {projects.map((p, i) => (
              <button
                className="project-card"
                id={p.id}
                key={p.id}
                onClick={() => setSelected(p)}
              >
                <div className={'project-art art-' + (i % 4)}>
                  <Code2 size={42} strokeWidth={1} />
                  <span className="project-index">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <div className="project-info">
                  <div className="card-meta">
                    <span>{statusLabel(p.status)}</span>
                    <ArrowUpRight size={18} />
                  </div>
                  <h3>{p.title}</h3>
                  <p className="project-summary">
                    {p.description.split(/(?<=\.)\s+/)[0]}
                  </p>
                  <p className="print-only">{p.description}</p>
                  <div className="tags">
                    {p.stack.slice(0, 3).map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
        <section id="skills" className="skills section-wrap">
          <div className="section-heading">
            <div>
              <p className="eyebrow">03 / THE TOOLKIT</p>
              <h2>
                Across the stack.
                <br />
                <span>Close to the problem.</span>
              </h2>
            </div>
            <p>
              A practical skill set built through real deployments, diagnosis
              and delivery.
            </p>
          </div>
          <div className="skill-grid">
            {skills.map((s, i) => (
              <article key={s.title}>
                <span className="small-date">0{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.description}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="education section-wrap">
          <p className="eyebrow">04 / THE FOUNDATIONS</p>
          <h2>Education & qualifications.</h2>
          <div className="education-list">
            <p>
              <span>2016</span>
              <strong>ITIL Foundation</strong>
              <span>IT service management</span>
            </p>
            <p>
              <span>2016</span>
              <strong>PMP — Project Management Professional</strong>
              <span>Listed in CV</span>
            </p>
            <p>
              <strong>Diploma in ICT, Level 3</strong>
              <span>College</span>
            </p>
            <p>
              <strong>Further qualifications</strong>
              <span>
                Customer Service L2 · Warehousing L1 · Functional Skills Maths
                L1 & L2
              </span>
            </p>
          </div>
        </section>
        <footer className="section-wrap">
          <p className="eyebrow">ALWAYS SOMETHING NEW TO FIGURE OUT.</p>
          <h2>
            Let’s build
            <br />
            <span>what’s next.</span>
          </h2>
          <a href="https://github.com/Sophie97x" className="footer-email">
            Find me on GitHub <ArrowUpRight />
          </a>
          <div className="footer-bottom">
            <span>© 2026 Sophie Wilson</span>
            <button onClick={() => window.print()}>
              <Printer size={15} /> Print CV
            </button>
            <a href="#top">Back to the top ↑</a>
          </div>
        </footer>
      </main>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="project-dialog">
          <DialogTitle>{selected?.title}</DialogTitle>
          <DialogDescription>{selected?.description}</DialogDescription>
          <div className="tags">
            {selected?.stack.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
          <p>{selected && statusLabel(selected.status)}</p>
          {selected?.url && (
            <a
              className="button-text"
              href={selected.url}
              target="_blank"
              rel="noreferrer"
            >
              Visit project <ArrowUpRight size={16} />
            </a>
          )}
        </DialogContent>
      </Dialog>
      <noscript>
        <style>
          {
            '.workshop,.reading-banner,.hero-visual,.year-nav,.mode-control{display:none!important}.project-summary{display:none!important}.project-info .print-only{display:block!important}.project-card{cursor:default!important}'
          }
        </style>
        <p className="noscript-note">
          JavaScript is off. The complete CV and project descriptions are shown
          above.
        </p>
      </noscript>
    </div>
  );
}
