#!/usr/bin/env node
/**
 * Love Landscape Persona Analysis Framework
 *
 * Runs 8 personas through the parameter computation, compares to expectations,
 * analyzes 10 key pairs, and produces diagnostic output.
 *
 * Usage: node analysis/run-analysis.js
 * Output: analysis/REPORT.md, analysis/persona-data.json
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Import from src/
const { computeParams } = await import(resolve(root, 'src/data/paramCompute.js'));
const { encodeParams } = await import(resolve(root, 'src/data/encoding.js'));
const { generateRecommendations } = await import(resolve(root, 'src/data/recommendations.js'));
const { generateReading, generateSummary } = await import(resolve(root, 'src/data/interpretation.js'));
const { generateField, generateCombinedField, generateRawField } = await import(resolve(root, 'src/terrain/fieldGenerator.js'));
const { getTroughs, getRidges, getSaddles, FEATURE_LABELS, GRID_SIZE } = await import(resolve(root, 'src/terrain/constants.js'));

// Import personas
const { personas, keyPairs, PARAM_NAMES } = await import(resolve(__dirname, 'personas.js'));

// ─── Utilities ──────────────────────────────────────────

function pct(v) { return Math.round(v * 100); }
function pad(s, n) { return String(s).padEnd(n); }
function rpad(s, n) { return String(s).padStart(n); }

function classifyParam(value) {
  if (value < 0.35) return 'low';
  if (value > 0.65) return 'high';
  return 'mid';
}

function paramBar(value) {
  const filled = Math.round(value * 20);
  return '█'.repeat(filled) + '░'.repeat(20 - filled);
}

// ─── Per-Persona Analysis ───────────────────────────────

function analyzePersona(persona) {
  const params = computeParams(persona.answers);
  const code = encodeParams(params);
  const reading = generateReading(params);
  const summary = generateSummary(params);

  // Check expectations
  const deviations = [];
  const expected = persona.expected;

  for (const idx of (expected.high || [])) {
    if (params[idx] < 0.55) {
      deviations.push({
        param: PARAM_NAMES[idx],
        index: idx,
        expected: 'high (>0.65)',
        got: pct(params[idx]) + '%',
        severity: params[idx] < 0.35 ? 'CRITICAL' : 'WARNING',
      });
    }
  }

  for (const idx of (expected.low || [])) {
    if (params[idx] > 0.45) {
      deviations.push({
        param: PARAM_NAMES[idx],
        index: idx,
        expected: 'low (<0.35)',
        got: pct(params[idx]) + '%',
        severity: params[idx] > 0.65 ? 'CRITICAL' : 'WARNING',
      });
    }
  }

  // Field statistics
  const field = generateField(params);
  let minField = Infinity, maxField = -Infinity, sumField = 0;
  for (let i = 0; i < field.field.length; i++) {
    if (field.field[i] < minField) minField = field.field[i];
    if (field.field[i] > maxField) maxField = field.field[i];
    sumField += field.field[i];
  }

  // Count active saddles
  const saddles = getSaddles(params);
  const activeSaddles = saddles.filter(s => Math.abs(s.amplitude) > 0.05);

  // Count mapped cells
  let mappedCount = 0;
  for (let i = 0; i < field.mappedness.length; i++) {
    if (field.mappedness[i] > 0.5) mappedCount++;
  }
  const mappedPct = Math.round(mappedCount / field.mappedness.length * 100);

  return {
    name: persona.name,
    title: persona.title,
    params,
    code,
    summary,
    reading,
    deviations,
    fieldStats: {
      minField,
      maxField,
      range: maxField - minField,
      meanField: sumField / field.field.length,
      activeSaddles: activeSaddles.length,
      mappedPct,
    },
  };
}

// ─── Pair Analysis ──────────────────────────────────────

function analyzePair(pair, personaResults) {
  const a = personaResults.find(p => p.name === pair.a);
  const b = personaResults.find(p => p.name === pair.b);

  // Parameter distances
  const distances = PARAM_NAMES.map((name, i) => ({
    param: name,
    index: i,
    valueA: a.params[i],
    valueB: b.params[i],
    distance: Math.abs(a.params[i] - b.params[i]),
    classification: Math.abs(a.params[i] - b.params[i]) < 0.15 ? 'aligned' :
                    Math.abs(a.params[i] - b.params[i]) > 0.27 ? 'divergent' : 'neutral',
  }));

  // Recommendations
  const recommendations = generateRecommendations(a.params, b.params);

  // Combined field stats
  const combined = generateCombinedField(a.params, b.params);
  let minCombined = Infinity, maxCombined = -Infinity;
  for (let i = 0; i < combined.field.length; i++) {
    if (combined.field[i] < minCombined) minCombined = combined.field[i];
    if (combined.field[i] > maxCombined) maxCombined = combined.field[i];
  }

  // Check expected divergences
  const expectedDivergentMissed = (pair.expectDivergent || []).filter(idx =>
    distances[idx].classification !== 'divergent'
  );
  const expectedAlignedMissed = (pair.expectAligned || []).filter(idx =>
    distances[idx].classification !== 'aligned'
  );

  // Total divergence score
  const totalDivergence = distances.reduce((sum, d) => sum + d.distance, 0);

  // Terrain topology analysis
  const terrain = analyzeTerrainPair(a.params, b.params);

  return {
    pair: `${pair.a} + ${pair.b}`,
    pairNames: [pair.a, pair.b],
    why: pair.why,
    lookFor: pair.lookFor,
    distances,
    recommendations,
    expectedDivergentMissed,
    expectedAlignedMissed,
    totalDivergence,
    combinedStats: {
      minField: minCombined,
      maxField: maxCombined,
      range: maxCombined - minCombined,
    },
    terrain,
    alignedCount: distances.filter(d => d.classification === 'aligned').length,
    divergentCount: distances.filter(d => d.classification === 'divergent').length,
    neutralCount: distances.filter(d => d.classification === 'neutral').length,
  };
}

// ─── Terrain Topology Analysis ──────────────────────────

function analyzeTerrainPair(paramsA, paramsB) {
  const N = GRID_SIZE;
  const rawA = generateRawField(paramsA);
  const rawB = generateRawField(paramsB);
  const fieldA = generateField(paramsA);
  const fieldB = generateField(paramsB);
  const combined = generateCombinedField(paramsA, paramsB);

  // 1. Zone classification (on raw fields, within mapped area of combined)
  let sharedValley = 0, sharedRidge = 0, tensionAB = 0, tensionBA = 0, flat = 0, totalMapped = 0;
  const FLAT_THRESHOLD = 0.05;

  for (let i = 0; i < N * N; i++) {
    // Only analyze cells within the combined mapped area
    if (combined.mappedness[i] < 0.3) continue;
    totalMapped++;

    const a = rawA.field[i];
    const b = rawB.field[i];

    if (Math.abs(a) < FLAT_THRESHOLD && Math.abs(b) < FLAT_THRESHOLD) {
      flat++;
    } else if (a < -FLAT_THRESHOLD && b < -FLAT_THRESHOLD) {
      sharedValley++;
    } else if (a > FLAT_THRESHOLD && b > FLAT_THRESHOLD) {
      sharedRidge++;
    } else if (a < -FLAT_THRESHOLD && b > FLAT_THRESHOLD) {
      tensionAB++; // A has valley, B has ridge
    } else if (a > FLAT_THRESHOLD && b < -FLAT_THRESHOLD) {
      tensionBA++; // A has ridge, B has valley
    } else {
      flat++; // one is near zero
    }
  }

  const zones = totalMapped > 0 ? {
    sharedValley: Math.round(sharedValley / totalMapped * 100),
    sharedRidge: Math.round(sharedRidge / totalMapped * 100),
    tensionAValleyBRidge: Math.round(tensionAB / totalMapped * 100),
    tensionARidgeBValley: Math.round(tensionBA / totalMapped * 100),
    flat: Math.round(flat / totalMapped * 100),
    totalTension: Math.round((tensionAB + tensionBA) / totalMapped * 100),
  } : { sharedValley: 0, sharedRidge: 0, tensionAValleyBRidge: 0, tensionARidgeBValley: 0, flat: 0, totalTension: 0 };

  // 2. Feature-level comparison
  const featureComparison = FEATURE_LABELS.map(feat => {
    const gi = Math.round(feat.x * (N - 1));
    const gj = Math.round(feat.y * (N - 1));
    const idx = gj * N + gi;

    const valA = rawA.field[idx];
    const valB = rawB.field[idx];
    const valCombined = (valA + valB) / 2;

    let status;
    if (valA < -FLAT_THRESHOLD && valB < -FLAT_THRESHOLD) {
      status = Math.abs(valA - valB) < 0.2 ? 'Shared valley' : (Math.abs(valA) > Math.abs(valB) ? 'A-dominant valley' : 'B-dominant valley');
    } else if (valA > FLAT_THRESHOLD && valB > FLAT_THRESHOLD) {
      status = 'Shared ridge';
    } else if (valA < -FLAT_THRESHOLD && valB > FLAT_THRESHOLD) {
      status = 'Tension: A valley, B ridge';
    } else if (valA > FLAT_THRESHOLD && valB < -FLAT_THRESHOLD) {
      status = 'Tension: A ridge, B valley';
    } else {
      status = 'Neutral';
    }

    return {
      name: feat.name,
      valueA: valA,
      valueB: valB,
      combined: valCombined,
      status,
    };
  });

  // 3. Information loss
  const rangeA = fieldA.max - fieldA.min;
  const rangeB = fieldB.max - fieldB.min;
  const rangeCombined = combined.max - combined.min;
  const avgIndividualRange = (rangeA + rangeB) / 2;
  const infoLoss = avgIndividualRange > 0 ? Math.round((1 - rangeCombined / avgIndividualRange) * 100) : 0;

  // 4. Frontier expansion
  let mappedA = 0, mappedB = 0, mappedCombined = 0;
  for (let i = 0; i < N * N; i++) {
    if (fieldA.mappedness[i] > 0.5) mappedA++;
    if (fieldB.mappedness[i] > 0.5) mappedB++;
    if (combined.mappedness[i] > 0.5) mappedCombined++;
  }
  const expansionA = mappedCombined - mappedA; // how much A gains
  const expansionB = mappedCombined - mappedB; // how much B gains
  const frontierExpansion = {
    mappedA: Math.round(mappedA / (N * N) * 100),
    mappedB: Math.round(mappedB / (N * N) * 100),
    mappedCombined: Math.round(mappedCombined / (N * N) * 100),
    aGains: Math.round(expansionA / (N * N) * 100),
    bGains: Math.round(expansionB / (N * N) * 100),
  };

  // 5. Saddle pass survival
  const saddlesA = getSaddles(paramsA);
  const saddlesB = getSaddles(paramsB);
  const avgParams = paramsA.map((v, i) => (v + paramsB[i]) / 2);
  const saddlesCombined = getSaddles(avgParams);

  const saddleSurvival = saddlesA.map((s, i) => {
    const ampA = Math.abs(s.amplitude);
    const ampB = Math.abs(saddlesB[i].amplitude);
    const ampC = Math.abs(saddlesCombined[i].amplitude);
    const activeA = ampA > 0.05;
    const activeB = ampB > 0.05;
    const activeC = ampC > 0.05;

    let status;
    if (activeA && activeB && activeC) status = 'Survives (both had it)';
    else if (!activeA && !activeB && !activeC) status = 'Absent (neither had it)';
    else if (activeC && (!activeA || !activeB)) status = 'Emerges (from averaging)';
    else if (!activeC && (activeA || activeB)) status = 'Lost (averaging killed it)';
    else status = 'Mixed';

    return { name: s.name, activeA, activeB, activeCombined: activeC, status };
  });

  // Diagnostic flags
  const flags = [];
  if (infoLoss > 50) flags.push('OVER-FLATTENING: info loss > 50% — averaging is destroying topology');
  if (zones.totalTension < 10 && zones.sharedValley + zones.sharedRidge < 60) flags.push('MISSING TENSION: low tension zones despite parameter divergence');
  if (zones.sharedValley > 70) flags.push('TRIVIAL HARMONY: > 70% shared valley — no relational friction visible');
  if (rangeCombined < 0.4) flags.push('DEAD COMBINATION: combined range < 0.4 — terrain is essentially flat');

  return {
    zones,
    featureComparison,
    infoLoss,
    frontierExpansion,
    saddleSurvival,
    combinedRange: rangeCombined,
    flags,
  };
}

// ─── System-Level Diagnostics ───────────────────────────

function systemDiagnostics(personaResults, pairResults) {
  const diag = {};

  // Range utilization per parameter
  diag.rangeUtilization = PARAM_NAMES.map((name, i) => {
    const values = personaResults.map(p => p.params[i]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return {
      param: name,
      min: pct(min),
      max: pct(max),
      range: pct(max - min),
      flag: (max - min) < 0.4 ? 'NARROW' : 'OK',
      values: personaResults.map(p => ({ name: p.name, value: pct(p.params[i]) })),
    };
  });

  // Correlation matrix (Pearson across 8 personas)
  const paramVectors = PARAM_NAMES.map((_, i) => personaResults.map(p => p.params[i]));
  diag.correlations = [];
  for (let i = 0; i < 13; i++) {
    for (let j = i + 1; j < 13; j++) {
      const r = pearson(paramVectors[i], paramVectors[j]);
      if (Math.abs(r) > 0.7) {
        diag.correlations.push({
          paramA: PARAM_NAMES[i],
          paramB: PARAM_NAMES[j],
          r: r.toFixed(2),
          flag: Math.abs(r) > 0.85 ? 'HIGH' : 'MODERATE',
        });
      }
    }
  }

  // Recommendation coverage
  const allRecTypes = new Set();
  for (const pr of pairResults) {
    for (const rec of pr.recommendations) {
      allRecTypes.add(rec.title);
    }
  }
  diag.recommendationCoverage = {
    uniqueFired: allRecTypes.size,
    titles: [...allRecTypes],
  };

  // Recommendation count per pair
  diag.recCountByPair = pairResults.map(pr => ({
    pair: pr.pair,
    count: pr.recommendations.length,
    titles: pr.recommendations.map(r => r.title),
  }));

  // Flattening flags: persona pairs that should feel different but are close
  diag.flatteningFlags = [];
  for (const pr of pairResults) {
    if (pr.alignedCount >= 10 && pr.divergentCount <= 1) {
      diag.flatteningFlags.push({
        pair: pr.pair,
        aligned: pr.alignedCount,
        divergent: pr.divergentCount,
        note: 'These personas may not be distinguishable enough in the system',
      });
    }
  }

  return diag;
}

function pearson(x, y) {
  const n = x.length;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? 0 : num / denom;
}

// ─── Report Generation ──────────────────────────────────

function generateReport(personaResults, pairResults, diagnostics) {
  let md = '';

  md += '# Love Landscape — Persona Analysis Report\n\n';
  md += `Generated: ${new Date().toISOString().split('T')[0]}\n\n`;
  md += `**8 personas, 10 key pairs, 13 parameters, 17 questions**\n\n`;
  md += '---\n\n';

  // ── Individual Personas ──
  md += '## Individual Persona Results\n\n';

  for (const pr of personaResults) {
    md += `### ${pr.name} — "${pr.title}"\n\n`;
    md += `**Summary**: ${pr.summary}\n\n`;
    md += `**Code**: \`${pr.code}\`\n\n`;

    // Param table
    md += '| Parameter | Value | Bar | Class |\n';
    md += '|-----------|------:|-----|-------|\n';
    for (let i = 0; i < 13; i++) {
      md += `| ${pad(PARAM_NAMES[i], 22)} | ${rpad(pct(pr.params[i]) + '%', 4)} | \`${paramBar(pr.params[i])}\` | ${classifyParam(pr.params[i])} |\n`;
    }
    md += '\n';

    // Field stats
    md += `**Terrain**: depth range ${pr.fieldStats.minField.toFixed(2)} to ${pr.fieldStats.maxField.toFixed(2)} `;
    md += `(span ${pr.fieldStats.range.toFixed(2)}), `;
    md += `${pr.fieldStats.activeSaddles} active saddles, `;
    md += `${pr.fieldStats.mappedPct}% mapped\n\n`;

    // Deviations
    if (pr.deviations.length > 0) {
      md += '**Expectation Deviations**:\n';
      for (const d of pr.deviations) {
        md += `- ${d.severity}: \`${d.param}\` expected ${d.expected}, got ${d.got}\n`;
      }
      md += '\n';
    } else {
      md += '**Expectations**: All met\n\n';
    }

    md += '---\n\n';
  }

  // ── Pair Analyses ──
  md += '## Key Pair Analyses\n\n';

  for (const pr of pairResults) {
    md += `### ${pr.pair}\n\n`;
    md += `**Why**: ${pr.why}\n\n`;
    md += `**Overall**: ${pr.divergentCount} divergent, ${pr.alignedCount} aligned, ${pr.neutralCount} neutral `;
    md += `(total distance: ${pr.totalDivergence.toFixed(2)})\n\n`;

    // Distance table — only show divergent and aligned
    const notable = pr.distances.filter(d => d.classification !== 'neutral');
    if (notable.length > 0) {
      md += '| Parameter | A | B | Distance | Status |\n';
      md += '|-----------|---:|---:|--------:|--------|\n';
      for (const d of notable.sort((a, b) => b.distance - a.distance)) {
        const emoji = d.classification === 'divergent' ? 'DIVERGENT' : 'ALIGNED';
        md += `| ${pad(d.param, 22)} | ${rpad(pct(d.valueA) + '%', 4)} | ${rpad(pct(d.valueB) + '%', 4)} | ${rpad(pct(d.distance) + '%', 4)} | ${emoji} |\n`;
      }
      md += '\n';
    }

    // Recommendations
    if (pr.recommendations.length > 0) {
      md += '**Recommendations fired**:\n';
      for (const rec of pr.recommendations) {
        md += `- [${rec.type}] ${rec.title}\n`;
      }
      md += '\n';
    } else {
      md += '**Recommendations**: None fired (all params in neutral zone)\n\n';
    }

    // Missed expectations
    if (pr.expectedDivergentMissed.length > 0) {
      md += '**Expected divergent but wasn\'t**: ';
      md += pr.expectedDivergentMissed.map(i => PARAM_NAMES[i]).join(', ') + '\n\n';
    }
    if (pr.expectedAlignedMissed.length > 0) {
      md += '**Expected aligned but wasn\'t**: ';
      md += pr.expectedAlignedMissed.map(i => PARAM_NAMES[i]).join(', ') + '\n\n';
    }

    md += `**What to look for**: ${pr.lookFor}\n\n`;

    // Terrain topology section
    const t = pr.terrain;
    md += `#### Terrain Topology\n\n`;
    md += '| Zone | % of mapped area |\n';
    md += '|------|------------------|\n';
    md += `| Shared valley | ${t.zones.sharedValley}% |\n`;
    md += `| Shared ridge | ${t.zones.sharedRidge}% |\n`;
    md += `| Tension (${pr.pairNames[0]} valley, ${pr.pairNames[1]} ridge) | ${t.zones.tensionAValleyBRidge}% |\n`;
    md += `| Tension (${pr.pairNames[0]} ridge, ${pr.pairNames[1]} valley) | ${t.zones.tensionARidgeBValley}% |\n`;
    md += `| Flat | ${t.zones.flat}% |\n`;
    md += `| **Total tension** | **${t.zones.totalTension}%** |\n\n`;

    md += `**Information loss**: ${t.infoLoss}%`;
    if (t.infoLoss > 50) md += ' (HIGH — averaging is destroying topology)';
    else if (t.infoLoss > 30) md += ' (moderate — some flattening)';
    else md += ' (low — topology preserved)';
    md += '\n\n';

    // Feature comparison — only show non-neutral features
    const notableFeatures = t.featureComparison.filter(f => f.status !== 'Neutral');
    if (notableFeatures.length > 0) {
      md += '**Feature comparison**:\n';
      md += `| Feature | ${pr.pairNames[0]} | ${pr.pairNames[1]} | Combined | Status |\n`;
      md += '|---------|------:|------:|--------:|--------|\n';
      for (const f of notableFeatures) {
        md += `| ${pad(f.name, 22)} | ${rpad(f.valueA.toFixed(2), 6)} | ${rpad(f.valueB.toFixed(2), 6)} | ${rpad(f.combined.toFixed(2), 6)} | ${f.status} |\n`;
      }
      md += '\n';
    }

    // Saddle survival
    md += '**Saddle passes**: ';
    md += t.saddleSurvival.map(s => `${s.name}: ${s.status}`).join(' | ');
    md += '\n\n';

    // Frontier expansion
    if (t.frontierExpansion.aGains > 0 || t.frontierExpansion.bGains > 0) {
      md += '**Frontier expansion**: ';
      if (t.frontierExpansion.aGains > 0) md += `${pr.pairNames[0]} gains ${t.frontierExpansion.aGains}% territory`;
      if (t.frontierExpansion.aGains > 0 && t.frontierExpansion.bGains > 0) md += ', ';
      if (t.frontierExpansion.bGains > 0) md += `${pr.pairNames[1]} gains ${t.frontierExpansion.bGains}% territory`;
      md += '\n\n';
    }

    // Terrain diagnostic flags
    if (t.flags.length > 0) {
      md += '**Terrain flags**:\n';
      for (const flag of t.flags) {
        md += `- ${flag}\n`;
      }
      md += '\n';
    }

    md += '---\n\n';
  }

  // ── System Diagnostics ──
  md += '## System Diagnostics\n\n';

  // Range utilization
  md += '### Parameter Range Utilization\n\n';
  md += 'How much of each parameter\'s [0,1] range is exercised across all 8 personas.\n\n';
  md += '| Parameter | Min | Max | Range | Flag |\n';
  md += '|-----------|----:|----:|------:|------|\n';
  for (const r of diagnostics.rangeUtilization) {
    md += `| ${pad(r.param, 22)} | ${rpad(r.min + '%', 4)} | ${rpad(r.max + '%', 4)} | ${rpad(r.range + '%', 4)} | ${r.flag} |\n`;
  }
  md += '\n';

  const narrowParams = diagnostics.rangeUtilization.filter(r => r.flag === 'NARROW');
  if (narrowParams.length > 0) {
    md += `**Narrow ranges detected** (< 40%): ${narrowParams.map(r => r.param).join(', ')}\n`;
    md += 'These parameters are not being stretched enough by the personas, or the formulas compress the range.\n\n';
  }

  // Correlations
  md += '### Parameter Correlations (|r| > 0.7)\n\n';
  if (diagnostics.correlations.length > 0) {
    md += '| Param A | Param B | r | Flag |\n';
    md += '|---------|---------|---:|------|\n';
    for (const c of diagnostics.correlations) {
      md += `| ${c.paramA} | ${c.paramB} | ${c.r} | ${c.flag} |\n`;
    }
    md += '\n';
    md += 'High correlations suggest the questions feeding these params are not discriminating independently.\n\n';
  } else {
    md += 'No high correlations detected. Parameters appear independent.\n\n';
  }

  // Recommendation coverage
  md += '### Recommendation Coverage\n\n';
  md += `${diagnostics.recommendationCoverage.uniqueFired} unique recommendations fired across 10 pairs:\n`;
  for (const t of diagnostics.recommendationCoverage.titles) {
    md += `- ${t}\n`;
  }
  md += '\n';

  md += '**Recommendations per pair**:\n';
  md += '| Pair | Count |\n';
  md += '|------|------:|\n';
  for (const r of diagnostics.recCountByPair.sort((a, b) => b.count - a.count)) {
    md += `| ${r.pair} | ${r.count} |\n`;
  }
  md += '\n';

  // Flattening
  md += '### Flattening Flags\n\n';
  if (diagnostics.flatteningFlags.length > 0) {
    for (const f of diagnostics.flatteningFlags) {
      md += `- **${f.pair}**: ${f.note} (${f.aligned} aligned, ${f.divergent} divergent)\n`;
    }
  } else {
    md += 'No flattening detected — all persona pairs have meaningful differentiation.\n';
  }
  md += '\n';

  // ── Quick Reference: All Codes ──
  md += '## Quick Reference: Persona Codes\n\n';
  md += 'Load these in the app to visually inspect each landscape.\n\n';
  md += '| Persona | Code |\n';
  md += '|---------|------|\n';
  for (const pr of personaResults) {
    md += `| ${pr.name} — ${pr.title} | \`${pr.code}\` |\n`;
  }
  md += '\n';

  return md;
}

// ─── Main ───────────────────────────────────────────────

console.log('Running Love Landscape persona analysis...\n');

// Analyze each persona
const personaResults = personas.map(p => {
  const result = analyzePersona(p);
  console.log(`  ${result.name}: ${result.deviations.length} deviations, code=${result.code}`);
  return result;
});

// Analyze key pairs
const pairResults = keyPairs.map(pair => {
  const result = analyzePair(pair, personaResults);
  console.log(`  ${result.pair}: ${result.divergentCount}D/${result.alignedCount}A/${result.neutralCount}N, ${result.recommendations.length} recs`);
  return result;
});

// System diagnostics
const diagnostics = systemDiagnostics(personaResults, pairResults);

// Generate report
const report = generateReport(personaResults, pairResults, diagnostics);
const reportPath = resolve(__dirname, 'REPORT.md');
writeFileSync(reportPath, report);
console.log(`\nReport written to ${reportPath}`);

// Write JSON data
const jsonData = {
  generated: new Date().toISOString(),
  personas: personaResults.map(pr => ({
    name: pr.name,
    title: pr.title,
    code: pr.code,
    params: pr.params,
    summary: pr.summary,
    deviations: pr.deviations,
    fieldStats: pr.fieldStats,
  })),
  pairs: pairResults.map(pr => ({
    pair: pr.pair,
    why: pr.why,
    totalDivergence: pr.totalDivergence,
    divergentCount: pr.divergentCount,
    alignedCount: pr.alignedCount,
    recommendations: pr.recommendations,
    expectedDivergentMissed: pr.expectedDivergentMissed.map(i => PARAM_NAMES[i]),
    expectedAlignedMissed: pr.expectedAlignedMissed.map(i => PARAM_NAMES[i]),
  })),
  diagnostics,
};

const jsonPath = resolve(__dirname, 'persona-data.json');
writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
console.log(`JSON data written to ${jsonPath}`);

// Summary
console.log('\n── Summary ──');
console.log(`  Total expectation deviations: ${personaResults.reduce((s, p) => s + p.deviations.length, 0)}`);
console.log(`  Narrow range params: ${diagnostics.rangeUtilization.filter(r => r.flag === 'NARROW').map(r => r.param).join(', ') || 'none'}`);
console.log(`  High correlations: ${diagnostics.correlations.filter(c => c.flag === 'HIGH').map(c => `${c.paramA}/${c.paramB}`).join(', ') || 'none'}`);
console.log(`  Recommendation coverage: ${diagnostics.recommendationCoverage.uniqueFired} unique fired`);
console.log(`  Flattening flags: ${diagnostics.flatteningFlags.length}`);
