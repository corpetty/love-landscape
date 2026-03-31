import { FEATURE_LABELS, AXIS_LABELS } from './constants.js';

export function createLabelOverlay(container) {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;';
  container.style.position = 'relative';
  container.appendChild(wrapper);

  const elements = [];

  // Feature labels
  for (const label of FEATURE_LABELS) {
    const el = document.createElement('div');
    el.textContent = label.name;
    const isTrough = !label.isRidge;
    el.style.cssText = `
      position: absolute;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.02em;
      white-space: nowrap;
      padding: 3px 10px;
      border-radius: 12px;
      transform: translate(-50%, -50%);
      transition: opacity 0.25s ease, transform 0.15s ease;
      color: ${isTrough ? '#2dd4a8' : '#f97066'};
      background: ${isTrough ? 'rgba(45,212,168,0.15)' : 'rgba(249,112,102,0.15)'};
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      box-shadow: 0 1px 6px rgba(0,0,0,0.25);
      z-index: 10;
    `;
    wrapper.appendChild(el);
    elements.push({ el, x: label.x, y: label.y, kind: 'feature' });
  }

  // Axis labels
  for (const label of AXIS_LABELS) {
    const el = document.createElement('div');
    el.textContent = label.name;
    el.style.cssText = `
      position: absolute;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      white-space: nowrap;
      padding: 2px 7px;
      border-radius: 8px;
      transform: translate(-50%, -50%);
      transition: opacity 0.25s ease;
      color: var(--color-text-muted, #9a9890);
      background: rgba(128,128,128,0.08);
      z-index: 5;
    `;
    wrapper.appendChild(el);
    elements.push({ el, x: label.x, y: label.y, kind: 'axis' });
  }

  // Simple collision nudging
  function resolveOverlaps(projected) {
    const PADDING = 6;
    for (let i = 0; i < projected.length; i++) {
      if (projected[i].hidden) continue;
      const a = projected[i];
      const aW = a.el.offsetWidth || 60;
      const aH = a.el.offsetHeight || 18;
      for (let j = i + 1; j < projected.length; j++) {
        if (projected[j].hidden) continue;
        const b = projected[j];
        const bW = b.el.offsetWidth || 60;
        const bH = b.el.offsetHeight || 18;

        const overlapX = (aW + bW) / 2 + PADDING - Math.abs(a.sx - b.sx);
        const overlapY = (aH + bH) / 2 + PADDING - Math.abs(a.sy - b.sy);

        if (overlapX > 0 && overlapY > 0) {
          // Nudge the less important one (axis labels yield to features)
          const nudgeTarget = b.kind === 'axis' || (a.kind === 'feature' && b.kind === 'feature') ? j : i;
          const dy = projected[nudgeTarget].sy > projected[nudgeTarget === j ? i : j].sy ? overlapY : -overlapY;
          projected[nudgeTarget].sy += dy * 0.6;
        }
      }
    }
  }

  function update(projectToScreen) {
    const ww = wrapper.clientWidth;
    const wh = wrapper.clientHeight;
    const margin = 12;

    const projected = elements.map((item) => {
      const pos = projectToScreen(item.x, item.y);
      const hidden = pos.behind || pos.x < -20 || pos.y < -20 || pos.x > ww + 20 || pos.y > wh + 20;
      return { ...item, sx: pos.x, sy: pos.y, hidden };
    });

    resolveOverlaps(projected);

    for (const p of projected) {
      if (p.hidden) {
        p.el.style.opacity = '0';
      } else {
        // Clamp to viewport with margin
        const x = Math.max(margin, Math.min(ww - margin, p.sx));
        const y = Math.max(margin, Math.min(wh - margin, p.sy));

        // Fade labels near edges
        const edgeDist = Math.min(x, y, ww - x, wh - y);
        const edgeOpacity = Math.min(1, edgeDist / 30);

        p.el.style.opacity = String(Math.max(0.3, edgeOpacity));
        p.el.style.left = x + 'px';
        p.el.style.top = y + 'px';
      }
    }
  }

  function dispose() {
    wrapper.remove();
  }

  return { update, dispose };
}
