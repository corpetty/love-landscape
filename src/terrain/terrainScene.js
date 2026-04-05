import * as THREE from 'three';
import { GRID_SIZE, HEIGHT_SCALE, FEATURE_LABELS } from './constants.js';
import { createTerrainMaterial } from './terrainMaterial.js';

function terrainHeight(w) {
  return Math.round(w * (w < 500 ? 1.0 : 0.75));
}

export function createTerrainScene(canvas, container, isDark) {
  const width = container.clientWidth;
  const height = terrainHeight(width);

  // Renderer
  const bgColor = isDark ? 0x1a1a18 : 0xf5f4f0;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(bgColor);

  // Scene
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(bgColor, 0.6);

  // Camera
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 100);
  let cameraRadius = 2.6;
  let theta = Math.PI * 0.25;
  let phi = Math.PI * 0.28;
  const target = new THREE.Vector3(0, 0, 0);

  function updateCamera() {
    camera.position.set(
      target.x + cameraRadius * Math.sin(phi) * Math.cos(theta),
      target.y + cameraRadius * Math.cos(phi),
      target.z + cameraRadius * Math.sin(phi) * Math.sin(theta)
    );
    camera.lookAt(target);
  }
  updateCamera();

  // Lights
  const hemiLight = new THREE.HemisphereLight(
    isDark ? 0x8899aa : 0xccddee,
    isDark ? 0x222211 : 0x886644,
    0.6
  );
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xfff5e6, 0.9);
  keyLight.position.set(-2, 3, 1);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xe6f0ff, 0.3);
  fillLight.position.set(2, 1, -1);
  scene.add(fillLight);

  // Terrain mesh
  const N = GRID_SIZE;
  const geometry = new THREE.PlaneGeometry(1.8, 1.8, N - 1, N - 1);
  geometry.rotateX(-Math.PI / 2);

  const fieldAttr = new Float32Array(N * N);
  const mappednessAttr = new Float32Array(N * N);
  geometry.setAttribute('fieldValue', new THREE.BufferAttribute(fieldAttr, 1));
  geometry.setAttribute('mappednessValue', new THREE.BufferAttribute(mappednessAttr, 1));

  const material = createTerrainMaterial(isDark);
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // --- State ---
  let autoRotate = true;
  let animId = null;
  let currentField = null;
  let currentMappedness = null;

  // Transition state
  let transitioning = false;
  let transitionStart = 0;
  const TRANSITION_MS = 500;
  let fromPositions = null;
  let toPositions = null;
  let fromFieldVals = null;
  let toFieldVals = null;
  let fromMappedness = null;
  let toMappedness = null;

  // --- Orbit controls ---
  let pointerDown = false;
  let lastPointerX = 0;
  let lastPointerY = 0;

  function onPointerDown(e) {
    if (e.pointerType === 'touch') return; // handled by touch events
    pointerDown = true;
    autoRotate = false;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
  }

  function onPointerMove(e) {
    if (!pointerDown || e.pointerType === 'touch') return;
    const dx = e.clientX - lastPointerX;
    const dy = e.clientY - lastPointerY;
    theta -= dx * 0.005;
    phi = Math.max(0.2, Math.min(Math.PI * 0.48, phi + dy * 0.005));
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    updateCamera();
  }

  function onPointerUp(e) {
    if (e.pointerType === 'touch') return;
    pointerDown = false;
  }

  // Touch: single-finger orbit + pinch-to-zoom
  let touchCount = 0;
  let lastTouchX = 0;
  let lastTouchY = 0;
  let lastPinchDist = 0;

  function pinchDist(e) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function onTouchStart(e) {
    autoRotate = false;
    touchCount = e.touches.length;
    if (touchCount === 1) {
      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
    } else if (touchCount === 2) {
      lastPinchDist = pinchDist(e);
    }
  }

  function onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1 && touchCount === 1) {
      const dx = e.touches[0].clientX - lastTouchX;
      const dy = e.touches[0].clientY - lastTouchY;
      theta -= dx * 0.005;
      phi = Math.max(0.2, Math.min(Math.PI * 0.48, phi + dy * 0.005));
      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
      updateCamera();
    } else if (e.touches.length === 2) {
      const dist = pinchDist(e);
      const delta = lastPinchDist - dist;
      cameraRadius = Math.max(1.5, Math.min(4.5, cameraRadius + delta * 0.008));
      lastPinchDist = dist;
      updateCamera();
    }
  }

  function onTouchEnd() {
    touchCount = 0;
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd);

  // Scroll to zoom (radius-based)
  function onWheel(e) {
    e.preventDefault();
    cameraRadius = Math.max(1.5, Math.min(4.5, cameraRadius + e.deltaY * 0.003));
    updateCamera();
  }
  canvas.addEventListener('wheel', onWheel, { passive: false });

  // Resize
  function onResize() {
    const w = container.clientWidth;
    const h = terrainHeight(w);
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(container);

  // --- Animation loop ---
  function animate() {
    animId = requestAnimationFrame(animate);

    if (autoRotate) {
      theta += 0.002;
      updateCamera();
    }

    // Handle transitions
    if (transitioning) {
      const elapsed = performance.now() - transitionStart;
      const t = Math.min(1, elapsed / TRANSITION_MS);
      // Ease-in-out cubic
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      const positions = geometry.attributes.position.array;
      const fv = geometry.attributes.fieldValue.array;
      const mv = geometry.attributes.mappednessValue.array;

      for (let k = 0; k < N * N; k++) {
        const posIdx = k * 3;
        positions[posIdx + 1] = fromPositions[k] + (toPositions[k] - fromPositions[k]) * ease;
        fv[k] = fromFieldVals[k] + (toFieldVals[k] - fromFieldVals[k]) * ease;
        mv[k] = fromMappedness[k] + (toMappedness[k] - fromMappedness[k]) * ease;
      }

      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.fieldValue.needsUpdate = true;
      geometry.attributes.mappednessValue.needsUpdate = true;
      geometry.computeVertexNormals();

      if (t >= 1) {
        transitioning = false;
        currentField = toFieldVals;
        currentMappedness = toMappedness;
      }
    }

    renderer.render(scene, camera);
  }
  animate();

  // --- Click detection (raycasting) ---
  const raycaster = new THREE.Raycaster();
  const pointerVec = new THREE.Vector2();
  let featureClickCallback = null;
  let pointerDownPos = null;
  const CLICK_THRESHOLD = 5; // px — distinguish click from drag
  const FEATURE_DISTANCE = container.clientWidth < 500 ? 0.25 : 0.18;

  function onClickDown(e) {
    pointerDownPos = { x: e.clientX, y: e.clientY };
  }

  function onClickUp(e) {
    if (!pointerDownPos || !featureClickCallback) return;
    const dx = e.clientX - pointerDownPos.x;
    const dy = e.clientY - pointerDownPos.y;
    if (Math.sqrt(dx * dx + dy * dy) > CLICK_THRESHOLD) return; // was a drag

    const rect = canvas.getBoundingClientRect();
    pointerVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointerVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointerVec, camera);
    const intersects = raycaster.intersectObject(mesh);

    if (intersects.length > 0) {
      const pt = intersects[0].point;
      // Convert mesh coords back to terrain coords (0-1)
      const tx = pt.x / 1.8 + 0.5;
      const ty = pt.z / 1.8 + 0.5;

      // Find closest feature
      let closest = null;
      let closestDist = Infinity;
      for (const feat of FEATURE_LABELS) {
        const fdx = tx - feat.x;
        const fdy = ty - feat.y;
        const dist = Math.sqrt(fdx * fdx + fdy * fdy);
        if (dist < closestDist) {
          closestDist = dist;
          closest = feat;
        }
      }

      if (closest && closestDist < FEATURE_DISTANCE) {
        featureClickCallback(closest);
      } else {
        featureClickCallback(null); // clicked empty terrain
      }
    }
  }

  canvas.addEventListener('pointerdown', onClickDown);
  canvas.addEventListener('pointerup', onClickUp);

  function setOnFeatureClick(callback) {
    featureClickCallback = callback;
  }

  // --- Public API ---

  function updateField(field, mappedness, animated = true) {
    const positions = geometry.attributes.position.array;
    const fv = geometry.attributes.fieldValue.array;
    const mv = geometry.attributes.mappednessValue.array;

    if (animated && currentField) {
      // Store current state as "from"
      fromPositions = new Float32Array(N * N);
      toPositions = new Float32Array(N * N);
      fromFieldVals = new Float32Array(fv);
      toFieldVals = new Float32Array(field);
      fromMappedness = new Float32Array(mv);
      toMappedness = new Float32Array(mappedness);

      for (let k = 0; k < N * N; k++) {
        fromPositions[k] = positions[k * 3 + 1];
        toPositions[k] = field[k] * HEIGHT_SCALE;
      }

      transitioning = true;
      transitionStart = performance.now();
    } else {
      // Immediate update (first load)
      for (let k = 0; k < N * N; k++) {
        positions[k * 3 + 1] = field[k] * HEIGHT_SCALE;
        fv[k] = field[k];
        mv[k] = mappedness[k];
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.fieldValue.needsUpdate = true;
      geometry.attributes.mappednessValue.needsUpdate = true;
      geometry.computeVertexNormals();

      currentField = field;
      currentMappedness = mappedness;
    }
  }

  function projectToScreen(tx, ty) {
    const mx = (tx - 0.5) * 1.8;
    const mz = (ty - 0.5) * 1.8;

    const gi = Math.round(tx * (N - 1));
    const gj = Math.round(ty * (N - 1));
    const idx = gj * N + gi;
    const my = currentField ? currentField[idx] * HEIGHT_SCALE + 0.05 : 0.05;

    const vec = new THREE.Vector3(mx, my, mz);
    vec.project(camera);

    const w = renderer.domElement.clientWidth;
    const h = renderer.domElement.clientHeight;

    return {
      x: (vec.x * 0.5 + 0.5) * w,
      y: (-vec.y * 0.5 + 0.5) * h,
      behind: vec.z > 1,
    };
  }

  function dispose() {
    cancelAnimationFrame(animId);
    resizeObserver.disconnect();
    canvas.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove', onTouchMove);
    canvas.removeEventListener('touchend', onTouchEnd);
    canvas.removeEventListener('wheel', onWheel);
    geometry.dispose();
    material.dispose();
    renderer.dispose();
  }

  return { updateField, projectToScreen, setOnFeatureClick, dispose, renderer, camera };
}
