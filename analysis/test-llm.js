#!/usr/bin/env node
/**
 * Love Landscape LLM Quality Test Harness
 *
 * Tests the LLM integration against all 8 personas and 10 key pairs.
 * Evaluates parameter adjustment, narrative reading, and pair analysis quality.
 *
 * Usage: ANTHROPIC_API_KEY=sk-... node analysis/test-llm.js
 *
 * Options:
 *   --skip-adjust    Skip parameter adjustment tests
 *   --skip-reading   Skip individual reading tests
 *   --skip-pairs     Skip pair reading tests
 *   --persona=NAME   Only test a specific persona (e.g., --persona=Elena)
 *   --pair=A+B       Only test a specific pair (e.g., --pair=Elena+Marcus)
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Import from src/
const { computeParams } = await import(resolve(root, 'src/data/paramCompute.js'));
const { encodeParams } = await import(resolve(root, 'src/data/encoding.js'));
const { generateReading, generateSummary } = await import(resolve(root, 'src/data/interpretation.js'));
const {
  buildAdjustmentPrompt,
  buildReadingPrompt,
  buildPairReadingPrompt,
  parseAdjustedParams,
} = await import(resolve(root, 'src/data/llmPrompt.js'));

// Import personas
const { personas, keyPairs, PARAM_NAMES } = await import(resolve(__dirname, 'personas.js'));

// ─── Config ─────────────────────────────────────────────

// Accept raw API key, or fall back to Claude Code's internal OAuth token
const API_KEY = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_CODE_OAUTH_TOKEN;
if (!API_KEY) {
  console.error('ERROR: No API key found.');
  console.error('Usage: ANTHROPIC_API_KEY=sk-... node analysis/test-llm.js');
  console.error('When running inside Claude Code, CLAUDE_CODE_OAUTH_TOKEN is used automatically.');
  process.exit(1);
}

const usingOAuth = !process.env.ANTHROPIC_API_KEY && !!process.env.CLAUDE_CODE_OAUTH_TOKEN;

// OAuth token (Claude Code) only has access to haiku; use LLM_MODEL to override with sonnet when using a raw API key
const MODEL = process.env.LLM_MODEL || (usingOAuth ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-5-20250929');
const args = process.argv.slice(2);
const skipAdjust = args.includes('--skip-adjust');
const skipReading = args.includes('--skip-reading');
const skipPairs = args.includes('--skip-pairs');
const onlyPersona = args.find(a => a.startsWith('--persona='))?.split('=')[1];
const onlyPair = args.find(a => a.startsWith('--pair='))?.split('=')[1];

// ─── Claude API Call ────────────────────────────────────

async function callClaude(systemMessage, userMessage) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: systemMessage,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Claude API error (${response.status}): ${text.slice(0, 300)}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || '';
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function pct(v) { return Math.round(v * 100); }

// ─── Test: Parameter Adjustment ─────────────────────────

async function testAdjustment(persona) {
  const baseParams = computeParams(persona.answers);
  const context = persona.sampleContext || {};

  const { systemMessage, userMessage } = buildAdjustmentPrompt(baseParams, persona.answers, context);
  const raw = await callClaude(systemMessage, userMessage);
  const adjusted = parseAdjustedParams(raw);

  if (!adjusted) {
    return { persona: persona.name, status: 'PARSE_FAILED', raw, adjustments: [] };
  }

  const adjustments = PARAM_NAMES.map((name, i) => {
    const base = baseParams[i];
    const adj = adjusted[i];
    const delta = adj - base;
    const absDelta = Math.abs(delta);
    let flag = 'OK';
    if (absDelta > 0.20) flag = 'LARGE';
    if (absDelta < 0.01) flag = 'UNCHANGED';
    return { param: name, base: pct(base), adjusted: pct(adj), delta: (delta > 0 ? '+' : '') + pct(delta), flag };
  });

  const changed = adjustments.filter(a => a.flag !== 'UNCHANGED');
  const large = adjustments.filter(a => a.flag === 'LARGE');

  return {
    persona: persona.name,
    status: 'OK',
    changedCount: changed.length,
    largeCount: large.length,
    adjustments,
    raw,
  };
}

// ─── Test: Narrative Reading ────────────────────────────

async function testReading(persona) {
  const params = computeParams(persona.answers);
  const context = persona.sampleContext || {};

  const { systemMessage, userMessage } = buildReadingPrompt(params, context);
  const reading = await callClaude(systemMessage, userMessage);

  const wordCount = reading.split(/\s+/).length;
  const usesTerrain = /valley|ridge|terrain|landscape|fog|frontier|contour/i.test(reading);
  const isGeneric = !/\b(you|your)\b/i.test(reading);

  return {
    persona: persona.name,
    reading,
    wordCount,
    usesTerrain,
    isGeneric,
  };
}

// ─── Test: Pair Reading ─────────────────────────────────

async function testPairReading(pair) {
  const personaA = personas.find(p => p.name === pair.a);
  const personaB = personas.find(p => p.name === pair.b);
  const paramsA = computeParams(personaA.answers);
  const paramsB = computeParams(personaB.answers);

  const { systemMessage, userMessage } = buildPairReadingPrompt(
    paramsA, paramsB,
    personaA.sampleContext || {},
    personaB.sampleContext || {},
  );

  const reading = await callClaude(systemMessage, userMessage);

  const wordCount = reading.split(/\s+/).length;
  const usesTerrain = /valley|ridge|terrain|landscape|pass|frontier/i.test(reading);
  const hasConversations = /conversation|talk about|discuss|ask|question/i.test(reading);

  return {
    pair: `${pair.a} + ${pair.b}`,
    why: pair.why,
    reading,
    wordCount,
    usesTerrain,
    hasConversations,
  };
}

// ─── Report Generation ──────────────────────────────────

function generateReport(adjustResults, readingResults, pairResults) {
  let md = '';

  md += '# Love Landscape — LLM Quality Report\n\n';
  md += `Generated: ${new Date().toISOString().split('T')[0]}\n`;
  md += `Model: ${MODEL}\n\n`;
  md += '---\n\n';

  // ── Adjustment Results ──
  if (adjustResults.length > 0) {
    md += '## Parameter Adjustment Tests\n\n';
    md += 'Testing whether the LLM sensibly adjusts parameters based on free-text context.\n\n';

    for (const r of adjustResults) {
      md += `### ${r.persona}\n\n`;
      if (r.status === 'PARSE_FAILED') {
        md += '**STATUS: PARSE FAILED** — LLM response could not be parsed as JSON.\n\n';
        md += `Raw response:\n\`\`\`\n${r.raw?.slice(0, 500)}\n\`\`\`\n\n`;
        continue;
      }

      md += `**${r.changedCount}** params adjusted, **${r.largeCount}** large adjustments\n\n`;

      const changed = r.adjustments.filter(a => a.flag !== 'UNCHANGED');
      if (changed.length > 0) {
        md += '| Parameter | Base | Adjusted | Delta | Flag |\n';
        md += '|-----------|-----:|---------:|------:|------|\n';
        for (const a of changed) {
          md += `| ${a.param} | ${a.base}% | ${a.adjusted}% | ${a.delta}% | ${a.flag} |\n`;
        }
        md += '\n';
      } else {
        md += 'No adjustments made.\n\n';
      }
      md += '---\n\n';
    }
  }

  // ── Reading Results ──
  if (readingResults.length > 0) {
    md += '## Narrative Reading Tests\n\n';
    md += 'Testing whether AI readings are specific, use terrain metaphor, and capture tensions.\n\n';

    for (const r of readingResults) {
      md += `### ${r.persona}\n\n`;
      md += `**Words**: ${r.wordCount} | **Terrain metaphor**: ${r.usesTerrain ? 'Yes' : 'NO'} | **Generic**: ${r.isGeneric ? 'YES (bad)' : 'No'}\n\n`;
      md += `> ${r.reading.replace(/\n/g, '\n> ')}\n\n`;
      md += '---\n\n';
    }
  }

  // ── Pair Results ──
  if (pairResults.length > 0) {
    md += '## Pair Reading Tests\n\n';
    md += 'Testing whether pair readings surface documented tensions and suggest actionable conversations.\n\n';

    for (const r of pairResults) {
      md += `### ${r.pair}\n\n`;
      md += `**Why this pair**: ${r.why}\n\n`;
      md += `**Words**: ${r.wordCount} | **Terrain metaphor**: ${r.usesTerrain ? 'Yes' : 'NO'} | **Conversations suggested**: ${r.hasConversations ? 'Yes' : 'NO'}\n\n`;
      md += `> ${r.reading.replace(/\n/g, '\n> ')}\n\n`;
      md += '---\n\n';
    }
  }

  // ── Summary ──
  md += '## Summary\n\n';

  if (adjustResults.length > 0) {
    const parseFailed = adjustResults.filter(r => r.status === 'PARSE_FAILED').length;
    const totalLarge = adjustResults.reduce((s, r) => s + (r.largeCount || 0), 0);
    md += `**Adjustments**: ${adjustResults.length} tested, ${parseFailed} parse failures, ${totalLarge} large adjustments\n\n`;
  }

  if (readingResults.length > 0) {
    const noTerrain = readingResults.filter(r => !r.usesTerrain).length;
    const generic = readingResults.filter(r => r.isGeneric).length;
    const avgWords = Math.round(readingResults.reduce((s, r) => s + r.wordCount, 0) / readingResults.length);
    md += `**Readings**: ${readingResults.length} tested, ${noTerrain} missing terrain metaphor, ${generic} generic, avg ${avgWords} words\n\n`;
  }

  if (pairResults.length > 0) {
    const noConvo = pairResults.filter(r => !r.hasConversations).length;
    const noTerrain = pairResults.filter(r => !r.usesTerrain).length;
    md += `**Pairs**: ${pairResults.length} tested, ${noConvo} missing conversations, ${noTerrain} missing terrain metaphor\n\n`;
  }

  return md;
}

// ─── Main ───────────────────────────────────────────────

console.log(`Love Landscape LLM Quality Test\n`);
console.log(`Model: ${MODEL}`);
console.log(`Auth: ${usingOAuth ? 'Claude Code OAuth (CLAUDE_CODE_OAUTH_TOKEN)' : 'API Key (ANTHROPIC_API_KEY)'}`);
console.log(`Personas: ${onlyPersona || 'all'}`);
console.log(`Pairs: ${onlyPair || 'all'}`);
console.log(`Tests: ${[!skipAdjust && 'adjustment', !skipReading && 'reading', !skipPairs && 'pairs'].filter(Boolean).join(', ')}\n`);

const targetPersonas = onlyPersona
  ? personas.filter(p => p.name.toLowerCase() === onlyPersona.toLowerCase())
  : personas;

const targetPairs = onlyPair
  ? keyPairs.filter(p => `${p.a}+${p.b}`.toLowerCase() === onlyPair.toLowerCase())
  : keyPairs;

const adjustResults = [];
const readingResults = [];
const pairResults = [];

// Parameter Adjustment Tests
if (!skipAdjust) {
  console.log('── Parameter Adjustment Tests ──');
  for (const persona of targetPersonas) {
    if (!persona.sampleContext || Object.keys(persona.sampleContext).length === 0) {
      console.log(`  ${persona.name}: SKIPPED (no context)`);
      continue;
    }
    process.stdout.write(`  ${persona.name}...`);
    try {
      const result = await testAdjustment(persona);
      adjustResults.push(result);
      console.log(` ${result.status} (${result.changedCount} changed, ${result.largeCount} large)`);
    } catch (err) {
      console.log(` ERROR: ${err.message}`);
      adjustResults.push({ persona: persona.name, status: 'ERROR', raw: err.message, adjustments: [] });
    }
    await sleep(1000);
  }
  console.log();
}

// Narrative Reading Tests
if (!skipReading) {
  console.log('── Narrative Reading Tests ──');
  for (const persona of targetPersonas) {
    process.stdout.write(`  ${persona.name}...`);
    try {
      const result = await testReading(persona);
      readingResults.push(result);
      console.log(` OK (${result.wordCount} words, terrain=${result.usesTerrain})`);
    } catch (err) {
      console.log(` ERROR: ${err.message}`);
    }
    await sleep(1000);
  }
  console.log();
}

// Pair Reading Tests
if (!skipPairs) {
  console.log('── Pair Reading Tests ──');
  for (const pair of targetPairs) {
    process.stdout.write(`  ${pair.a} + ${pair.b}...`);
    try {
      const result = await testPairReading(pair);
      pairResults.push(result);
      console.log(` OK (${result.wordCount} words, terrain=${result.usesTerrain}, convos=${result.hasConversations})`);
    } catch (err) {
      console.log(` ERROR: ${err.message}`);
    }
    await sleep(1000);
  }
  console.log();
}

// Generate report
const report = generateReport(adjustResults, readingResults, pairResults);
const reportPath = resolve(__dirname, 'LLM-REPORT.md');
writeFileSync(reportPath, report);
console.log(`Report written to ${reportPath}`);

// Summary
const totalTests = adjustResults.length + readingResults.length + pairResults.length;
const errors = adjustResults.filter(r => r.status === 'ERROR' || r.status === 'PARSE_FAILED').length;
console.log(`\n${totalTests} tests completed, ${errors} errors.`);
