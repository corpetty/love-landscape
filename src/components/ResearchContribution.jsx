import React, { useState, useEffect } from 'react';
import { supabase, submitLandscape } from '../data/supabase.js';

const STORAGE_KEY = 'love-landscape-contributed';

const AGE_RANGES = ['18-25', '26-35', '36-45', '46-55', '56+'];

const RELATIONSHIP_OPTIONS = [
  { value: 'monogamous',       label: 'Monogamous' },
  { value: 'enm-polyamorous',  label: 'ENM / Polyamorous' },
  { value: 'single-exploring', label: 'Single / Exploring' },
  { value: 'other',            label: 'Other' },
];

const ATTACHMENT_OPTIONS = [
  { value: 'secure',           label: 'Secure' },
  { value: 'anxious',          label: 'Anxious' },
  { value: 'avoidant',         label: 'Avoidant' },
  { value: 'fearful-avoidant', label: 'Fearful-avoidant' },
];

const RELATIONSHIP_COUNT_OPTIONS = [
  { value: 'exploring', label: 'Still exploring' },
  { value: '1-2',       label: '1–2 significant' },
  { value: '3-5',       label: '3–5' },
  { value: '6+',        label: '6 or more' },
];

/**
 * @param {Object}   props
 * @param {number[]} props.params        - All 13 terrain parameters
 * @param {string}   [props.aiReading]   - The AI reading text if one was generated
 */
export default function ResearchContribution({ params, aiReading }) {
  const [contributed, setContributed]   = useState(false);
  const [expanded, setExpanded]         = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [submitted, setSubmitted]       = useState(false);
  const [error, setError]               = useState(null);

  // Core demographics
  const [ageRange, setAgeRange]                     = useState(null);
  const [relationshipStructure, setRelStructure]    = useState(null);
  const [genderIdentity, setGenderIdentity]         = useState('');

  // Extended demographics
  const [attachmentStyle, setAttachmentStyle]       = useState(null);
  const [relationshipCount, setRelationshipCount]   = useState(null);

  // AI reading consent
  const [shareReading, setShareReading]             = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) setContributed(true);
    } catch { /* ignore */ }
  }, []);

  if (!supabase) return null;

  if (contributed || submitted) {
    return (
      <div style={{ marginTop: '2rem', textAlign: 'center', padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
        Thank you for contributing to the research.
      </div>
    );
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    const demographics = {};
    if (ageRange)                    demographics.ageRange              = ageRange;
    if (relationshipStructure)       demographics.relationshipStructure = relationshipStructure;
    if (genderIdentity.trim())       demographics.genderIdentity        = genderIdentity.trim();
    if (attachmentStyle)             demographics.attachmentStyle       = attachmentStyle;
    if (relationshipCount)           demographics.relationshipCount     = relationshipCount;
    if (shareReading && aiReading) {
      demographics.aiReadingConsented = true;
      demographics.aiReadingText      = aiReading;
    }

    const result = await submitLandscape(params, demographics);

    if (result.error) {
      setError('Something went wrong. Your data was not submitted.');
      setSubmitting(false);
    } else {
      try { localStorage.setItem(STORAGE_KEY, 'true'); } catch { /* ignore */ }
      setSubmitted(true);
      setSubmitting(false);
    }
  }

  return (
    <div style={{ marginTop: '2rem' }}>
      <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Contribute to research</h3>

        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '0.75rem' }}>
          Your landscape can help us understand how people experience intimacy across different relational
          styles. We store only your terrain parameters and any demographics you optionally share.
          We never collect your answers, your name, or your IP address.
        </p>

        {!expanded ? (
          <button className="btn-primary" onClick={() => setExpanded(true)} style={{ fontSize: '0.9rem' }}>
            I'd like to contribute
          </button>
        ) : (
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem', fontStyle: 'italic' }}>
              All fields below are optional. You can contribute with just your terrain data.
            </p>

            {/* Age range */}
            <fieldset style={{ border: 'none', marginBottom: '1rem' }}>
              <legend style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Age range</legend>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {AGE_RANGES.map((r) => (
                  <RadioPill key={r} label={r} selected={ageRange === r} onClick={() => setAgeRange(ageRange === r ? null : r)} />
                ))}
              </div>
            </fieldset>

            {/* Relationship structure */}
            <fieldset style={{ border: 'none', marginBottom: '1rem' }}>
              <legend style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Relationship structure</legend>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {RELATIONSHIP_OPTIONS.map((o) => (
                  <RadioPill key={o.value} label={o.label}
                    selected={relationshipStructure === o.value}
                    onClick={() => setRelStructure(relationshipStructure === o.value ? null : o.value)}
                  />
                ))}
              </div>
            </fieldset>

            {/* Gender identity */}
            <fieldset style={{ border: 'none', marginBottom: '1rem' }}>
              <legend style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Gender identity</legend>
              <input
                type="text"
                value={genderIdentity}
                onChange={(e) => setGenderIdentity(e.target.value)}
                placeholder="Optional — however you identify"
                maxLength={100}
                aria-label="Gender identity"
                style={{
                  width: '100%', maxWidth: '300px',
                  padding: '0.5rem 0.75rem', borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg)', fontSize: '0.9rem',
                }}
              />
            </fieldset>

            {/* Attachment style */}
            <fieldset style={{ border: 'none', marginBottom: '1rem' }}>
              <legend style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                Attachment style
              </legend>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>
                How you generally experience closeness in relationships
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {ATTACHMENT_OPTIONS.map((o) => (
                  <RadioPill key={o.value} label={o.label}
                    selected={attachmentStyle === o.value}
                    onClick={() => setAttachmentStyle(attachmentStyle === o.value ? null : o.value)}
                  />
                ))}
              </div>
            </fieldset>

            {/* Relationship experience */}
            <fieldset style={{ border: 'none', marginBottom: '1rem' }}>
              <legend style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                Relationship experience
              </legend>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>
                Number of significant romantic or intimate relationships
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {RELATIONSHIP_COUNT_OPTIONS.map((o) => (
                  <RadioPill key={o.value} label={o.label}
                    selected={relationshipCount === o.value}
                    onClick={() => setRelationshipCount(relationshipCount === o.value ? null : o.value)}
                  />
                ))}
              </div>
            </fieldset>

            {/* AI reading consent — only shown when a reading exists */}
            {aiReading && (
              <fieldset style={{ border: 'none', marginBottom: '1.25rem' }}>
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
                  padding: '0.75rem', borderRadius: '8px',
                  background: 'rgba(127,119,221,0.06)',
                  border: '1px solid rgba(127,119,221,0.15)',
                }}>
                  <input
                    id="share-reading"
                    type="checkbox"
                    checked={shareReading}
                    onChange={(e) => setShareReading(e.target.checked)}
                    style={{ marginTop: '2px', accentColor: 'var(--color-accent)', flexShrink: 0 }}
                  />
                  <label htmlFor="share-reading" style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.5, cursor: 'pointer' }}>
                    Include my AI landscape reading. This helps us understand how the AI is interpreting
                    different terrain patterns. Your reading is anonymous and linked only to your parameter values.
                  </label>
                </div>
              </fieldset>
            )}

            {error && (
              <p role="alert" style={{ color: '#f97066', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                {error}
              </p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button
                className="btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
                style={{ fontSize: '0.9rem', opacity: submitting ? 0.6 : 1 }}
              >
                {submitting ? 'Submitting…' : 'Contribute'}
              </button>
              <button
                className="btn-secondary"
                onClick={() => setExpanded(false)}
                style={{ fontSize: '0.8rem' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RadioPill({ label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.35rem 0.85rem', borderRadius: '16px', fontSize: '0.8rem',
        border: `1.5px solid ${selected ? 'var(--color-accent)' : 'var(--color-border)'}`,
        background: selected ? 'rgba(127, 119, 221, 0.12)' : 'transparent',
        color: selected ? 'var(--color-accent)' : 'var(--color-text-muted)',
        fontWeight: selected ? 600 : 400,
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}
