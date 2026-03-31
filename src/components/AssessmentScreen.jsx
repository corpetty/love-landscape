import React, { useState, useRef, useEffect } from 'react';
import { questions } from '../data/questions.js';

export default function AssessmentScreen({ onComplete, onBack }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [contextAnswers, setContextAnswers] = useState({});
  const [fadeClass, setFadeClass] = useState('fade-in');
  const containerRef = useRef(null);

  const q = questions[current];
  const progress = (current + 1) / questions.length;

  function setAnswer(value) {
    setAnswers((prev) => ({ ...prev, [q.id]: value }));
  }

  function setContext(value) {
    setContextAnswers((prev) => ({ ...prev, [q.id]: value }));
  }

  function transitionTo(nextIdx) {
    setFadeClass('fade-out');
    setTimeout(() => {
      setCurrent(nextIdx);
      setFadeClass('fade-in');
    }, 200);
  }

  function next() {
    if (current < questions.length - 1) {
      transitionTo(current + 1);
    } else {
      onComplete(answers, contextAnswers);
    }
  }

  function back() {
    if (current > 0) transitionTo(current - 1);
    else if (onBack) onBack();
  }

  // Keyboard navigation
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Enter' && !(q.type === 'scenario' && answers[q.id] === undefined)) {
        next();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const currentAnswer = answers[q.id];
  const currentContext = contextAnswers[q.id] || '';

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto', paddingTop: '2rem' }}>
      {/* Progress bar */}
      <div className="progress-bar" style={{ marginBottom: '2rem' }}>
        <div className="progress-bar__fill" style={{ width: `${progress * 100}%` }} />
      </div>

      <div ref={containerRef} className={fadeClass} style={{
        transition: 'opacity 0.2s ease, transform 0.2s ease',
      }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
          Question {current + 1} of {questions.length}
        </p>

        <h2 style={{ fontSize: '1.35rem', marginBottom: '0.5rem', lineHeight: 1.4 }}>
          {q.text}
        </h2>

        {/* Helper text */}
        {q.helperText && (
          <p style={{
            color: 'var(--color-text-muted)',
            fontSize: '0.85rem',
            lineHeight: 1.6,
            marginBottom: '1.25rem',
            fontStyle: 'italic',
            opacity: 0.8,
          }}>
            {q.helperText}
          </p>
        )}

        {q.type === 'slider' ? (
          <SliderInput
            key={q.id}
            value={currentAnswer ?? 0.5}
            onChange={setAnswer}
            left={q.left}
            right={q.right}
          />
        ) : (
          <ScenarioInput
            key={q.id}
            options={q.options}
            selected={currentAnswer}
            onSelect={setAnswer}
          />
        )}

        {/* Context textarea */}
        <div style={{ marginTop: '1.25rem' }}>
          <textarea
            value={currentContext}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Anything you'd like to add about your answer? (optional)"
            rows={2}
            style={{
              width: '100%',
              padding: '0.6rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg-card)',
              color: 'var(--color-text)',
              fontSize: '0.85rem',
              lineHeight: 1.5,
              resize: 'vertical',
              fontFamily: 'inherit',
              opacity: 0.7,
              transition: 'opacity 0.15s',
            }}
            onFocus={(e) => { e.currentTarget.style.opacity = '1'; }}
            onBlur={(e) => { if (!e.currentTarget.value) e.currentTarget.style.opacity = '0.7'; }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
        <button
          className="btn-secondary"
          onClick={back}
          style={{ opacity: 1 }}
        >
          Back
        </button>
        <button
          className="btn-primary"
          onClick={next}
          disabled={q.type === 'scenario' && currentAnswer === undefined}
          style={{ opacity: q.type === 'scenario' && currentAnswer === undefined ? 0.4 : 1 }}
        >
          {current === questions.length - 1 ? 'See your landscape' : 'Next'}
        </button>
      </div>
    </div>
  );
}

function SliderInput({ value, onChange, left, right }) {
  return (
    <div>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          width: '100%',
          accentColor: 'var(--color-accent)',
          cursor: 'pointer',
          height: '6px',
        }}
      />
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.8rem',
        color: 'var(--color-text-muted)',
        marginTop: '0.35rem',
      }}>
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}

function ScenarioInput({ options, selected, onSelect }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {options.map((opt, i) => {
        const isSelected = selected === opt.value;
        return (
          <button
            key={i}
            onClick={() => onSelect(opt.value)}
            style={{
              textAlign: 'left',
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              border: `1.5px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}`,
              background: isSelected ? 'rgba(127, 119, 221, 0.08)' : 'var(--color-bg-card)',
              color: 'var(--color-text)',
              fontSize: '0.95rem',
              lineHeight: 1.5,
              transition: 'border-color 0.15s, background 0.15s, transform 0.1s',
            }}
            onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.borderColor = 'rgba(127,119,221,0.3)'; }}
            onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--color-border)'; }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
