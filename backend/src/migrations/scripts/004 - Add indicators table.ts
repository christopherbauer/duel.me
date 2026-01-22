export const migration_004 = `
-- Add indicators table for battlefield indicators
CREATE TABLE IF NOT EXISTS battlefield_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  seat INT NOT NULL CHECK (seat IN (1, 2)),
  position JSONB NOT NULL, -- {x: number, y: number}
  color VARCHAR(50) NOT NULL DEFAULT 'red',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_indicators_session ON battlefield_indicators(game_session_id);
CREATE INDEX IF NOT EXISTS idx_indicators_seat ON battlefield_indicators(game_session_id, seat);

-- Record migration
INSERT INTO migrations (name) VALUES ('004 - Add indicators table') ON CONFLICT DO NOTHING;
`;
