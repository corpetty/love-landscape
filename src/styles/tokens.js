export const colors = {
  accent: '#7F77DD',
  accentHover: '#6B63C7',

  dark: {
    bg: '#1a1a18',
    bgCard: '#242422',
    text: '#e8e6e0',
    textMuted: '#9a9890',
    border: 'rgba(255, 255, 255, 0.08)',
    borderSubtle: 'rgba(255, 255, 255, 0.04)',
  },

  light: {
    bg: '#faf9f6',
    bgCard: '#ffffff',
    text: '#2a2a28',
    textMuted: '#6b6960',
    border: 'rgba(0, 0, 0, 0.08)',
    borderSubtle: 'rgba(0, 0, 0, 0.04)',
  },

  terrain: {
    darkBg: '#1a1a18',
    lightBg: '#f5f4f0',
  },

  // Badge colors for recommendations
  badge: {
    sharedGround: '#2dd4a8',
    mutualBoundary: '#a78bfa',
    conversation: '#f97066',
    frontier: '#f472b6',
  },

  // Terrain color ramp: valley → ridge
  ramp: [
    { val: -1.0, color: [0.10, 0.42, 0.55] }, // deep teal
    { val: -0.5, color: [0.18, 0.58, 0.52] }, // teal-green
    { val:  0.0, color: [0.45, 0.68, 0.40] }, // green
    { val:  0.3, color: [0.78, 0.72, 0.30] }, // amber
    { val:  0.6, color: [0.88, 0.52, 0.25] }, // orange
    { val:  1.0, color: [0.85, 0.35, 0.32] }, // warm red-coral
  ],
};

export const fonts = {
  heading: "'EB Garamond', Georgia, 'Times New Roman', serif",
  body: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  mono: "'SF Mono', 'Fira Code', 'Fira Mono', 'Roboto Mono', monospace",
};

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  xxl: '3rem',
};
