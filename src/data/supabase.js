import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Parameter column names matching the database schema
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
];

/**
 * Submit a landscape to the research database.
 * @param {number[]} params - 9 terrain parameters (0-1)
 * @param {Object} demographics - optional { ageRange, relationshipStructure, genderIdentity }
 */
export async function submitLandscape(params, demographics = {}) {
  if (!supabase) return { error: 'Supabase not configured' };

  const row = {};
  PARAM_COLUMNS.forEach((col, i) => {
    row[col] = Math.max(0, Math.min(1, params[i]));
  });

  if (demographics.ageRange) row.age_range = demographics.ageRange;
  if (demographics.relationshipStructure) row.relationship_structure = demographics.relationshipStructure;
  if (demographics.genderIdentity) row.gender_identity = demographics.genderIdentity.slice(0, 100);

  const { error } = await supabase.from('submissions').insert(row);
  return { error: error?.message || null };
}
