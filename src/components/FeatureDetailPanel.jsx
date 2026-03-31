import React from 'react';
import { FEATURE_DEFINITIONS, ARTICLE_URL } from '../data/articleContent.js';

export default function FeatureDetailPanel({ feature, params, onClose }) {
  if (!feature) return null;

  const def = FEATURE_DEFINITIONS[feature.name];
  const paramValue = params?.[feature.paramIndex];

  return (
    <div style={{
      position: 'absolute',
      bottom: '12px',
      left: '12px',
      right: '12px',
      background: 'var(--color-bg-card)',
      border: '1px solid var(--color-border)',
      borderRadius: '10px',
      padding: '1rem 1.15rem',
      zIndex: 20,
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
      maxHeight: '45%',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '0.5rem',
      }}>
        <div>
          <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.15rem' }}>
            {feature.name}
          </h4>
          <span style={{
            fontSize: '0.7rem',
            padding: '0.15rem 0.5rem',
            borderRadius: '10px',
            background: feature.isRidge
              ? 'rgba(249, 112, 102, 0.15)'
              : 'rgba(45, 212, 168, 0.15)',
            color: feature.isRidge ? '#f97066' : '#2dd4a8',
            fontWeight: 600,
          }}>
            {feature.isRidge ? 'Ridge (barrier)' : 'Valley (attractor)'}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            fontSize: '1.1rem',
            lineHeight: 1,
            padding: '0.2rem 0.4rem',
            color: 'var(--color-text-muted)',
          }}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Your value */}
      {paramValue !== undefined && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '0.75rem',
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Your value:</span>
          <div style={{
            flex: 1,
            height: '4px',
            background: 'var(--color-border)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${paramValue * 100}%`,
              height: '100%',
              background: feature.isRidge ? '#f97066' : '#2dd4a8',
              borderRadius: '2px',
            }} />
          </div>
          <span style={{
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-text-muted)',
          }}>
            {Math.round(paramValue * 100)}%
          </span>
        </div>
      )}

      {/* Definition */}
      {def ? (
        <>
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--color-text-muted)',
            lineHeight: 1.65,
            marginBottom: '0.5rem',
          }}>
            {def.longDef}
          </p>
        </>
      ) : (
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.65 }}>
          {feature.isRidge
            ? 'A ridge represents an energy barrier — a region that takes effort to cross.'
            : 'A valley represents a place where relationships naturally settle.'}
        </p>
      )}

      <a
        href={ARTICLE_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: '0.75rem',
          color: 'var(--color-accent)',
          textDecoration: 'underline',
          textUnderlineOffset: '2px',
        }}
      >
        Learn more in the article →
      </a>
    </div>
  );
}
