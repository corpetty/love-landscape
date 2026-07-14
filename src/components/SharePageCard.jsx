import React, { useState } from 'react';
import { supabase } from '../data/supabase.js';
import { ensureSynced, setLocalShare, getOwnedResult } from '../data/resultsClient.js';
import { isDev } from '../data/journey.js';

/**
 * Publish/unpublish a landscape as a public page at /r/<slug> (spec F0.3).
 * Available for device-owned results, account or not. The consent copy is
 * deliberately blunt about what unpublishing can and cannot take back.
 */

async function updateShare(entry, isPublic) {
  const synced = await ensureSynced(entry.client_result_id);
  if (!synced?.result_id) throw new Error("Couldn't reach the server — try again in a moment.");

  const headers = { 'Content-Type': 'application/json' };
  if (entry.claimed && supabase) {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  const res = await fetch('/api/results', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      op: 'update',
      result_id: synced.result_id,
      owner_token: entry.claimed ? undefined : entry.owner_token,
      fields: { is_public: isPublic },
      is_dev: isDev() || undefined,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json.result; // { id, label, is_public, slug }
}

export default function SharePageCard({ clientResultId }) {
  // Re-read on every render: publish state lives in the ownership store.
  const entry = getOwnedResult(clientResultId);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [, force] = useState(0);

  if (!entry) return null;
  const shareUrl = entry.slug ? `${window.location.origin}/r/${entry.slug}` : null;

  async function publish() {
    setBusy(true);
    setError('');
    try {
      const result = await updateShare(entry, true);
      setLocalShare(entry.client_result_id, { is_public: result.is_public, slug: result.slug });
      setConfirming(false);
      force((n) => n + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function unpublish() {
    setBusy(true);
    setError('');
    try {
      const result = await updateShare(entry, false);
      setLocalShare(entry.client_result_id, { is_public: result.is_public, slug: result.slug });
      force((n) => n + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <div className="card" style={{ marginTop: '1rem', padding: '1rem 1.25rem' }}>
      {entry.is_public && shareUrl ? (
        <>
          <p style={{ fontSize: '0.9rem', marginBottom: '0.6rem' }}>
            <span style={{ color: '#2dd4a8' }}>●</span> This landscape has a public page:
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <code style={{
              fontSize: '0.85rem', padding: '0.35rem 0.6rem', background: 'var(--color-bg)',
              border: '1px solid var(--color-border)', borderRadius: '6px', wordBreak: 'break-all',
            }}>
              {shareUrl}
            </code>
            <button className="btn-primary" onClick={copyLink} style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}>
              {copied ? 'Copied ✓' : 'Copy link'}
            </button>
            <button
              onClick={unpublish} disabled={busy}
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem', color: 'var(--color-text-muted)' }}
            >
              {busy ? '…' : 'Unpublish'}
            </button>
          </div>
        </>
      ) : confirming ? (
        <>
          <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 600 }}>
            Before you publish:
          </p>
          <ul style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', paddingLeft: '1.1rem', marginBottom: '0.9rem', lineHeight: 1.6 }}>
            <li>Anyone with the link can view this landscape — the terrain and its code, never your questionnaire answers.</li>
            <li>Unpublishing removes the page, but messaging apps may keep cached previews for a while.</li>
            <li>The code itself, once copied by someone, can be decoded forever — unpublishing can't take codes back.</li>
          </ul>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-primary" onClick={publish} disabled={busy} style={{ fontSize: '0.85rem' }}>
              {busy ? 'Publishing…' : 'Publish page'}
            </button>
            <button onClick={() => setConfirming(false)} style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              Cancel
            </button>
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', flex: '1 1 220px' }}>
            Want a page you can share anywhere? Publishing creates a public link with a
            preview image — no account required.
          </p>
          <button className="btn-primary" onClick={() => setConfirming(true)} style={{ whiteSpace: 'nowrap' }}>
            Create share page
          </button>
        </div>
      )}
      {error && <p style={{ color: '#f97066', fontSize: '0.85rem', marginTop: '0.6rem' }}>{error}</p>}
    </div>
  );
}
