import React, { useState, useEffect, useCallback } from 'react';
import IntroScreen from './components/IntroScreen.jsx';
import AssessmentScreen from './components/AssessmentScreen.jsx';
import LoadCodeScreen from './components/LoadCodeScreen.jsx';
import ResultsScreen from './components/ResultsScreen.jsx';
import AboutSection from './components/AboutSection.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import RefiningScreen from './components/RefiningScreen.jsx';
import Footer from './components/Footer.jsx';
import { computeParams } from './data/paramCompute.js';
import { encodeParams, decodeParams } from './data/encoding.js';
import { getEffectiveConfig, adjustParams } from './data/llmClient.js';

const STORAGE_KEY = 'love-landscape-result';

const TITLES = {
  intro: 'Love Landscape — The Shape of Intimacy',
  assessment: 'Assessment — Love Landscape',
  loadCode: 'Load Code — Love Landscape',
  refining: 'Refining — Love Landscape',
  results: 'Your Landscape — Love Landscape',
  about: 'About — Love Landscape',
};

export default function App() {
  // Admin dashboard route
  const isAdmin = new URLSearchParams(window.location.search).get('admin') === 'true';
  if (isAdmin) return <AdminDashboard />;

  const [screen, setScreen] = useState('intro');
  const [params, setParams] = useState(null);
  const [baseParams, setBaseParams] = useState(null); // pre-LLM params
  const [code, setCode] = useState('');
  const [contextAnswers, setContextAnswers] = useState({});
  const [showAbout, setShowAbout] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [refineError, setRefineError] = useState(null);

  // On mount: check URL for ?code= param, or localStorage for saved result
  useEffect(() => {
    const url = new URL(window.location.href);
    const urlCode = url.searchParams.get('code');
    if (urlCode) {
      const decoded = decodeParams(urlCode);
      if (decoded) {
        setParams(decoded);
        setCode(encodeParams(decoded));
        setScreen('results');
        return;
      }
    }

    // Check localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { code: savedCode } = JSON.parse(saved);
        const decoded = decodeParams(savedCode);
        if (decoded) {
          setParams(decoded);
          setCode(savedCode);
          // Don't auto-navigate to results — just make "Continue" available
        }
      }
    } catch { /* ignore */ }
  }, []);

  // Update page title
  useEffect(() => {
    document.title = TITLES[screen] || TITLES.intro;
  }, [screen]);

  // Save to localStorage when results are generated
  useEffect(() => {
    if (code && params) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ code, timestamp: Date.now() }));
      } catch { /* ignore */ }
    }
  }, [code, params]);

  // Update URL when viewing results
  useEffect(() => {
    if (screen === 'results' && code) {
      const url = new URL(window.location.href);
      url.searchParams.set('code', code);
      window.history.replaceState({}, '', url.toString());
    } else if (screen === 'intro') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('code')) {
        url.searchParams.delete('code');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [screen, code]);

  function handleBegin() {
    setScreen('assessment');
  }

  function handleLoadCode() {
    setScreen('loadCode');
  }

  async function handleAssessmentComplete(answers, ctx = {}) {
    const p = computeParams(answers);
    setBaseParams(p);
    setContextAnswers(ctx);

    // Refine with LLM if user provided any context (managed service is always available)
    const config = getEffectiveConfig();
    const hasContext = Object.values(ctx).some(v => v && v.trim());

    if (hasContext) {
      // Show refining screen while LLM adjusts params
      setParams(p); // set base params so refining screen can show them
      setCode(encodeParams(p));
      setScreen('refining');
      setRefineError(null);

      try {
        const { adjustedParams } = await adjustParams(config, p, answers, ctx);
        setParams(adjustedParams);
        setCode(encodeParams(adjustedParams));
        setScreen('results');
      } catch (err) {
        // LLM failed — fall back to base params
        setRefineError(err.message);
        setParams(p);
        setCode(encodeParams(p));
        setScreen('results');
      }
    } else {
      // No LLM or no context — go straight to results with base params
      setParams(p);
      setCode(encodeParams(p));
      setScreen('results');
    }
  }

  function handleSkipRefining() {
    // User wants to skip LLM refinement and see base results
    setParams(baseParams);
    setCode(encodeParams(baseParams));
    setScreen('results');
  }

  function handleCodeLoaded(decodedParams) {
    const c = encodeParams(decodedParams);
    setParams(decodedParams);
    setCode(c);
    setScreen('results');
  }

  function handleReset() {
    setParams(null);
    setBaseParams(null);
    setCode('');
    setRefineError(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    const url = new URL(window.location.href);
    url.searchParams.delete('code');
    window.history.replaceState({}, '', url.toString());
    setScreen('intro');
  }

  const hasSavedResult = Boolean(code && params && screen === 'intro');

  if (showAbout) {
    return (
      <>
        <AboutSection onBack={() => setShowAbout(false)} />
        <Footer onAbout={() => setShowAbout(false)} />
      </>
    );
  }

  let content;
  switch (screen) {
    case 'intro':
      content = (
        <IntroScreen
          onBegin={handleBegin}
          onLoadCode={handleLoadCode}
          onAbout={() => setShowAbout(true)}
          hasSavedResult={hasSavedResult}
          onContinue={() => setScreen('results')}
        />
      );
      break;
    case 'assessment':
      content = <AssessmentScreen onComplete={handleAssessmentComplete} onBack={() => setScreen('intro')} />;
      break;
    case 'loadCode':
      content = <LoadCodeScreen onLoad={handleCodeLoaded} onBack={() => setScreen('intro')} />;
      break;
    case 'refining':
      content = <RefiningScreen onSkip={handleSkipRefining} />;
      break;
    case 'results':
      content = (
        <ResultsScreen
          params={params}
          baseParams={baseParams}
          code={code}
          contextAnswers={contextAnswers}
          refineError={refineError}
          onReset={handleReset}
          onAbout={() => setShowAbout(true)}
          onOpenSettings={() => setShowSettings(true)}
        />
      );
      break;
    default:
      content = null;
  }

  return (
    <>
      {content}
      <Footer onAbout={() => setShowAbout(true)} onSettings={() => setShowSettings(true)} />
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </>
  );
}
