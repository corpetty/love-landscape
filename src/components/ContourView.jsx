import React, { useRef, useEffect } from 'react';
import { generateField, generateCombinedField } from '../terrain/fieldGenerator.js';
import { COLOR_RAMP, FEATURE_LABELS, AXIS_LABELS, GRID_SIZE } from '../terrain/constants.js';

const CONTOUR_LEVELS = [-0.6, -0.3, 0.0, 0.3, 0.6];

function interpolateColor(val) {
  const ramp = COLOR_RAMP;
  if (val <= ramp[0].val) return ramp[0];
  if (val >= ramp[ramp.length - 1].val) return ramp[ramp.length - 1];

  for (let i = 0; i < ramp.length - 1; i++) {
    if (val >= ramp[i].val && val <= ramp[i + 1].val) {
      const t = (val - ramp[i].val) / (ramp[i + 1].val - ramp[i].val);
      return {
        r: ramp[i].r + (ramp[i + 1].r - ramp[i].r) * t,
        g: ramp[i].g + (ramp[i + 1].g - ramp[i].g) * t,
        b: ramp[i].b + (ramp[i + 1].b - ramp[i].b) * t,
      };
    }
  }
  return ramp[0];
}

export default function ContourView({ params, partnerParams, view = 'yours' }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !params) return;

    const displaySize = Math.min(containerRef.current?.clientWidth || 400, 500);
    const dpr = Math.min(window.devicePixelRatio, 2);
    const size = Math.round(displaySize * dpr);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    let fieldData;
    if (view === 'theirs' && partnerParams) {
      fieldData = generateField(partnerParams);
    } else if (view === 'combined' && partnerParams) {
      fieldData = generateCombinedField(params, partnerParams);
    } else {
      fieldData = generateField(params);
    }

    const N = GRID_SIZE;
    const { field, mappedness } = fieldData;
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const bgColor = isDark ? '#1a1a18' : '#f5f4f0';

    // Clear
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);

    // Draw circular clipping
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
    ctx.clip();

    // Draw heatmap
    const imgData = ctx.createImageData(size, size);
    const px = imgData.data;

    for (let py = 0; py < size; py++) {
      for (let ppx = 0; ppx < size; ppx++) {
        const nx = ppx / (size - 1);
        const ny = py / (size - 1);

        // Circular mask
        const cx = nx * 2 - 1;
        const cy = ny * 2 - 1;
        const r2 = cx * cx + cy * cy;

        const gi = Math.round(nx * (N - 1));
        const gj = Math.round(ny * (N - 1));
        const idx = gj * N + gi;

        const offset = (py * size + ppx) * 4;

        if (r2 > 1) {
          // Outside circle — background
          const bg = isDark ? [26, 26, 24] : [245, 244, 240];
          px[offset] = bg[0];
          px[offset + 1] = bg[1];
          px[offset + 2] = bg[2];
          px[offset + 3] = 255;
          continue;
        }

        const val = field[idx] || 0;
        const m = mappedness[idx] || 0;
        const color = interpolateColor(val);

        // Apply mappedness as desaturation
        const gray = 0.3 * color.r + 0.59 * color.g + 0.11 * color.b;
        const effectiveR = color.r * m + gray * (1 - m);
        const effectiveG = color.g * m + gray * (1 - m);
        const effectiveB = color.b * m + gray * (1 - m);

        // Edge fade
        const edgeFade = r2 > 0.8 ? 1 - (r2 - 0.8) / 0.2 : 1;
        const bgC = isDark ? [0.102, 0.102, 0.094] : [0.961, 0.957, 0.941];

        px[offset] = Math.round((effectiveR * edgeFade + bgC[0] * (1 - edgeFade)) * 255);
        px[offset + 1] = Math.round((effectiveG * edgeFade + bgC[1] * (1 - edgeFade)) * 255);
        px[offset + 2] = Math.round((effectiveB * edgeFade + bgC[2] * (1 - edgeFade)) * 255);
        px[offset + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Draw contour lines
    ctx.lineWidth = 1;
    for (const level of CONTOUR_LEVELS) {
      ctx.strokeStyle = isDark
        ? `rgba(255,255,255,${level === 0 ? 0.3 : 0.12})`
        : `rgba(0,0,0,${level === 0 ? 0.25 : 0.1})`;

      ctx.beginPath();
      for (let j = 0; j < N - 1; j++) {
        for (let i = 0; i < N - 1; i++) {
          const idx00 = j * N + i;
          const idx10 = j * N + i + 1;
          const idx01 = (j + 1) * N + i;

          const v00 = field[idx00];
          const v10 = field[idx10];
          const v01 = field[idx01];

          // Check horizontal edge
          if ((v00 - level) * (v10 - level) < 0) {
            const t = (level - v00) / (v10 - v00);
            const x = ((i + t) / (N - 1)) * size;
            const y = (j / (N - 1)) * size;
            ctx.moveTo(x - 0.5, y - 0.5);
            ctx.lineTo(x + 0.5, y + 0.5);
          }
          // Check vertical edge
          if ((v00 - level) * (v01 - level) < 0) {
            const t = (level - v00) / (v01 - v00);
            const x = (i / (N - 1)) * size;
            const y = ((j + t) / (N - 1)) * size;
            ctx.moveTo(x - 0.5, y - 0.5);
            ctx.lineTo(x + 0.5, y + 0.5);
          }
        }
      }
      ctx.stroke();
    }

    ctx.restore();

    // Draw circle border
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

  }, [params, partnerParams, view]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', position: 'relative', borderRadius: '8px', overflow: 'hidden' }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          maxWidth: '500px',
          margin: '0 auto',
          aspectRatio: '1',
        }}
      />
      {/* Feature labels overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '500px', aspectRatio: '1' }}>
          {FEATURE_LABELS.map((feat) => (
            <span
              key={feat.name}
              style={{
                position: 'absolute',
                left: `${feat.x * 100}%`,
                top: `${feat.y * 100}%`,
                transform: 'translate(-50%, -50%)',
                fontSize: '0.65rem',
                fontWeight: 600,
                color: feat.isRidge ? '#f97066' : '#2dd4a8',
                background: feat.isRidge
                  ? 'rgba(249,112,102,0.12)'
                  : 'rgba(45,212,168,0.12)',
                padding: '0.1rem 0.4rem',
                borderRadius: '4px',
                whiteSpace: 'nowrap',
                letterSpacing: '0.02em',
                backdropFilter: 'blur(2px)',
              }}
            >
              {feat.name}
            </span>
          ))}
          {/* Axis labels */}
          {AXIS_LABELS.map((ax) => (
            <span
              key={ax.name}
              style={{
                position: 'absolute',
                left: `${ax.x * 100}%`,
                top: `${ax.y * 100}%`,
                transform: 'translate(-50%, -50%)',
                fontSize: '0.6rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: 'var(--color-text-muted)',
                letterSpacing: '0.06em',
                opacity: 0.5,
              }}
            >
              {ax.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
