# Sophie's attic

My CV, but as a little 3D attic.

I wanted somewhere to put my work projects, things I make at home and the hardware I like tinkering with. You can look around the room, browse the shelves or scroll down for the normal CV.

There's a tiny version of me at the desk, a wandering quail and a printer that makes a little bunny. The print takes about 90 seconds, with pause and replay controls.

## Make your own

[Open the editor](https://sophie97x.github.io/sophie-interactive-cv/edit/). Add your story or import a CV, choose your room, colours, hair and pet, then create a share link. The preview changes as you type.

The GitHub version is free and needs no account or API keys. Your CV is compressed into the link, not stored in a database. Anyone with the link can read or copy it. Each link is a snapshot: changes need a new link, and old links cannot be recalled. Keep the whole link, including everything after `#`; some apps may shorten or reject very long links.

Drafts stay in your browser. Download a JSON backup before clearing browser data or moving devices, then import it on the first editor step. PDF, DOCX and text imports are read on your device, not uploaded. Check the results: scanned PDFs need selectable text or manual entry.

### GitHub Pages

The Pages workflow checks and builds the site when `main` changes. In repository Settings → Pages, use GitHub Actions as the source. It uses GitHub’s built-in deployment permissions; no extra secrets are needed. Forks can enable the same workflow. GitHub supplies the base path, so repository names and custom domains work without editing links.

To test the Pages build locally:

```sh
VITE_STATIC_HOSTING=true PAGES_BASE_PATH=/sophie-interactive-cv npm run build
node scripts/preview-pages.mjs
```

Open http://localhost:5194/sophie-interactive-cv/edit/.

### Optional self-hosted publishing

For short, editable addresses like `/alex-smith`, use the server below instead. GitHub Pages cannot run that server.

The preview changes as you type. Drafts stay in your browser until you publish. Published pages are stored on the host and work for anyone with the link, on another device too. Each person gets a path on the host's domain, not a separately registered domain.

After publishing, save the private edit key. You can use it at `/edit` to reopen, update or unpublish your page. Keep it separate from the share link: anyone with that key can change or remove your page. There's no email recovery. Only a hash of the key is kept in the database; the editor keeps your current draft and key on your device. Use a trusted device, and save the key before clearing browser data or starting another draft.

## Run it locally

You'll need Node.js 22.16 or newer (including the built-in [SQLite backup API](https://nodejs.org/api/sqlite.html#sqlitebackupsourceDb-path-options)).

```sh
npm ci
npm run dev -- --port 5190
```

Open http://localhost:5190 for frontend development. Publishing needs the server below; it isn't available in the frontend-only development server.

## Controls

- Drag to rotate, scroll to zoom.
- Shift-drag or right-drag to move around.
- On a phone, use two fingers to move and pinch to zoom.
- Open the settings menu to jump to a shelf, pause movement or reset the view.
- Add `?view=plain` to skip the 3D room.

The CV underneath can also be printed or saved as a PDF.

## Build and check

```sh
npm run typecheck
npm run lint
npm run build
npm test
npm start
```

Open http://localhost:5192, then `/edit`. Use `localhost`, not `127.0.0.1`, so browser requests match the configured origin. The server serves `dist/client` and saves published pages in `data/attic.sqlite`. No external API keys are needed.

## Proxmox + Cloudflare

Run this in a Linux VM with Docker Compose in your homelab. Keep it separate from the Proxmox host itself.

```sh
git clone https://github.com/Sophie97x/sophie-interactive-cv.git
cd sophie-interactive-cv
export PUBLIC_ORIGIN=https://cv.example.com
docker compose up -d --build
docker compose ps
curl http://127.0.0.1:3000/healthz
```

Replace `cv.example.com` with your hostname. `PUBLIC_ORIGIN` must be the exact public HTTPS origin, with no path. Set it again before future Compose commands, or put it in a local `.env` file. Environment files and databases are ignored by Git.

In your existing [Cloudflare Tunnel](https://developers.cloudflare.com/tunnel/setup/), add a published application route for that hostname pointing to `http://localhost:3000`. This assumes `cloudflared` runs on the same VM as a host service. The app's Docker port is bound to loopback, not the LAN or internet. No inbound router port is needed for a [Cloudflare Tunnel](https://developers.cloudflare.com/tunnel/).

If `cloudflared` runs in another container, its `localhost` is not the app. Put both services on a private Docker network and use `http://attic:3000` instead. If it runs on another machine, arrange private connectivity first; don't expose port 3000 publicly just to make it connect.

Don't cache `/api/*`, `/edit` or published profile HTML in Cloudflare. Avoid a site-wide “cache everything” rule. Static `/_next/static/*` assets can be cached. Check `/healthz`, publish a test page, and open its link on a different device after setup. Cloudflare Access will make the pages private if you enable it for the whole hostname.

### Hosting controls

- New pages are open to anyone by default. Set `ENABLE_PUBLISHING=false` to close new registrations while existing pages and owner edits keep working.
- `MAX_PROFILES` defaults to 1,000. Pages are limited to 64 KB, with at most 12 experience entries and 12 projects.
- The app limits creates to 10 and writes to 120 per source IP per hour. These counters reset on restart. Behind a proxy, visitors share its limit unless `TRUST_CLOUDFLARE=true` is set. Only enable that when the app is reachable exclusively through your Cloudflare tunnel; otherwise clients could forge the IP header.
- For an open public host, add Cloudflare rate limits or bot protection as needed and check for spam. This is a small self-hosted app, not an abuse-proof publishing service.
- The database lives in the `attic-data` Docker volume. Updating/rebuilding the container keeps it. `docker compose down -v` deletes it; don't use that for normal updates.

### Back up and manage pages

The backup command takes a consistent SQLite snapshot while the app is running. Use a new filename each time; existing files aren't overwritten.

```sh
docker compose exec attic node --experimental-strip-types scripts/manage.mjs backup /app/data/backup-2026-09-08.sqlite
docker compose cp attic:/app/data/backup-2026-09-08.sqlite ./backup-2026-09-08.sqlite
docker compose exec attic node --experimental-strip-types scripts/manage.mjs list
```

Copy backups off the VM and keep them private. They include published CV details and hashed edit keys. Don't just copy a running database file: SQLite also uses WAL sidecar files. For recovery, stop the app and restore a tested snapshot into a fresh data volume before restarting, preserving the `node` user's ownership. Test recovery before relying on a backup.

To remove an abusive page as the host, back up first, then name it twice:

```sh
docker compose exec attic node --experimental-strip-types scripts/manage.mjs unpublish example-name --confirm example-name
```

This permanently unpublishes that page. Recovery needs a backup. No edit key is required for the host's command-line tools, so keep access to the VM and database private.

The app and publishing flow have local tests. The Docker image and your actual Proxmox/Cloudflare deployment still need to be tested on your host.

## Under the hood

React, TypeScript, Three.js, React Three Fiber and Vinext. The room models are made in code. Project details live in `content/baseline.json`; the room is in `components/room`.

The shared-page server uses Node's built-in SQLite support. There are no third-party account services, API keys or uploads. Only full HTTPS links are accepted; raw HTML isn't rendered from profile fields.
