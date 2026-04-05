import React, { useState, useRef, useCallback } from 'react';

/**
 * Renders AI reading text with structured sections.
 *
 * Expects markdown-style `## Section Title` headers and `**bold**` phrases.
 * Falls back to plain pre-wrap rendering if no headers are found.
 */
export default function ReadingRenderer({ text }) {
  const sections = parseSections(text);
  const sectionRefs = useRef({});

  // If no sections found, fall back to plain rendering
  if (sections.length <= 1 && !sections[0]?.title) {
    return (
      <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
        {text}
      </div>
    );
  }

  function scrollTo(idx) {
    sectionRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div>
      {/* Section nav */}
      {sections.length > 2 && (
        <div style={{
          display: 'flex', gap: '0.4rem', flexWrap: 'wrap',
          marginBottom: '0.75rem', paddingBottom: '0.6rem',
          borderBottom: '1px solid var(--color-border)',
        }}>
          {sections.map((s, i) => s.title && (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              style={{
                fontSize: '0.72rem', fontWeight: 600,
                padding: '0.2rem 0.6rem', borderRadius: '12px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-card)',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
              }}
            >
              {s.title}
            </button>
          ))}
        </div>
      )}

      {/* Sections */}
      {sections.map((section, i) => (
        <SectionCard
          key={i}
          section={section}
          defaultOpen={true}
          refCallback={(el) => { sectionRefs.current[i] = el; }}
        />
      ))}
    </div>
  );
}

function SectionCard({ section, defaultOpen, refCallback }) {
  const [open, setOpen] = useState(defaultOpen);

  if (!section.title) {
    // Preamble text before first heading
    return section.body ? (
      <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: 1.75, marginBottom: '0.5rem' }}>
        <RichText text={section.body} />
      </div>
    ) : null;
  }

  return (
    <div
      ref={refCallback}
      style={{
        marginBottom: '0.6rem',
        borderRadius: '8px',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
        scrollMarginTop: '1rem',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', textAlign: 'left',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0.65rem 0.85rem',
          background: open ? 'rgba(127,119,221,0.06)' : 'var(--color-bg-card)',
          fontSize: '0.88rem', fontWeight: 600,
          color: 'var(--color-text)',
          cursor: 'pointer',
          transition: 'background 0.15s',
        }}
      >
        {section.title}
        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && (
        <div style={{
          padding: '0.6rem 0.85rem 0.75rem',
          fontSize: '0.88rem',
          color: 'var(--color-text-muted)',
          lineHeight: 1.75,
        }}>
          <RichText text={section.body} />
        </div>
      )}
    </div>
  );
}

/**
 * Renders text with **bold** support. No other markdown.
 */
function RichText({ text }) {
  if (!text) return null;

  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} style={{ color: 'var(--color-text)', fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

/**
 * Parse reading text into sections.
 * Splits on `## Title` lines. Returns [{ title: string|null, body: string }]
 */
function parseSections(text) {
  if (!text) return [{ title: null, body: '' }];

  const lines = text.split('\n');
  const sections = [];
  let current = { title: null, body: '' };

  for (const line of lines) {
    const headerMatch = line.match(/^##\s+(.+)/);
    if (headerMatch) {
      // Push previous section
      if (current.title || current.body.trim()) {
        sections.push({ ...current, body: current.body.trim() });
      }
      current = { title: headerMatch[1].trim(), body: '' };
    } else {
      current.body += (current.body ? '\n' : '') + line;
    }
  }

  // Push last section
  if (current.title || current.body.trim()) {
    sections.push({ ...current, body: current.body.trim() });
  }

  return sections.length > 0 ? sections : [{ title: null, body: text }];
}
