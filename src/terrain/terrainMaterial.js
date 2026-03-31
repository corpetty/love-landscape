import * as THREE from 'three';

const vertexShader = /* glsl */ `
  attribute float fieldValue;
  attribute float mappednessValue;

  varying vec3 vColor;
  varying float vFieldValue;
  varying float vMappedness;
  varying float vRadius;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  // Color ramp stops
  uniform float rampVals[6];
  uniform vec3 rampColors[6];
  uniform vec3 bgColor;

  vec3 sampleRamp(float val) {
    if (val <= rampVals[0]) return rampColors[0];
    if (val >= rampVals[5]) return rampColors[5];
    for (int i = 0; i < 5; i++) {
      if (val <= rampVals[i + 1]) {
        float t = (val - rampVals[i]) / (rampVals[i + 1] - rampVals[i]);
        return mix(rampColors[i], rampColors[i + 1], t);
      }
    }
    return rampColors[5];
  }

  void main() {
    vFieldValue = fieldValue;
    vMappedness = mappednessValue;
    vNormal = normalMatrix * normal;
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;

    // Compute radial distance from center of the mesh for circular clipping
    float nx = position.x / 0.9;
    float nz = position.z / 0.9;
    vRadius = sqrt(nx * nx + nz * nz);

    // Terrain color from ramp, blended toward bg by mappedness
    vec3 terrainColor = sampleRamp(fieldValue);
    vColor = mix(bgColor, terrainColor, mappednessValue);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vFieldValue;
  varying float vMappedness;
  varying float vRadius;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  uniform vec3 contourColor;
  uniform vec3 lightDir;
  uniform vec3 bgColor;
  uniform vec3 accentColor;

  void main() {
    // Circular clipping — smoothly discard fragments outside a radius
    float circleAlpha = 1.0 - smoothstep(0.85, 1.0, vRadius);
    if (circleAlpha < 0.01) discard;

    // Base color from vertex
    vec3 color = vColor;

    // === MAPPEDNESS VISUALIZATION ===

    // Desaturate unmapped territory
    if (vMappedness < 0.3) {
      float gray = dot(color, vec3(0.3, 0.59, 0.11));
      float desat = smoothstep(0.0, 0.3, vMappedness);
      color = mix(vec3(gray), color, desat);

      // Hatching pattern for unmapped territory
      float hatch = mod(gl_FragCoord.x + gl_FragCoord.y, 8.0);
      float hatchLine = step(6.0, hatch);
      float hatchStrength = (1.0 - desat) * 0.12;
      color = mix(color, bgColor, hatchLine * hatchStrength);
    }

    // Boundary glow at the mapped frontier
    float boundaryDist = abs(vMappedness - 0.5);
    float boundaryGlow = 1.0 - smoothstep(0.0, 0.06, boundaryDist);
    color = mix(color, accentColor, boundaryGlow * 0.35 * step(0.01, vMappedness));

    // Simple directional lighting
    vec3 normal = normalize(vNormal);
    float diffuse = max(dot(normal, normalize(lightDir)), 0.0);
    float ambient = 0.45;
    float lighting = ambient + diffuse * 0.55;
    color *= lighting;

    // Contour lines via fragment shader
    float levels[5];
    levels[0] = -0.6;
    levels[1] = -0.3;
    levels[2] = 0.0;
    levels[3] = 0.3;
    levels[4] = 0.6;

    for (int i = 0; i < 5; i++) {
      float dist = abs(vFieldValue - levels[i]);
      float line = 1.0 - smoothstep(0.01, 0.03, dist);
      float opacity = (levels[i] == 0.0) ? 0.4 : 0.15;
      color = mix(color, contourColor, line * opacity * vMappedness);
    }

    // Fade to background at edges of mapped territory
    float edgeFade = smoothstep(0.0, 0.15, vMappedness);
    color = mix(bgColor, color, edgeFade);

    // Blend to background at circular edge
    color = mix(bgColor, color, circleAlpha);

    gl_FragColor = vec4(color, 1.0);
  }
`;

export function createTerrainMaterial(isDark) {
  const bgColor = isDark
    ? new THREE.Color(0x1a1a18)
    : new THREE.Color(0xf5f4f0);

  const contourColor = isDark
    ? new THREE.Color(0.9, 0.9, 0.85)
    : new THREE.Color(0.1, 0.1, 0.12);

  const accentColor = isDark
    ? new THREE.Color(0.55, 0.50, 0.95)
    : new THREE.Color(0.50, 0.47, 0.87);

  const rampVals = [-1.0, -0.5, 0.0, 0.3, 0.6, 1.0];
  const rampColors = isDark
    ? [
        new THREE.Color(0.12, 0.48, 0.62),
        new THREE.Color(0.22, 0.64, 0.58),
        new THREE.Color(0.50, 0.74, 0.44),
        new THREE.Color(0.82, 0.76, 0.34),
        new THREE.Color(0.92, 0.56, 0.28),
        new THREE.Color(0.90, 0.38, 0.35),
      ]
    : [
        new THREE.Color(0.10, 0.42, 0.55),
        new THREE.Color(0.18, 0.58, 0.52),
        new THREE.Color(0.45, 0.68, 0.40),
        new THREE.Color(0.78, 0.72, 0.30),
        new THREE.Color(0.88, 0.52, 0.25),
        new THREE.Color(0.85, 0.35, 0.32),
      ];

  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      rampVals: { value: rampVals },
      rampColors: { value: rampColors },
      bgColor: { value: bgColor },
      contourColor: { value: contourColor },
      accentColor: { value: accentColor },
      lightDir: { value: new THREE.Vector3(0.6, 0.8, 0.5).normalize() },
    },
    side: THREE.DoubleSide,
  });
}
