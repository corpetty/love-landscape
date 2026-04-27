import React, { useState, useEffect } from 'react';
import {
  loadLLMConfig, saveLLMConfig, getDefaultModel,
  testConnection, refreshCredits, startCreditCheckout,
  redeemCoupon, getCachedCredits, getSessionId,
} from '../data/llmClient.js';

const BYOK_PROVIDERS = [
  { value: 'ollama',     label: 'Ollama (local)' },
  { value: 'claude',     label: 'Claude API' },
  { value: 'openrouter', label: 'OpenRouter' },
];

export default function SettingsPanel({ onClose }) {
  const [useManaged, setUseManaged]     = useState(true);
  const [provider, setProvider]         = useState('ollama');
  const [apiKey, setApiKey]             = useState('');
  const [baseUrl, setBaseUrl]           = useState('http://localhost:11434');
  const [model, setModel]               = useState('');
  const [byokOpen, setByokOpen]         = useState(false);
  const [testResult, setTestResult]     = useState(null);
  const [testing, setTesting]           = useState(false);
  const [saved, setSaved]               = useState(false);
  const [credits, setCredits]           = useState(null);
  const [checkingOut, setCheckingOut]   = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [couponCode, setCouponCode]       = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponResult, setCouponResult]   = useState(null); // { ok, message }

  useEffect(() => {
    const config = loadLLMConfig();
    if (config && config.provider !== 'managed') {
      setUseManaged(false);
      setByokOpen(true);
      setProvider(config.provider || 'ollama');
      setApiKey(config.apiKey || '');
      setBaseUrl(config.baseUrl || 'http://localhost:11434');
      setModel(config.model || '');
    }

    // Load credits (cached first, then fresh from server)
    const cached = getCachedCredits();
    if (cached !== null) setCredits(cached);
    refreshCredits().then((data) => {
      if (data) setCredits(data.creditsRemaining);
    });
  }, []);

  function handleSelectManaged() {
    setUseManaged(true);
    setByokOpen(false);
    setTestResult(null);
  }

  function handleProviderChange(p) {
    setProvider(p);
    setModel(getDefaultModel(p));
    setTestResult(null);
  }

  function handleSave() {
    if (useManaged) {
      saveLLMConfig({ provider: 'managed' });
    } else {
      saveLLMConfig({ provider, apiKey, baseUrl, model });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    const config = useManaged
      ? { provider: 'managed' }
      : { provider, apiKey, baseUrl, model };
    const result = await testConnection(config);
    setTestResult(result);
    setTesting(false);
  }

  async function handleBuyCredits() {
    setCheckingOut(true);
    setCheckoutError(null);
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
    e.stopPropagation();
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

  const needsApiKey = !useManaged && (provider === 'claude' || provider === 'openrouter');
  const showBaseUrl = !useManaged && provider === 'ollama';
  const creditsLow  = credits !== null && credits <= 1;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '1.5rem',
        width: '90%', maxWidth: '440px',
        maxHeight: '88vh', overflowY: 'auto',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem' }}>AI Reading Settings</h3>
          <button onClick={onClose} style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)', padding: '0.2rem' }}>×</button>
        </div>

        {/* ── Managed option ──────────────────────────────────────────── */}
        <div
          onClick={handleSelectManaged}
          style={{
            border: `2px solid ${useManaged ? 'var(--color-accent)' : 'var(--color-border)'}`,
            borderRadius: '10px',
            padding: '1rem 1.1rem',
            marginBottom: '0.75rem',
            cursor: 'pointer',
            background: useManaged ? 'rgba(127,119,221,0.07)' : 'transparent',
            transition: 'all 0.15s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <div style={{
              width: 14, height: 14, borderRadius: '50%',
              border: `2px solid ${useManaged ? 'var(--color-accent)' : 'var(--color-border)'}`,
              background: useManaged ? 'var(--color-accent)' : 'transparent',
              flexShrink: 0,
            }} />
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Love Landscape AI</span>
            <span style={{
              fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.04em',
              background: 'rgba(127,119,221,0.15)', color: 'var(--color-accent)',
              borderRadius: '4px', padding: '0.1rem 0.45rem',
            }}>RECOMMENDED</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.5, margin: '0 0 0.6rem 1.5rem' }}>
            No API key needed. Hosted Claude, managed for you.
          </p>

          {/* Credits display */}
          <div style={{ marginLeft: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '0.8rem',
              color: creditsLow ? '#f97066' : 'var(--color-text-muted)',
              fontWeight: creditsLow ? 600 : 400,
            }}>
              {credits === null
                ? 'Checking credits…'
                : credits === 0
                  ? '✗ No credits remaining'
                  : `✓ ${credits} reading${credits === 1 ? '' : 's'} remaining`}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); handleBuyCredits(); }}
              disabled={checkingOut}
              style={{
                fontSize: '0.75rem', fontWeight: 600,
                padding: '0.25rem 0.7rem', borderRadius: '6px',
                border: '1.5px solid var(--color-accent)',
                color: 'var(--color-accent)', background: 'transparent',
                cursor: checkingOut ? 'default' : 'pointer',
                opacity: checkingOut ? 0.6 : 1,
              }}
            >
              {checkingOut ? 'Redirecting…' : 'Get more readings'}
            </button>
          </div>
          {checkoutError && (
            <p style={{ fontSize: '0.75rem', color: '#f97066', margin: '0.35rem 0 0 1.5rem' }}>
              {checkoutError}
            </p>
          )}

          {/* Coupon code input */}
          <div style={{ marginTop: '0.75rem', marginLeft: '1.5rem' }}>
            <form onSubmit={handleRedeemCoupon} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <input
                type="text"
                value={couponCode}
                onChange={(e) => { setCouponCode(e.target.value); setCouponResult(null); }}
                onClick={(e) => e.stopPropagation()}
                placeholder="Coupon code"
                style={{
                  flex: 1, padding: '0.35rem 0.6rem', borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg-card)', fontSize: '0.8rem',
                  fontFamily: 'var(--font-mono)',
                }}
              />
              <button
                type="submit"
                onClick={(e) => e.stopPropagation()}
                disabled={couponLoading || !couponCode.trim()}
                style={{
                  fontSize: '0.75rem', fontWeight: 600,
                  padding: '0.35rem 0.7rem', borderRadius: '6px',
                  background: 'var(--color-accent)', color: '#fff',
                  cursor: couponLoading || !couponCode.trim() ? 'default' : 'pointer',
                  opacity: couponLoading || !couponCode.trim() ? 0.5 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {couponLoading ? 'Applying...' : 'Apply'}
              </button>
            </form>
            {couponResult && (
              <p style={{
                fontSize: '0.75rem', margin: '0.3rem 0 0',
                color: couponResult.ok ? '#2dd4a8' : '#f97066',
              }}>
                {couponResult.ok ? `\u2713 ${couponResult.message}` : `\u2717 ${couponResult.message}`}
              </p>
            )}
          </div>
        </div>

        {/* ── BYOK section ────────────────────────────────────────────── */}
        <div style={{
          border: `2px solid ${!useManaged ? 'var(--color-accent)' : 'var(--color-border)'}`,
          borderRadius: '10px',
          overflow: 'hidden',
          marginBottom: '1rem',
        }}>
          {/* Toggle header */}
          <button
            onClick={() => { setByokOpen((o) => !o); if (useManaged) setUseManaged(false); }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem',
              padding: '0.85rem 1.1rem',
              background: !useManaged ? 'rgba(127,119,221,0.07)' : 'transparent',
              textAlign: 'left', cursor: 'pointer',
            }}
          >
            <div style={{
              width: 14, height: 14, borderRadius: '50%',
              border: `2px solid ${!useManaged ? 'var(--color-accent)' : 'var(--color-border)'}`,
              background: !useManaged ? 'var(--color-accent)' : 'transparent',
              flexShrink: 0,
            }} />
            <span style={{ fontWeight: 600, fontSize: '0.9rem', flex: 1 }}>
              Bring your own API key
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              {byokOpen ? '▲' : '▼'}
            </span>
          </button>

          {/* BYOK fields */}
          {(byokOpen || !useManaged) && (
            <div style={{ padding: '0 1.1rem 1rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: '0.85rem', marginTop: '0.1rem' }}>
                Your keys are stored only in your browser and never sent to our servers.
              </p>

              {/* Provider buttons */}
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Provider</label>
              <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.85rem' }}>
                {BYOK_PROVIDERS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => { setUseManaged(false); handleProviderChange(p.value); }}
                    style={{
                      flex: 1, padding: '0.4rem 0.4rem',
                      borderRadius: '6px', fontSize: '0.75rem',
                      fontWeight: provider === p.value && !useManaged ? 600 : 400,
                      border: `1.5px solid ${provider === p.value && !useManaged ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      background: provider === p.value && !useManaged ? 'rgba(127,119,221,0.1)' : 'transparent',
                      color: provider === p.value && !useManaged ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* API Key */}
              {needsApiKey && (
                <div style={{ marginBottom: '0.85rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>API Key</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={provider === 'claude' ? 'sk-ant-...' : 'sk-or-...'}
                    style={{
                      width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-bg-card)', fontSize: '0.85rem',
                    }}
                  />
                </div>
              )}

              {/* Base URL */}
              {showBaseUrl && (
                <div style={{ marginBottom: '0.85rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Base URL</label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="http://localhost:11434"
                    style={{
                      width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-bg-card)', fontSize: '0.85rem',
                    }}
                  />
                </div>
              )}

              {/* Model */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Model</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={getDefaultModel(provider)}
                  style={{
                    width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-card)', fontSize: '0.85rem',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Test result */}
        {testResult && (
          <div style={{
            padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '1rem',
            fontSize: '0.8rem',
            background: testResult.ok ? 'rgba(45,212,168,0.1)' : 'rgba(249,112,102,0.1)',
            color: testResult.ok ? '#2dd4a8' : '#f97066',
            border: `1px solid ${testResult.ok ? 'rgba(45,212,168,0.2)' : 'rgba(249,112,102,0.2)'}`,
          }}>
            {testResult.ok ? `✓ Connected — ${testResult.message}` : `✗ ${testResult.message}`}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn-primary"
            onClick={handleSave}
            style={{ flex: 1, fontSize: '0.85rem' }}
          >
            {saved ? 'Saved ✓' : 'Save'}
          </button>
          <button
            className="btn-secondary"
            onClick={handleTest}
            disabled={testing}
            style={{ flex: 1, fontSize: '0.85rem', opacity: testing ? 0.6 : 1 }}
          >
            {testing ? 'Testing…' : 'Test Connection'}
          </button>
        </div>

      </div>
    </div>
  );
}
