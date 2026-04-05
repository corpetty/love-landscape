import React, { useState } from 'react';
import TerrainView from './TerrainView.jsx';
import ContourView from './ContourView.jsx';
import RadarView from './RadarView.jsx';

const TABS = [
  { key: '3d', label: '3D Terrain' },
  { key: 'contour', label: '2D Contour' },
  { key: 'radar', label: 'Radar' },
];

export default function VisualizationTabs({ params, partnerParams, view }) {
  const [activeTab, setActiveTab] = useState('3d');

  return (
    <div>
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '0.2rem',
        marginBottom: '0.75rem',
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '3px',
        width: 'fit-content',
        maxWidth: '100%',
        margin: '0 auto 0.75rem',
        flexWrap: 'wrap',
      }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            aria-pressed={activeTab === tab.key}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: activeTab === tab.key ? 600 : 400,
              background: activeTab === tab.key ? 'var(--color-accent)' : 'transparent',
              color: activeTab === tab.key ? '#fff' : 'var(--color-text-muted)',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active visualization */}
      {activeTab === '3d' && (
        <TerrainView params={params} partnerParams={partnerParams} view={view} />
      )}
      {activeTab === 'contour' && (
        <ContourView params={params} partnerParams={partnerParams} view={view} />
      )}
      {activeTab === 'radar' && (
        <RadarView params={params} partnerParams={partnerParams} view={view} />
      )}
    </div>
  );
}
