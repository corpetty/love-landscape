import React, { useState, useEffect } from 'react';
import { useAuth, signOut } from '../data/auth.js';
import { supabase } from '../data/supabase.js';
import {
  refreshCredits, getCachedCredits, startCreditCheckout, redeemCoupon,
} from '../data/llmClient.js';

/**
 * The account/profile page: who you are, your reading credits, and the
 * account-level actions (sign out, delete). Credits are per-browser-session,
 * so the credits section works signed in or out — only the identity and
 * danger-zone sections require an account.
 */
export default function AccountScreen({ onBack, onSignIn, onMyLandscapes, onOpenSettings }) {
  const { user, ready } = useAuth();
  const [credits, setCredits] = useState(getCachedCredits());
  const [creditsChecked, setCreditsChecked] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponResult, setCouponResult] = useState(null); // { ok, message }
  const [deleteStep, setDeleteStep] = useState(0); // 0 hidden, 1 confirm, 2 working
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    refreshCredits().then((data) => {
      if (data) setCredits(data.creditsRemaining);
      setCreditsChecked(true);
    });
  }, []);

  async function handleBuyCredits() {
    setCheckingOut(true);
    setCheckoutError('');
    try {
      const { checkoutUrl } = await startCreditCheckout();
      window.location.href = checkoutUrl;
    } catch (err) {
      setCheckoutError(err.message);
      setCheckingOut(false);
    }
  }

  async function handleRedeemCoupon(e) {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponResult(null);
    try {
      const data = await redeemCoupon(couponCode.trim());
      setCouponResult({ ok: true, message: data.message });
      setCredits(data.creditsRemaining);
      setCouponCode('');
    } catch (err) {
      setCouponResult({ ok: false, message: err.message });
    }
    setCouponLoading(false);
  }

  async function deleteAccount() {
    setDeleteStep(2);
    setDeleteError('');
    try {
      const { data } = await supabase.auth.getSession();
      const jwt = data?.session?.access_token;
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Deletion failed (${res.status})`);
      // Erase local traces too, then leave signed out.
      ['ll-results-v1', 'll-create-queue-v1', 'll-readings-v1', 'love-landscape-result'].forEach((k) => {
        try { localStorage.removeItem(k); } catch { /* ignore */ }
      });
      await signOut();
      window.location.href = '/';
    } catch (e) {
      setDeleteError(e.message);
      setDeleteStep(0);
    }
  }

  const sectionTitle = { fontSize: '1.05rem', marginBottom: '0.6rem' };
  const cardStyle = { padding: '1rem 1.25rem', marginBottom: '1rem' };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', paddingTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.4rem' }}>Account</h2>
        <button className="btn-secondary" onClick={onBack} style={{ fontSize: '0.85rem' }}>Back</button>
      </div>

      {/* Identity */}
      <div className="card" style={cardStyle}>
        {!ready ? (
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Loading…</p>
        ) : user ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>{user.email}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                Your landscapes are saved to this account across devices.
              </p>
            </div>
            <button className="btn-secondary" onClick={() => signOut()} style={{ fontSize: '0.85rem' }}>
              Sign out
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', flex: '1 1 220px' }}>
              You're not signed in. A free account keeps your landscapes across devices —
              email only, no password.
            </p>
            <button className="btn-primary" onClick={onSignIn} style={{ whiteSpace: 'nowrap' }}>
              Sign in
            </button>
          </div>
        )}
      </div>

      {/* Reading credits */}
      <div className="card" style={cardStyle}>
        <h3 style={sectionTitle}>Reading credits</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem', lineHeight: 1.6 }}>
          Credits power the AI readings on your results page.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '0.9rem',
            fontWeight: credits !== null && credits <= 1 ? 600 : 400,
            color: credits !== null && credits <= 1 ? '#f97066' : 'var(--color-text)',
          }}>
            {credits === null
              ? (creditsChecked ? 'Balance unavailable right now' : 'Checking…')
              : credits === 0
                ? 'No credits remaining'
                : `${credits} reading${credits === 1 ? '' : 's'} remaining`}
          </span>
          <button
            className="btn-secondary"
            onClick={handleBuyCredits}
            disabled={checkingOut}
            style={{ fontSize: '0.8rem' }}
          >
            {checkingOut ? 'Redirecting…' : 'Get more readings'}
          </button>
        </div>
        {checkoutError && (
          <p style={{ fontSize: '0.8rem', color: '#f97066', marginTop: '0.4rem' }}>{checkoutError}</p>
        )}

        <form onSubmit={handleRedeemCoupon} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.85rem' }}>
          <input
            type="text"
            value={couponCode}
            onChange={(e) => { setCouponCode(e.target.value); setCouponResult(null); }}
            placeholder="Coupon code"
            style={{
              flex: 1, minWidth: 0, padding: '0.4rem 0.6rem', borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg)', fontSize: '0.85rem',
              fontFamily: 'var(--font-mono)',
            }}
          />
          <button
            type="submit"
            disabled={couponLoading || !couponCode.trim()}
            style={{
              fontSize: '0.8rem', fontWeight: 600,
              padding: '0.4rem 0.8rem', borderRadius: '6px',
              background: 'var(--color-accent)', color: '#fff',
              opacity: couponLoading || !couponCode.trim() ? 0.5 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {couponLoading ? 'Applying…' : 'Apply'}
          </button>
        </form>
        {couponResult && (
          <p style={{
            fontSize: '0.8rem', marginTop: '0.35rem',
            color: couponResult.ok ? '#2dd4a8' : '#f97066',
          }}>
            {couponResult.ok ? `✓ ${couponResult.message}` : `✗ ${couponResult.message}`}
          </p>
        )}
      </div>

      {/* My Landscapes */}
      <div className="card" style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem' }}>My Landscapes</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
            Every landscape saved on this device{user ? ' and this account' : ''}.
          </p>
        </div>
        <button className="btn-secondary" onClick={onMyLandscapes} style={{ fontSize: '0.85rem' }}>
          View
        </button>
      </div>

      {/* Advanced: AI provider */}
      <div className="card" style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem' }}>AI provider</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
            Readings use Love Landscape AI by default. Advanced: bring your own API key.
          </p>
        </div>
        <button className="btn-secondary" onClick={onOpenSettings} style={{ fontSize: '0.85rem' }}>
          Configure
        </button>
      </div>

      {/* Danger zone — signed-in users only */}
      {user && (
        <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
          {deleteStep === 0 ? (
            <button
              onClick={() => setDeleteStep(1)}
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
                  disabled={deleteStep === 2}
                  style={{ fontSize: '0.85rem', padding: '0.45rem 1rem', color: '#f97066', border: '1px solid #f97066', borderRadius: '6px' }}
                >
                  {deleteStep === 2 ? 'Deleting…' : 'Yes, delete everything'}
                </button>
                <button
                  onClick={() => setDeleteStep(0)}
                  disabled={deleteStep === 2}
                  style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {deleteError && <p style={{ color: '#f97066', fontSize: '0.85rem', marginTop: '0.6rem' }}>{deleteError}</p>}
        </div>
      )}
    </div>
  );
}
