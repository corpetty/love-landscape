import React, { useRef, useEffect, useState } from 'react';
import { generateField, generateCombinedField } from '../terrain/fieldGenerator.js';
import { createTerrainScene } from '../terrain/terrainScene.js';
import { createLabelOverlay } from '../terrain/labelOverlay.js';
import FeatureDetailPanel from './FeatureDetailPanel.jsx';

/**
 * Three.js terrain visualization component.
 *
 * Props:
 *   params       - 13-element array for "yours"
 *   partnerParams - 13-element array for "theirs" (optional)
 *   view         - 'yours' | 'theirs' | 'combined'
 */
export default function TerrainView({ params, partnerParams, view = 'yours' }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const labelsRef = useRef(null);
  const rafRef = useRef(null);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [coverage, setCoverage] = useState(null);

  const isDark = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Initialize scene
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const scene = createTerrainScene(canvas, container, isDark);
    sceneRef.current = scene;

    const labels = createLabelOverlay(container);
    labelsRef.current = labels;

    // Feature click handler
    scene.setOnFeatureClick((feature) => {
      setSelectedFeature(feature);
    });

    // Update labels in sync with render
    function updateLabels() {
      rafRef.current = requestAnimationFrame(updateLabels);
      labels.update(scene.projectToScreen);
    }
    updateLabels();

    return () => {
      cancelAnimationFrame(rafRef.current);
      labels.dispose();
      scene.dispose();
      sceneRef.current = null;
    };
  }, [isDark]);

  // Update field when params or view change
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !params) return;

    let fieldData;
    if (view === 'theirs' && partnerParams) {
      fieldData = generateField(partnerParams);
    } else if (view === 'combined' && partnerParams) {
      fieldData = generateCombinedField(params, partnerParams);
    } else {
      fieldData = generateField(params);
    }

    scene.updateField(fieldData.field, fieldData.mappedness);

    // Calculate coverage
    if (fieldData.mappedness) {
      let mapped = 0;
      let total = 0;
      for (let i = 0; i < fieldData.mappedness.length; i++) {
        // Only count cells within the circular boundary
        const N = Math.sqrt(fieldData.mappedness.length);
        const gi = i % N;
        const gj = Math.floor(i / N);
        const nx = (gi / (N - 1)) * 2 - 1;
        const ny = (gj / (N - 1)) * 2 - 1;
        if (nx * nx + ny * ny <= 1) {
          total++;
          if (fieldData.mappedness[i] > 0.5) mapped++;
        }
      }
      setCoverage(total > 0 ? Math.round((mapped / total) * 100) : 0);
    }
  }, [params, partnerParams, view]);

  // Get active params for the detail panel
  const activeParams = view === 'theirs' && partnerParams ? partnerParams : params;

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        position: 'relative',
        touchAction: 'none',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', cursor: 'pointer' }}
      />

      {/* Coverage badge */}
      {coverage !== null && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          padding: '0.25rem 0.6rem',
          borderRadius: '12px',
          fontSize: '0.7rem',
          color: '#fff',
          fontFamily: 'var(--font-mono)',
          zIndex: 15,
          opacity: 0.8,
        }}>
          {coverage}% explored
        </div>
      )}

      {/* Feature detail panel */}
      <FeatureDetailPanel
        feature={selectedFeature}
        params={activeParams}
        onClose={() => setSelectedFeature(null)}
      />
    </div>
  );
}
