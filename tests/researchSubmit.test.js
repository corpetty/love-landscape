import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The research contribution failed for every signed-in person for months and
 * nobody noticed, because the only thing that crossed this boundary was that
 * *something* went wrong. These tests hold the fix in place: whatever the
 * database says has to survive as far as the person looking at the screen.
 */
let lastInsert = null;
let nextError = null;

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({ insert: async (row) => { lastInsert = row; return { error: nextError }; } }),
  }),
}));

// The client is built at module load from import.meta.env, so the stubs have
// to be in place before the import, not before the first test.
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
const { submitLandscape, PARAM_COLUMNS } = await import('../src/data/supabase.js');

const PARAMS = Array.from({ length: 13 }, (_, i) => i / 12);

beforeEach(() => { lastInsert = null; nextError = null; });

describe('submitLandscape', () => {
  it('reports success as a null error', async () => {
    expect(await submitLandscape(PARAMS)).toEqual({ error: null });
  });

  it('carries the database message, code and hint back to the caller', async () => {
    // This is the exact refusal a signed-in person hit: the policy granted
    // INSERT to `anon` alone, so their authenticated request was denied.
    nextError = {
      message: 'new row violates row-level security policy for table "submissions"',
      code: '42501',
      details: null,
      hint: 'Check the policies on the table.',
    };
    const out = await submitLandscape(PARAMS);
    expect(out.error).toContain('row-level security');
    expect(out.code).toBe('42501');
    expect(out.hint).toContain('policies');
  });

  it('never reports a failure as a bare truthy value', async () => {
    nextError = { message: '', code: null };
    const out = await submitLandscape(PARAMS);
    expect(out.error).toBe('Unknown error');
  });

  it('writes all thirteen parameters, clamped', async () => {
    await submitLandscape([2, -1, ...PARAMS.slice(2)]);
    expect(Object.keys(lastInsert).filter((k) => k.startsWith('p_'))).toHaveLength(13);
    expect(lastInsert[PARAM_COLUMNS[0]]).toBe(1);
    expect(lastInsert[PARAM_COLUMNS[1]]).toBe(0);
  });

  it('sends only the demographics that were actually given', async () => {
    await submitLandscape(PARAMS, { ageRange: '36-45', attachmentStyle: 'anxious' });
    expect(lastInsert.age_range).toBe('36-45');
    expect(lastInsert.attachment_style).toBe('anxious');
    expect('gender_identity' in lastInsert).toBe(false);
    expect('relationship_structure' in lastInsert).toBe(false);
  });

  it('stores a reading only with explicit consent', async () => {
    await submitLandscape(PARAMS, { aiReadingText: 'a reading' });
    expect('ai_reading_text' in lastInsert).toBe(false);
    await submitLandscape(PARAMS, { aiReadingText: 'a reading', aiReadingConsented: true });
    expect(lastInsert.ai_reading_text).toBe('a reading');
    expect(lastInsert.ai_reading_consented).toBe(true);
  });
});
