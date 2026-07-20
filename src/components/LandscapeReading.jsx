import React, { useState } from 'react';
import { generateReading, generateSummary, scoreBand } from '../data/interpretation.js';
import { ARTICLE_URL } from '../data/articleContent.js';
import { SCIENCE_MAP, SCIENCE_TIERS } from '../data/scienceMap.js';

export default function LandscapeReading({ params, hideTitle = false, onScience }) {
  const [expanded, setExpanded] = useState(false);
  const reading = generateReading(params);
  const summary = generateSummary(params);

  return (
    <div style={{ marginTop: hideTitle ? 0 : '1.5rem' }}>
      {!hideTitle && (
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
      )}
      <p style={{
        color: 'var(--color-text-muted)',
        fontSize: '0.95rem',
        lineHeight: 1.7,
        fontStyle: 'italic',
        marginBottom: '1rem',
      }}>
        {summary}
      </p>

      <p style={{
        color: 'var(--color-text-muted)',
        fontSize: '0.75rem',
        lineHeight: 1.6,
        opacity: 0.7,
        marginBottom: '1rem',
      }}>
        A structured reflection, not a clinical or psychometric test. Each dimension draws
        on established research (attachment, need-for-closure, playfulness, and more) but is
        measured with only a question or two — treat it as a mirror for conversation, not a
        verdict. <a
          href={ARTICLE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: '2px' }}
        >More on the science</a>.
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
            <ParameterCard key={i} item={item} index={i} onScience={onScience} />
          ))}
        </div>
      )}
    </div>
  );
}

function ParameterCard({ item, index, onScience }) {
  const [showDef, setShowDef] = useState(false);
  const science = SCIENCE_MAP[index];
  const band = scoreBand(item.value);

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

      {/* Science grounding — the construct this maps to and how this score reads in it */}
      {science && (
        <p style={{
          fontSize: '0.75rem',
          color: 'var(--color-text-muted)',
          lineHeight: 1.55,
          marginBottom: '0.5rem',
        }}>
          <span style={{ opacity: 0.7 }}>🔬 </span>
          Maps to <strong style={{ color: 'var(--color-text)', fontWeight: 600 }}>{science.instrument}</strong>
          {' '}— you read as <em>{science.maps[band]}</em>.
          {' '}
          <span
            title={SCIENCE_TIERS[science.tier].blurb}
            style={{
              display: 'inline-block',
              fontSize: '0.62rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              padding: '1px 6px',
              borderRadius: '5px',
              background: 'rgba(127,119,221,0.1)',
              color: 'var(--color-accent)',
              verticalAlign: 'middle',
              whiteSpace: 'nowrap',
            }}
          >
            {SCIENCE_TIERS[science.tier].label}
          </span>
          {onScience && (
            <>
              {' · '}
              <button
                onClick={() => onScience(index)}
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--color-accent)',
                  textDecoration: 'underline',
                  textUnderlineOffset: '2px',
                  whiteSpace: 'nowrap',
                }}
              >
                the science →
              </button>
            </>
          )}
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
