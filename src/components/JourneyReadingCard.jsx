import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReadingRenderer from './ReadingRenderer.jsx';
import { supabase } from '../data/supabase.js';
import { getOwnedResult, ensureSynced } from '../data/resultsClient.js';
import { getSessionId, record, isDev } from '../data/journey.js';

/**
 * The paid Journey Reading — a deep reading of ONE growth journey.
 *
 * Entitlement is per ask, not per landscape: a second question about the same
 * landscape is a different crossing and is not covered by an earlier purchase.
 *
 * The free reading below the map already names every fact the engine computed.
 * What this buys is interpretation of those facts — what the crossing would
 * cost each person, what would have to be true for it to be possible — so the
 * card says that plainly rather than implying the free version is a teaser.
 *
 * Dormant until infra is wired: renders nothing unless VITE_JOURNEY_PRICE is
 * set (the operator sets it alongside STRIPE_PRICE_JOURNEY + migration 010).
 */

const PRICE = import.meta.env.VITE_JOURNEY_PRICE; // e.g. "8"
const PRICE_LABEL = PRICE ? `$${PRICE}` : null;

async function readingApi(body, entry) {
  const headers = { 'Content-Type': 'application/json' };
  if (entry?.claimed && supabase) {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  const res = await fetch('/api/reading', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...body,
      sku: 'journey',
      result_id: entry.result_id,
      owner_token: entry.claimed ? undefined : entry.owner_token,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = [json.error || `Request failed (${res.status})`, json.detail].filter(Boolean).join(' — ');
    const e = new Error(msg);
    e.status = res.status;
    throw e;
  }
  return json;
}

export default function JourneyReadingCard({ clientResultId, askSlug, otherName }) {
  const entry = getOwnedResult(clientResultId);
  const [phase, setPhase] = useState('idle'); // idle | buying | waiting | generating | ready | error
  const [reading, setReading] = useState('');
  const [regensLeft, setRegensLeft] = useState(0);
  const [error, setError] = useState('');
  const pollRef = useRef(null);

  const checkStatus = useCallback(async () => {
    if (!entry?.result_id || !askSlug) return null;
    try { return await readingApi({ op: 'status', ask_slug: askSlug }, entry); } catch { return null; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.result_id, askSlug]);

  const loadReading = useCallback(async (op = 'get') => {
    setPhase('generating');
    setError('');
    try {
      const data = await readingApi({ op, ask_slug: askSlug, other_name: otherName || undefined }, entry);
      setReading(data.reading);
      setRegensLeft(data.regens_left ?? 0);
      setPhase('ready');
      record('reading_view', { sku: 'journey' });
    } catch (e) {
      setError(e.status === 504
        ? 'The writing took longer than the server allowed. Nothing was charged twice — just try again; it usually completes on the next run.'
        : e.message);
      setPhase(e.status === 402 ? 'idle' : 'error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.result_id, askSlug, otherName]);

  // Entitlement is per ask, so this re-runs when the question changes.
  useEffect(() => {
    if (!PRICE_LABEL || !entry?.result_id || !askSlug) return undefined;
    setPhase('idle');
    setReading('');
    setError('');
    let cancelled = false;

    const url = new URL(window.location.href);
    const justPurchased = url.searchParams.get('purchase') === 'success';
    if (justPurchased) {
      url.searchParams.delete('purchase');
      window.history.replaceState({}, '', url.toString());
    }

    (async () => {
      const status = await checkStatus();
      if (cancelled) return;
      if (status?.entitled) {
        loadReading('get');
      } else if (justPurchased) {
        setPhase('waiting');
        let tries = 0;
        pollRef.current = setInterval(async () => {
          tries += 1;
          const s = await checkStatus();
          if (s?.entitled) {
            clearInterval(pollRef.current);
            if (!cancelled) loadReading('get');
          } else if (tries >= 10) {
            clearInterval(pollRef.current);
            if (!cancelled) {
              setError('Payment received but not yet confirmed — refresh in a minute. Your Stripe receipt is the proof of purchase.');
              setPhase('error');
            }
          }
        }, 3000);
      }
    })();

    return () => { cancelled = true; if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.result_id, askSlug]);

  // Dormant until infra, and only for a device-owned landscape with an answered question.
  if (!PRICE_LABEL || !entry || !askSlug) return null;

  async function buy() {
    setPhase('buying');
    setError('');
    record('checkout_start', { sku: 'journey' });
    try {
      const synced = await ensureSynced(entry.client_result_id);
      if (!synced?.result_id) throw new Error("Couldn't reach the server — try again in a moment.");
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: 'journey',
          resultId: synced.result_id,
          askSlug,
          sessionId: getSessionId(),
          is_dev: isDev() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.checkoutUrl) throw new Error(json.error || 'Checkout unavailable');
      window.location.href = json.checkoutUrl;
    } catch (e) {
      setError(e.message);
      setPhase('idle');
    }
  }

  if (phase === 'ready') {
    return (
      <div className="card" style={{ marginTop: '1.5rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '1.2rem' }}>Your Journey Reading</h3>
            <span style={{ fontSize: '0.75rem', color: '#2dd4a8', fontWeight: 600 }}>✓ Purchased</span>
          </div>
          {regensLeft > 0 && (
            <button
              onClick={() => loadReading('regen')}
              style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}
              title={`${regensLeft} regeneration${regensLeft === 1 ? '' : 's'} left`}
            >
              ↻ Regenerate ({regensLeft} left)
            </button>
          )}
        </div>
        <ReadingRenderer text={reading} />
      </div>
    );
  }

  return (
    <div className="card" style={{ marginTop: '1.5rem', padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 260px' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '0.35rem' }}>The Journey Reading</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
            The reading above names what the route crosses. This one thinks about it: what this
            particular crossing would cost each of you, what would have to be true for it to be
            possible, and the conversations the ground between you actually calls for.
            One-time purchase for this question, yours to regenerate.
          </p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <button
            className="btn-primary"
            onClick={buy}
            disabled={phase === 'buying' || phase === 'waiting' || phase === 'generating'}
            style={{ whiteSpace: 'nowrap' }}
          >
            {phase === 'buying' ? 'Opening checkout…'
              : phase === 'waiting' ? 'Confirming payment…'
                : phase === 'generating' ? 'Writing your reading…'
                  : `Unlock the deep reading — ${PRICE_LABEL}`}
          </button>
        </div>
      </div>
      {phase === 'generating' && (
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.6rem' }}>
          This takes up to a minute — it&apos;s a long document.
        </p>
      )}
      {error && <p style={{ color: '#f97066', fontSize: '0.85rem', marginTop: '0.6rem' }}>{error}</p>}
    </div>
  );
}
