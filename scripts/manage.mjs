import { DatabaseSync, backup } from 'node:sqlite';
import { closeSync, openSync } from 'node:fs';
import { resolve } from 'node:path';
import { validSlug } from '../lib/profile.ts';

const [command, target, confirmation, confirmSlug] = process.argv.slice(2);
const dbPath = process.env.DATABASE_PATH || 'data/attic.sqlite';
if (!['list', 'backup', 'unpublish'].includes(command)) {
  console.error(
    'Usage: manage.mjs list | backup <new-file.sqlite> | unpublish <slug> --confirm <slug>',
  );
  process.exit(1);
}
const db = new DatabaseSync(dbPath, { readOnly: command !== 'unpublish' });
try {
  if (command === 'list')
    console.table(
      db
        .prepare(
          'SELECT slug, revision, updated_at FROM portfolios ORDER BY updated_at DESC',
        )
        .all(),
    );
  if (command === 'backup') {
    if (!target || resolve(target) === resolve(dbPath))
      throw new Error(
        'Choose a new backup file, separate from the live database.',
      );
    closeSync(openSync(target, 'wx', 0o600));
    await backup(db, target);
    console.log(
      `Backup saved to ${target}. Copy it off this machine and keep it private.`,
    );
  }
  if (command === 'unpublish') {
    if (
      !validSlug(target) ||
      confirmation !== '--confirm' ||
      confirmSlug !== target
    )
      throw new Error(
        'Confirm the exact page: unpublish <slug> --confirm <slug>. Take a backup first.',
      );
    const result = db
      .prepare('DELETE FROM portfolios WHERE slug = ?')
      .run(target);
    console.log(
      result.changes
        ? `Unpublished /${target}. Recovery requires a database backup.`
        : 'No matching page; nothing changed.',
    );
  }
} finally {
  db.close();
}
