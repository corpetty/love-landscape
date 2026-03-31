import React, { useState, useEffect } from 'react';
import { loadLLMConfig, saveLLMConfig, getDefaultModel, testConnection } from '../data/llmClient.js';

const PROVIDERS = [
  { value: 'ollama', label: 'Ollama (local)' },
  { value: 'claude', label: 'Claude API' },
  { value: 'openrouter', label: 'OpenRouter' },
];

export default function SettingsPanel({ onClose }) {
  const [provider, setProvider] = useState('ollama');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('http://localhost:11434');
  const [model, setModel] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const config = loadLLMConfig();
    if (config) {
      setProvider(config.provider || 'ollama');
      setApiKey(config.apiKey || '');
      setBaseUrl(config.baseUrl || 'http://localhost:11434');
      setModel(config.model || '');
    }
  }, []);

  function handleProviderChange(p) {
    setProvider(p);
    setModel(getDefaultModel(p));
    setTestResult(null);
  }

  function handleSave() {
    saveLLMConfig({ provider, apiKey, baseUrl, model });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    const config = { provider, apiKey, baseUrl, model };
    const result = await testConnection(config);
    setTestResult(result);
    setTesting(false);
  }

  const needsApiKey = provider === 'claude' || provider === 'openrouter';
  const showBaseUrl = provider === 'ollama';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)',
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '1.5rem',
        width: '90%',
        maxWidth: '420px',
        maxHeight: '85vh',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem' }}>LLM Settings</h3>
          <button onClick={onClose} style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)', padding: '0.2rem' }}>×</button>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '1rem' }}>
          Configure an AI model for deeper landscape readings. Your keys are stored only in your browser.
        </p>

        {/* Provider */}
        <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
          Provider
        </label>
        <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '1rem' }}>
          {PROVIDERS.map((p) => (
            <button
              key={p.value}
              onClick={() => handleProviderChange(p.value)}
              style={{
                flex: 1,
                padding: '0.4rem 0.5rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: provider === p.value ? 600 : 400,
                border: `1.5px solid ${provider === p.value ? 'var(--color-accent)' : 'var(--color-border)'}`,
                background: provider === p.value ? 'rgba(127,119,221,0.1)' : 'transparent',
                color: provider === p.value ? 'var(--color-accent)' : 'var(--color-text-muted)',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* API Key */}
        {needsApiKey && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider === 'claude' ? 'sk-ant-...' : 'sk-or-...'}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-card)',
                fontSize: '0.85rem',
              }}
            />
          </div>
        )}

        {/* Base URL */}
        {showBaseUrl && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              Base URL
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://localhost:11434"
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-card)',
                fontSize: '0.85rem',
              }}
            />
          </div>
        )}

        {/* Model */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
            Model
          </label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={getDefaultModel(provider)}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg-card)',
              fontSize: '0.85rem',
              fontFamily: 'var(--font-mono)',
            }}
          />
        </div>

        {/* Test result */}
        {testResult && (
          <div style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            marginBottom: '1rem',
            fontSize: '0.8rem',
            background: testResult.ok ? 'rgba(45,212,168,0.1)' : 'rgba(249,112,102,0.1)',
            color: testResult.ok ? '#2dd4a8' : '#f97066',
            border: `1px solid ${testResult.ok ? 'rgba(45,212,168,0.2)' : 'rgba(249,112,102,0.2)'}`,
          }}>
            {testResult.ok ? '✓ Connected' : `✗ ${testResult.message}`}
          </div>
        )}

        {/* Buttons */}
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
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
      </div>
    </div>
  );
}
