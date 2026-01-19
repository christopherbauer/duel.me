export const migration_002 = `
-- Ensure position column is JSONB (idempotent)
BEGIN;
  DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
      WHERE table_name='game_objects' AND column_name='position' AND data_type != 'jsonb') THEN
      ALTER TABLE game_objects ALTER COLUMN position TYPE JSONB USING NULL;
    END IF;
  END $$;
COMMIT;

INSERT INTO migrations (name) VALUES ('002_position_jsonb') ON CONFLICT (name) DO NOTHING;
`;
