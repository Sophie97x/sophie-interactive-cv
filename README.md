# Sophie's attic

My CV as a little 3D attic, with projects, pets and a working tiny printer.

**[Visit my room](https://cv.sophiewilson.site) · [Make your own room for free](https://cv.sophiewilson.site/edit/)**

Add your story or import a CV, choose your colours and pet, then share your room. Drag to look around, scroll to zoom, or read the normal CV underneath. Use `?view=plain` to skip the 3D view.

## Make your own

Drafts stay in your browser. PDF, DOCX and text imports are read on your device; check the results before publishing. Download a JSON backup before clearing browser data.

On my site, choose a short address and keep your private edit key to update or remove your page. Anyone with that key can edit it, and there's no email recovery.

The [GitHub Pages editor](https://sophie97x.github.io/sophie-interactive-cv/edit/) also works without an account. It stores your CV in the share link instead of a database. Keep the entire link, including everything after `#`. These are public snapshots: old copies can't be recalled.

## Run locally

Requires Node.js 22.16 or newer.

```sh
npm ci
npm run dev -- --port 5190
```

Open http://localhost:5190. To test publishing:

```sh
npm run typecheck
npm run lint
npm run build
npm test
npm start
```

Open http://localhost:5192/edit. Use `localhost` to match the default origin. Published rooms are saved in `data/attic.sqlite`.

## Hosting

My site runs in a Proxmox container behind Cloudflare Tunnel. You can also use Docker Compose in a Linux VM:

```sh
export PUBLIC_ORIGIN=https://cv.example.com
docker compose up -d --build
curl http://127.0.0.1:3000/healthz
```

Set `PUBLIC_ORIGIN` to your exact HTTPS hostname, with no path. Save it in a local `.env` for future updates. No API keys are needed.

Point your Cloudflare Tunnel at `http://localhost:3000` if it runs on the same machine. The Docker port is loopback-only; a tunnel elsewhere needs private connectivity. Don't cache `/api/*`, `/edit` or published page HTML.

- `ENABLE_PUBLISHING=false` closes new registrations; existing pages and edits still work.
- `MAX_PROFILES` defaults to 1,000. Built-in write limits reset on restart.
- Only set `TRUST_CLOUDFLARE=true` when the app is reachable exclusively through your tunnel.
- Data stays in the `attic-data` volume. `docker compose down -v` deletes it.

For GitHub Pages, choose **GitHub Actions** in Settings → Pages. The included workflow deploys `main`; only snapshot links are available there.

## Backups

Take a consistent snapshot with a new filename, then copy it off the host:

```sh
docker compose exec attic node --experimental-strip-types scripts/manage.mjs backup /app/data/backup-2026-09-09.sqlite
docker compose cp attic:/app/data/backup-2026-09-09.sqlite ./backup-2026-09-09.sqlite
```

Keep backups private. To restore, stop the app, restore the snapshot with the correct file ownership, then restart. Test recovery before relying on it.

The management script also supports `list` and `unpublish example-name --confirm example-name`. Unpublishing is permanent without a backup.

## Built with

React, TypeScript, Three.js, React Three Fiber, Vinext and SQLite. Room models live in `components/room`; my project details are in `content/baseline.json`.
