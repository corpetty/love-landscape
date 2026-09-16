import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { ALLOWED_NAMES } from '../api/sync.js';

/**
 * Three lists have to agree about which diagnostic events exist: the database
 * CHECK, the server allowlist in api/sync.js, and whatever the client actually
 * calls record() with. A name missing from the middle one is dropped in
 * silence — indistinguishable from a funnel step nobody reached — which is how
 * the growth-journey events were lost between writing them and noticing.
 */

const ROOT = path.join(import.meta.dirname, '..');

/** Names the newest migration's events CHECK permits. */
function namesFromMigrations() {
  const dir = path.join(ROOT, 'supabase', 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  let names = null;
  for (const f of files) {
    const sql = fs.readFileSync(path.join(dir, f), 'utf8');
    const m = sql.match(/events_name_check CHECK \(name IN \(([\s\S]*?)\)\)/);
    if (m) names = new Set(m[1].match(/'[a-z_]+'/g).map((s) => s.slice(1, -1)));
  }
  // The original CHECK is inline in the table definition, not a named constraint.
  if (!names) {
    const base = fs.readFileSync(path.join(dir, '003_phase0.sql'), 'utf8');
    const m = base.match(/name\s+TEXT NOT NULL CHECK \(name IN \(([\s\S]*?)\)\)/);
    names = new Set(m[1].match(/'[a-z_]+'/g).map((s) => s.slice(1, -1)));
  }
  return names;
}

/** Names the client passes to record(), across the whole src tree. */
function namesFromClient(dir = path.join(ROOT, 'src'), found = new Set()) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) namesFromClient(full, found);
    else if (/\.jsx?$/.test(entry.name)) {
      const src = fs.readFileSync(full, 'utf8');
      for (const m of src.matchAll(/\brecord\(\s*'([a-z_]+)'/g)) found.add(m[1]);
    }
  }
  return found;
}

describe('diagnostic event names', () => {
  const migration = namesFromMigrations();
  const client = namesFromClient();

  it('every name the client records survives the server allowlist', () => {
    const dropped = [...client].filter((n) => !ALLOWED_NAMES.has(n));
    expect(dropped, `dropped silently by api/sync.js: ${dropped.join(', ')}`).toEqual([]);
  });

  it('every name the server forwards is one the database will accept', () => {
    const rejected = [...ALLOWED_NAMES].filter((n) => !migration.has(n));
    expect(rejected, `would fail the events CHECK: ${rejected.join(', ')}`).toEqual([]);
  });

  it('includes the growth-journey events, end to end', () => {
    for (const name of ['ask_create', 'ask_open', 'ask_answer']) {
      expect(client, `${name} is never recorded`).toContain(name);
      expect(ALLOWED_NAMES.has(name), `${name} is not forwarded`).toBe(true);
      expect(migration.has(name), `${name} is not in the CHECK`).toBe(true);
    }
  });
});
