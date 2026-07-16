import React, { useState, useEffect, useRef } from 'react';
import { requestOtp, verifyOtpCode, completeSignup, claimResults, getUnclaimedResults } from '../data/auth.js';
import { record } from '../data/journey.js';

/**
 * Email OTP sign-in modal (spec AD-3/AD-8).
 * Steps: email → emailed code → (claim other local results, if any) → done.
 * The result on screen is claimed implicitly; others are opt-in via
 * checkboxes so a shared phone never silently sweeps a partner's results.
 */

const RESEND_COOLDOWN_S = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function AuthPanel({ currentEntry, onClose, onSignedIn }) {
  const [step, setStep] = useState('email'); // email | code | claim | done
  const [email, setEmail] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [claimables, setClaimables] = useState([]);
  const [selected, setSelected] = useState({});
  const codeRef = useRef(null);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (step === 'code') codeRef.current?.focus();
  }, [step]);

  async function sendCode() {
    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) { setError('Please enter a valid email address.'); return; }
    setBusy(true);
    setError('');
    record('signup_start');
    const { error: err } = await requestOtp(clean);
    setBusy(false);
    if (err) { setError(err); return; }
    setEmail(clean);
    setCodeInput(''); // a new send invalidates every earlier code — never leave a stale one in the box
    setCooldown(RESEND_COOLDOWN_S);
    setStep('code');
  }

  async function verify() {
    const token = codeInput.trim();
    // OTP length is a Supabase config value (this project: 8; default: 6) — accept the range.
    if (!/^\d{6,10}$/.test(token)) { setError('Enter the code from the email.'); return; }
    setBusy(true);
    setError('');
    const { error: err } = await verifyOtpCode(email, token);
    if (err) { setBusy(false); setError(err); return; }

    // Profile + implicit claim of the result on screen.
    await completeSignup(currentEntry);
    onSignedIn?.();

    // Other local results become an explicit, opt-in claim step.
    const others = getUnclaimedResults().filter(
      (r) => r.client_result_id !== currentEntry?.client_result_id,
    );
    setBusy(false);
    if (others.length > 0) {
      setClaimables(others);
      setSelected(Object.fromEntries(others.map((r) => [r.client_result_id, true])));
      setStep('claim');
    } else {
      setStep('done');
    }
  }

  async function doClaim() {
    const chosen = claimables.filter((r) => selected[r.client_result_id]);
    setBusy(true);
    if (chosen.length > 0) await claimResults(chosen);
    setBusy(false);
    setStep('done');
  }

  const inputStyle = {
    width: '100%', padding: '0.65rem 0.85rem', borderRadius: '6px',
    border: '1px solid var(--color-border)', background: 'var(--color-bg)',
    color: 'var(--color-text)', fontSize: '1rem', marginBottom: '0.75rem',
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}
    >
      <div style={{
        background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
        borderRadius: '10px', padding: '1.5rem', width: '100%', maxWidth: '400px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1.15rem' }}>{currentEntry ? 'Save your landscape' : 'Sign in'}</h3>
          <button onClick={onClose} aria-label="Close" style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)' }}>✕</button>
        </div>

        {step === 'email' && (
          <>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              A free account keeps your landscapes across devices. Email only — no password, no spam.
            </p>
            <input
              type="email" value={email} placeholder="you@example.com" autoComplete="email"
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && sendCode()}
              style={inputStyle}
            />
            <button className="btn-primary" onClick={sendCode} disabled={busy} style={{ width: '100%' }}>
              {busy ? 'Sending…' : 'Email me a code'}
            </button>
          </>
        )}

        {step === 'code' && (
          <>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              We sent a code to <strong>{email}</strong>. Use the code from the{' '}
              <strong>newest</strong> email — requesting a new code cancels earlier ones.
            </p>
            <input
              ref={codeRef} type="text" inputMode="numeric" maxLength={10} value={codeInput}
              placeholder="12345678" autoComplete="one-time-code"
              onChange={(e) => { setCodeInput(e.target.value.replace(/\D/g, '')); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && verify()}
              style={{ ...inputStyle, letterSpacing: '0.35em', textAlign: 'center', fontFamily: 'var(--font-mono)' }}
            />
            <button className="btn-primary" onClick={verify} disabled={busy} style={{ width: '100%', marginBottom: '0.6rem' }}>
              {busy ? 'Checking…' : 'Verify'}
            </button>
            <button
              onClick={sendCode} disabled={cooldown > 0 || busy}
              style={{ width: '100%', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </button>
          </>
        )}

        {step === 'claim' && (
          <>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
              This device has other saved landscapes. Link the ones that are yours:
            </p>
            <div style={{ marginBottom: '1rem', maxHeight: '180px', overflowY: 'auto' }}>
              {claimables.map((r) => (
                <label key={r.client_result_id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.35rem 0', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(selected[r.client_result_id])}
                    onChange={(e) => setSelected({ ...selected, [r.client_result_id]: e.target.checked })}
                  />
                  <span>
                    {r.label || 'Landscape'} · {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </label>
              ))}
            </div>
            <button className="btn-primary" onClick={doClaim} disabled={busy} style={{ width: '100%' }}>
              {busy ? 'Linking…' : 'Link selected'}
            </button>
          </>
        )}

        {step === 'done' && (
          <>
            <p style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>
              {currentEntry
                ? "You're signed in — this landscape is saved to your account."
                : "You're signed in."}
            </p>
            <button className="btn-primary" onClick={onClose} style={{ width: '100%' }}>Done</button>
          </>
        )}

        {error && <p style={{ color: '#f97066', fontSize: '0.85rem', marginTop: '0.6rem' }}>{error}</p>}
      </div>
    </div>
  );
}
