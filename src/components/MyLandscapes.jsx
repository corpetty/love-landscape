import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../data/supabase.js';
import { useAuth, signOut } from '../data/auth.js';
import { getOwnedResults, setLocalLabel, removeOwned, ensureSynced } from '../data/resultsClient.js';
import { isDev } from '../data/journey.js';

/**
 * F0.2 — every landscape this person can get back: local (this browser) and
 * account-linked (any device, when signed in), merged and deduped.
 * Deletes are content deletes; append-only milestones persist by design.
 */

async function apiPost(body, jwt) {
  const headers = { 'Content-Type': 'application/json' };
  if (jwt) headers.Authorization = `Bearer ${jwt}`;
  const res = await fetch('/api/results', {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...body, is_dev: isDev() || undefined }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

async function getJwt() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

export default function MyLandscapes({ onOpen, onBack }) {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // client_result_id
  const [labelDraft, setLabelDraft] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [accountDeleteStep, setAccountDeleteStep] = useState(0); // 0 hidden, 1 confirm, 2 working
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const local = getOwnedResults();
    const merged = new Map(); // client_result_id → row

    for (const r of local) {
      merged.set(r.client_result_id, {
        client_result_id: r.client_result_id,
        result_id: r.result_id,
        code: r.code,
        label: r.label || '',
        created_at: r.created_at,
        owner_token: r.owner_token,
        claimed: Boolean(r.claimed),
        is_public: Boolean(r.is_public),
        local: true,
      });
    }

    if (user) {
      try {
        const jwt = await getJwt();
        const { results } = await apiPost({ op: 'list' }, jwt);
        for (const r of results) {
          const existing = merged.get(r.client_result_id);
          merged.set(r.client_result_id, {
            client_result_id: r.client_result_id,
            result_id: r.id,
            code: r.code,
            label: r.label || existing?.label || '',
            created_at: existing?.created_at || Date.parse(r.created_at),
            owner_token: existing?.owner_token,
            claimed: true,
            is_public: Boolean(r.is_public),
            local: Boolean(existing),
          });
        }
      } catch (e) {
        setError(`Couldn't load account landscapes: ${e.message}`);
      }
    }

    setRows([...merged.values()].sort((a, b) => b.created_at - a.created_at));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function saveLabel(row) {
    const label = labelDraft.trim().slice(0, 100);
    setEditing(null);
    setLocalLabel(row.client_result_id, label);
    setRows((rs) => rs.map((r) => (r.client_result_id === row.client_result_id ? { ...r, label } : r)));
    // Best-effort server sync for rows that exist there.
    try {
      const synced = row.result_id ? row : await ensureSynced(row.client_result_id);
      if (synced?.result_id) {
        const jwt = row.claimed ? await getJwt() : null;
        await apiPost({
          op: 'update',
          result_id: synced.result_id,
          owner_token: row.claimed ? undefined : row.owner_token,
          fields: { label: label || null },
        }, jwt);
      }
    } catch { /* label stays local; retried next edit */ }
  }

  async function doDelete(row) {
    setConfirmDelete(null);
    // Server delete when a server row exists; local removal always.
    try {
      if (row.result_id) {
        const jwt = row.claimed ? await getJwt() : null;
        await apiPost({
          op: 'delete',
          result_id: row.result_id,
          owner_token: row.claimed ? undefined : row.owner_token,
        }, jwt);
      }
    } catch (e) {
      setError(`Couldn't delete from account: ${e.message}`);
      return;
    }
    removeOwned(row.client_result_id);
    setRows((rs) => rs.filter((r) => r.client_result_id !== row.client_result_id));
  }

  async function deleteAccount() {
    setAccountDeleteStep(2);
    setError('');
    try {
      const jwt = await getJwt();
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Deletion failed (${res.status})`);
      // Erase local traces too, then leave signed out.
      ['ll-results-v1', 'll-create-queue-v1', 'love-landscape-result'].forEach((k) => {
        try { localStorage.removeItem(k); } catch { /* ignore */ }
      });
      await signOut();
      window.location.href = '/';
    } catch (e) {
      setError(e.message);
      setAccountDeleteStep(0);
    }
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', paddingTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.4rem' }}>My Landscapes</h2>
        <button className="btn-secondary" onClick={onBack} style={{ fontSize: '0.85rem' }}>Back</button>
      </div>

      {!user && rows.length > 0 && (
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          These live only in this browser. Open one and tap "Save my landscape" to keep them with an account.
        </p>
      )}
      {error && <p style={{ color: '#f97066', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>}

      {loading ? (
        <p style={{ color: 'var(--color-text-muted)', padding: '2rem', textAlign: 'center' }}>Loading…</p>
      ) : rows.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', padding: '2rem', textAlign: 'center' }}>
          No landscapes yet{user ? ' on this account' : ''}. Take the assessment to create one.
        </p>
      ) : (
        rows.map((row) => (
          <div key={row.client_result_id} className="card" style={{
            padding: '0.9rem 1.1rem', marginBottom: '0.6rem',
            display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
          }}>
            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              {editing === row.client_result_id ? (
                <input
                  autoFocus value={labelDraft} maxLength={100}
                  onChange={(e) => setLabelDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveLabel(row)}
                  onBlur={() => saveLabel(row)}
                  style={{
                    width: '100%', padding: '0.3rem 0.5rem', borderRadius: '4px',
                    border: '1px solid var(--color-accent)', background: 'var(--color-bg)',
                    color: 'var(--color-text)', fontSize: '0.95rem',
                  }}
                />
              ) : (
                <button
                  onClick={() => { setEditing(row.client_result_id); setLabelDraft(row.label); }}
                  title="Rename"
                  style={{ fontSize: '0.95rem', fontWeight: 600, textAlign: 'left', padding: 0 }}
                >
                  {row.label || 'Untitled landscape'} <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>✎</span>
                </button>
              )}
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                {new Date(row.created_at).toLocaleDateString()} ·{' '}
                {row.claimed ? 'saved to account' : 'this browser only'}
                {row.is_public ? ' · shared' : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button className="btn-primary" onClick={() => onOpen(row.code)} style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}>
                Open
              </button>
              {confirmDelete === row.client_result_id ? (
                <button
                  onClick={() => doDelete(row)}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem', color: '#f97066', border: '1px solid #f97066', borderRadius: '6px' }}
                >
                  Really delete?
                </button>
              ) : (
                <button
                  onClick={() => setConfirmDelete(row.client_result_id)}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem', color: 'var(--color-text-muted)' }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))
      )}

      {/* Account erasure — signed-in users only */}
      {user && (
        <div style={{ marginTop: '2.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
          {accountDeleteStep === 0 ? (
            <button
              onClick={() => setAccountDeleteStep(1)}
              style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textDecoration: 'underline', textUnderlineOffset: '2px' }}
            >
              Delete my account and data
            </button>
          ) : (
            <div className="card" style={{ padding: '1rem', border: '1px solid rgba(249,112,102,0.4)' }}>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>
                This permanently deletes your account, every saved landscape and comparison,
                and any purchased readings. Anonymous usage counters are retained without any
                link to you. Purchase records keep only what payment reconciliation requires.
                <strong> This cannot be undone.</strong>
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={deleteAccount}
                  disabled={accountDeleteStep === 2}
                  style={{ fontSize: '0.85rem', padding: '0.45rem 1rem', color: '#f97066', border: '1px solid #f97066', borderRadius: '6px' }}
                >
                  {accountDeleteStep === 2 ? 'Deleting…' : 'Yes, delete everything'}
                </button>
                <button
                  onClick={() => setAccountDeleteStep(0)}
                  disabled={accountDeleteStep === 2}
                  style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
