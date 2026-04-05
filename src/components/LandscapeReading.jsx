import React, { useState } from 'react';
import { generateReading, generateSummary } from '../data/interpretation.js';
import { ARTICLE_URL } from '../data/articleContent.js';

export default function LandscapeReading({ params }) {
  const [expanded, setExpanded] = useState(false);
  const reading = generateReading(params);
  const summary = generateSummary(params);

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Your Reading</h3>
        <a
          href={ARTICLE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: '0.75rem',
            color: 'var(--color-text-muted)',
            textDecoration: 'underline',
            textUnderlineOffset: '2px',
            opacity: 0.7,
          }}
        >
          Read the article
        </a>
      </div>
      <p style={{
        color: 'var(--color-text-muted)',
        fontSize: '0.95rem',
        lineHeight: 1.7,
        fontStyle: 'italic',
        marginBottom: '1rem',
      }}>
        {summary}
      </p>

      <button
        className="btn-secondary"
        onClick={() => setExpanded(!expanded)}
        style={{ fontSize: '0.8rem', marginBottom: expanded ? '1rem' : 0 }}
      >
        {expanded ? 'Hide details' : 'Show parameter breakdown'}
      </button>

      {expanded && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          marginTop: '0.5rem',
          maxHeight: '60vh',
          overflowY: 'auto',
        }}>
          {reading.map((item, i) => (
            <ParameterCard key={i} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function ParameterCard({ item }) {
  const [showDef, setShowDef] = useState(false);

  return (
    <div className="card" style={{ padding: '0.85rem 1rem' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.4rem',
      }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
          {item.short}
          <button
            onClick={() => setShowDef(!showDef)}
            title={showDef ? 'Hide definition' : 'What is this?'}
            style={{
              marginLeft: '0.4rem',
              fontSize: '0.7rem',
              color: 'var(--color-accent)',
              textDecoration: 'underline',
              textUnderlineOffset: '2px',
              opacity: 0.8,
            }}
          >
            {showDef ? 'hide' : '?'}
          </button>
        </span>
        <span style={{
          fontSize: '0.75rem',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-mono)',
        }}>
          {Math.round(item.value * 100)}%
        </span>
      </div>

      {/* Definition */}
      {showDef && (
        <p style={{
          fontSize: '0.8rem',
          color: 'var(--color-accent)',
          lineHeight: 1.5,
          marginBottom: '0.5rem',
          fontStyle: 'italic',
          opacity: 0.85,
        }}>
          {item.definition}
        </p>
      )}

      {/* Bar */}
      <div style={{
        width: '100%',
        height: '4px',
        background: 'var(--color-border)',
        borderRadius: '2px',
        marginBottom: '0.5rem',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${item.value * 100}%`,
          height: '100%',
          background: item.value > 0.5 ? '#2dd4a8' : '#f97066',
          borderRadius: '2px',
          transition: 'width 0.5s ease',
        }} />
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
        {item.text}
      </p>
    </div>
  );
}
