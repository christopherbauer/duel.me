export const migration_003 = `
-- Add order column to game_objects for library card ordering
ALTER TABLE game_objects
ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_game_objects_library_order 
ON game_objects(game_session_id, seat, zone, "order") 
WHERE zone = 'library';

-- Record migration
INSERT INTO migrations (name) VALUES ('003_add_order_to_game_objects') ON CONFLICT (name) DO NOTHING;
`;
