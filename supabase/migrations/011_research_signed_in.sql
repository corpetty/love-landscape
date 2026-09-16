-- 011_research_signed_in.sql
-- Fixes a silent regression that arrived with accounts (migration 003).
--
-- The research-contribution policy was written before this app had sign-in,
-- and grants INSERT `TO anon` only. Once a person signs in, the Supabase
-- client sends their JWT, PostgREST runs the request as `authenticated`, and
-- the insert is refused by row-level security — so every signed-in person who
-- offered their data got "Something went wrong. Your data was not submitted."
-- Nobody with an account has been able to contribute since accounts shipped.
--
-- This does NOT breach the research firewall (PRD §6). `submissions` has no
-- user_id and gains none here: an authenticated insert lands exactly as
-- anonymous as an unauthenticated one. The only thing that changes is which
-- database role is permitted to write a row that identifies nobody either way.
DROP POLICY IF EXISTS "Allow anonymous inserts" ON submissions;

CREATE POLICY "Allow research contributions"
  ON submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Still no SELECT policy for either role: reads happen only through the
-- aggregate RPC functions, which return counts and averages, never rows.
