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
 * Split a section body into blocks: paragraphs and bullet lists.
 * Consecutive `- `/`* ` lines become one list; blank lines separate paragraphs;
 * other consecutive lines join into a paragraph (soft wraps).
 * Exported for testing.
 */
export function parseBlocks(text) {
  const blocks = [];
  let para = [];
  let list = [];
  const flushPara = () => { if (para.length) { blocks.push({ type: 'p', text: para.join(' ') }); para = []; } };
  const flushList = () => { if (list.length) { blocks.push({ type: 'ul', items: list.slice() }); list = []; } };

  for (const raw of (text || '').split('\n')) {
    const line = raw.trim();
    const bullet = line.match(/^[-*]\s+(.*)/); // "- " or "* " (space required, so *italic* is safe)
    if (bullet) { flushPara(); list.push(bullet[1]); }
    else if (line === '') { flushPara(); flushList(); }
    else { flushList(); para.push(line); }
  }
  flushPara(); flushList();
  return blocks;
}

/**
 * Tokenize inline markdown: **bold** (may contain *italic*) and *italic*.
 * Non-greedy so multiple spans and inner markers pair correctly.
 * Returns a nested token tree. Exported for testing.
 */
export function tokenizeInline(text) {
  const tokens = [];
  const re = /\*\*([\s\S]+?)\*\*|\*([^*\n]+?)\*/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) tokens.push({ type: 'text', text: text.slice(last, m.index) });
    if (m[1] !== undefined) tokens.push({ type: 'bold', children: tokenizeInline(m[1]) });
    else tokens.push({ type: 'italic', text: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) tokens.push({ type: 'text', text: text.slice(last) });
  return tokens;
}

function renderTokens(tokens, keyPrefix) {
  return tokens.map((t, i) => {
    const key = `${keyPrefix}-${i}`;
    if (t.type === 'bold') {
      return <strong key={key} style={{ color: 'var(--color-text)', fontWeight: 600 }}>{renderTokens(t.children, key)}</strong>;
    }
    if (t.type === 'italic') return <em key={key}>{t.text}</em>;
    return <span key={key}>{t.text}</span>;
  });
}

/**
 * Renders reading text with paragraphs, bullet lists, **bold**, and *italic*.
 */
function RichText({ text }) {
  if (!text) return null;
  const blocks = parseBlocks(text);
  return (
    <>
      {blocks.map((b, i) => b.type === 'ul' ? (
        <ul key={i} style={{ margin: '0.3rem 0 0.6rem', paddingLeft: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          {b.items.map((it, j) => <li key={j}>{renderTokens(tokenizeInline(it), `${i}-${j}`)}</li>)}
        </ul>
      ) : (
        <p key={i} style={{ margin: i === 0 ? '0 0 0.6rem' : '0.6rem 0' }}>{renderTokens(tokenizeInline(b.text), `p${i}`)}</p>
      ))}
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
