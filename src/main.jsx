import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/global.css';
import { initJourney } from './data/journey.js';
import { flushCreateQueue } from './data/resultsClient.js';

// Must run before React mounts: consumes ?variant=/?src= before App's URL effects.
initJourney();
flushCreateQueue();

createRoot(document.getElementById('root')).render(<App />);
