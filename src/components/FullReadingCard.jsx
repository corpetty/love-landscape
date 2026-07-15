import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReadingRenderer from './ReadingRenderer.jsx';
import { supabase } from '../data/supabase.js';
import { getOwnedResult, ensureSynced } from '../data/resultsClient.js';
import { getSessionId, record, isDev } from '../data/journey.js';

/**
 * F0.4 — the $12 Full Reading. Shown only for device-owned results.
 * Buy → Stripe checkout → back here with ?purchase=success → poll the
 * entitlement (webhook latency) → generate + render. Purchases survive
 * lost tokens via the Stripe receipt (docs/payments-runbook.md).
 */

const PRICE_LABEL = '$12';

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

export default function FullReadingCard({ clientResultId, partnerCode }) {
  const entry = getOwnedResult(clientResultId);
  const [phase, setPhase] = useState('idle'); // idle | buying | waiting | generating | ready | error
  const [reading, setReading] = useState('');
  const [regensLeft, setRegensLeft] = useState(0);
  const [error, setError] = useState('');
  const pollRef = useRef(null);

  const checkStatus = useCallback(async () => {
    if (!entry?.result_id) return null;
    try { return await readingApi({ op: 'status' }, entry); } catch { return null; }
  }, [entry?.result_id]);

  const loadReading = useCallback(async (op = 'get', withPartner = false) => {
    setPhase('generating');
    setError('');
    try {
      const body = { op };
      if (withPartner && partnerCode) body.partner_code = partnerCode;
      const data = await readingApi(body, entry);
      setReading(data.reading);
      setRegensLeft(data.regens_left ?? 0);
      setPhase('ready');
      record('reading_view');
    } catch (e) {
      setError(e.message);
      setPhase(e.status === 402 ? 'idle' : 'error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.result_id, partnerCode]);

  // On mount: check entitlement; handle the post-checkout return.
  useEffect(() => {
    if (!entry?.result_id) return undefined;
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
        loadReading('get', !status.has_reading); // pair section only at first generation
      } else if (justPurchased) {
        // Webhook may lag the redirect — poll up to ~30s.
        setPhase('waiting');
        let tries = 0;
        pollRef.current = setInterval(async () => {
          tries += 1;
          const s = await checkStatus();
          if (s?.entitled) {
            clearInterval(pollRef.current);
            if (!cancelled) loadReading('get', !s.has_reading);
          } else if (tries >= 10) {
            clearInterval(pollRef.current);
            if (!cancelled) {
              setError("Payment received but not yet confirmed — refresh in a minute. Your Stripe receipt is the proof of purchase.");
              setPhase('error');
            }
          }
        }, 3000);
      }
    })();

    return () => { cancelled = true; if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.result_id]);

  if (!entry) return null;

  async function buy() {
    setPhase('buying');
    setError('');
    record('checkout_start');
    try {
      const synced = await ensureSynced(entry.client_result_id);
      if (!synced?.result_id) throw new Error("Couldn't reach the server — try again in a moment.");
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: 'full_reading',
          resultId: synced.result_id,
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
          <h3 style={{ fontSize: '1.2rem' }}>Your Full Reading</h3>
          {regensLeft > 0 && (
            <button
              onClick={() => loadReading('regen', Boolean(partnerCode))}
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
          <h3 style={{ fontSize: '1.05rem', marginBottom: '0.35rem' }}>The Full Reading</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
            A ~3,000-word deep interpretation of your specific terrain: all 13 parameters in
            depth, your growth edges, conversation starters built from your landscape
            {partnerCode ? ', and a compatibility section for the landscape you loaded' : ''}.
            One-time purchase, yours to regenerate.
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
              : `Get the Full Reading — ${PRICE_LABEL}`}
          </button>
        </div>
      </div>
      {phase === 'generating' && (
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.6rem' }}>
          This takes up to a minute — it's a long document.
        </p>
      )}
      {error && <p style={{ color: '#f97066', fontSize: '0.85rem', marginTop: '0.6rem' }}>{error}</p>}
    </div>
  );
}
