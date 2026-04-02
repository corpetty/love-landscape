import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// All 13 parameter column names in order (matches paramCompute.js output)
export const PARAM_COLUMNS = [
  'p_deep_friendships',
  'p_romantic_love',
  'p_tender_middle',
  'p_casual_touch',
  'p_empty_phys_barrier',
  'p_ungrounded_barrier',
  'p_uncertainty_tolerance',
  'p_openness',
  'p_mapped',
  'p_self_intimacy',
  'p_conflict_approach',
  'p_playfulness',
  'p_attachment_security',
];

/**
 * Submit a landscape to the research database.
 *
 * @param {number[]} params - All 13 terrain parameters (0-1)
 * @param {Object} demographics - Optional extended demographics:
 *   { ageRange, relationshipStructure, genderIdentity,
 *     attachmentStyle, relationshipCount,
 *     aiReadingText, aiReadingConsented }
 */
export async function submitLandscape(params, demographics = {}) {
  if (!supabase) return { error: 'Supabase not configured' };

  const row = {};

  // Map all 13 params
  PARAM_COLUMNS.forEach((col, i) => {
    row[col] = Math.max(0, Math.min(1, params[i] ?? 0.5));
  });

  // Core demographics
  if (demographics.ageRange)             row.age_range              = demographics.ageRange;
  if (demographics.relationshipStructure) row.relationship_structure = demographics.relationshipStructure;
  if (demographics.genderIdentity)        row.gender_identity        = demographics.genderIdentity.slice(0, 100);

  // Extended demographics
  if (demographics.attachmentStyle)   row.attachment_style   = demographics.attachmentStyle;
  if (demographics.relationshipCount) row.relationship_count = demographics.relationshipCount;

  // AI reading (only stored with explicit consent)
  if (demographics.aiReadingConsented && demographics.aiReadingText) {
    row.ai_reading_consented = true;
    row.ai_reading_text      = demographics.aiReadingText.slice(0, 4000);
  }

  const { error } = await supabase.from('submissions').insert(row);
  return { error: error?.message || null };
}
