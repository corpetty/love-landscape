import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase, PARAM_COLUMNS } from '../data/supabase.js';
import TerrainView from './TerrainView.jsx';

const ADMIN_HASH = '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'; // sha256("password")
const AUTH_KEY = 'love-landscape-admin-auth';

const PARAM_LABELS = [
  'Friendship depth', 'Romantic bond', 'Tender middle', 'Physical comfort',
  'Grounding need', 'Structure need', 'Ambiguity comfort', 'Openness', 'Self-knowledge',
];

const DEMOGRAPHIC_FIELDS = [
  { key: 'age_range', label: 'Age Range' },
  { key: 'relationship_structure', label: 'Relationship Structure' },
  { key: 'gender_identity', label: 'Gender Identity' },
];

const ACCENT = '#7F77DD';

export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(true);

  const [count, setCount] = useState(0);
  const [meanParams, setMeanParams] = useState(null);
  const [histograms, setHistograms] = useState({});
  const [demographics, setDemographics] = useState({});

  // Check stored auth
  useEffect(() => {
    try {
      if (localStorage.getItem(AUTH_KEY) === 'true') setAuthenticated(true);
    } catch { /* ignore */ }
  }, []);

  // Fetch data when authenticated
  useEffect(() => {
    if (!authenticated || !supabase) return;
    fetchAll();
  }, [authenticated]);

  async function checkPassword() {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    if (hashHex === ADMIN_HASH) {
      try { localStorage.setItem(AUTH_KEY, 'true'); } catch { /* ignore */ }
      setAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Incorrect password.');
    }
  }

  async function fetchAll() {
    setLoading(true);

    // Count
    const { data: countData } = await supabase.rpc('get_submission_count');
    setCount(countData ?? 0);

    // Means
    const { data: meansData } = await supabase.rpc('get_param_means');
    if (meansData) {
      const row = Array.isArray(meansData) ? meansData[0] : meansData;
      if (row) {
        setMeanParams(PARAM_COLUMNS.map(col => row[col] ?? 0.5));
      }
    }

    // Histograms for each param
    const hists = {};
    for (const col of PARAM_COLUMNS) {
      const { data } = await supabase.rpc('get_param_histogram', { param_name: col });
      if (data) {
        hists[col] = data.map(d => ({
          range: `${(d.bin_start * 100).toFixed(0)}%`,
          count: d.count,
        }));
      }
    }
    setHistograms(hists);

    // Demographics
    const demos = {};
    for (const field of DEMOGRAPHIC_FIELDS) {
      const { data } = await supabase.rpc('get_demographic_breakdown', { field: field.key });
      if (data) demos[field.key] = data;
    }
    setDemographics(demos);

    setLoading(false);
  }

  if (!supabase) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
      Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local
    </div>;
  }

  if (!authenticated) {
    return (
      <div style={{ maxWidth: '360px', margin: '0 auto', paddingTop: '6rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>Research Dashboard</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setAuthError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && checkPassword()}
            placeholder="Password"
            style={{
              flex: 1,
              padding: '0.6rem 0.85rem',
              borderRadius: '6px',
              border: `1px solid ${authError ? '#f97066' : 'var(--color-border)'}`,
              background: 'var(--color-bg-card)',
              fontSize: '0.95rem',
            }}
          />
          <button className="btn-primary" onClick={checkPassword}>Enter</button>
        </div>
        {authError && <p style={{ color: '#f97066', fontSize: '0.85rem', marginTop: '0.5rem' }}>{authError}</p>}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.6rem' }}>Research Dashboard</h1>
        <button className="btn-secondary" onClick={() => window.location.href = '/'} style={{ fontSize: '0.8rem' }}>
          Back to app
        </button>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '3rem' }}>Loading data...</p>
      ) : (
        <>
          {/* Count */}
          <div className="card" style={{ textAlign: 'center', marginBottom: '2rem', padding: '1.5rem' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: ACCENT, fontFamily: 'var(--font-mono)' }}>
              {count.toLocaleString()}
            </div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              total contributions
            </div>
          </div>

          {/* Population terrain */}
          {meanParams && (
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '0.75rem' }}>Average Population Terrain</h2>
              <TerrainView params={meanParams} />
            </div>
          )}

          {/* Parameter distributions */}
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Parameter Distributions</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}>
            {PARAM_COLUMNS.map((col, i) => (
              <div key={col} className="card" style={{ padding: '1rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontFamily: 'var(--font-body)', fontWeight: 600, marginBottom: '0.5rem' }}>
                  {PARAM_LABELS[i]}
                </h4>
                {histograms[col] ? (
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={histograms[col]}>
                      <XAxis dataKey="range" tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--color-bg-card)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                        }}
                      />
                      <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                        {histograms[col].map((_, j) => (
                          <Cell key={j} fill={j < 5 ? '#2dd4a8' : '#f97066'} opacity={0.7} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No data</p>
                )}
              </div>
            ))}
          </div>

          {/* Demographics */}
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Demographics</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}>
            {DEMOGRAPHIC_FIELDS.map((field) => (
              <div key={field.key} className="card" style={{ padding: '1rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontFamily: 'var(--font-body)', fontWeight: 600, marginBottom: '0.5rem' }}>
                  {field.label}
                </h4>
                {demographics[field.key] ? (
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={demographics[field.key]} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="value"
                        type="category"
                        width={120}
                        tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--color-bg-card)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                        }}
                      />
                      <Bar dataKey="count" fill={ACCENT} radius={[0, 3, 3, 0]} opacity={0.8} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No data</p>
                )}
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', padding: '1rem' }}>
            Raw data export available via Python/Jupyter with the service role key.
          </div>
        </>
      )}
    </div>
  );
}
