-- Account deletion support: a deleted user's device may still hold a queued
-- result-create (30-day retry queue). Tombstoning their sessions lets the
-- server reject those writes (410) instead of resurrecting erased data.
CREATE TABLE deleted_sessions (
  session_id UUID PRIMARY KEY,
  deleted_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE deleted_sessions ENABLE ROW LEVEL SECURITY;
-- Service-role only.
