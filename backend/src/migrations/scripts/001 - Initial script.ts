export const migration_001 = `
-- Create schema version tracking
CREATE TABLE IF NOT EXISTS migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  executed_at TIMESTAMP DEFAULT NOW()
);

-- Cards table (Scryfall bulk data)
CREATE TABLE IF NOT EXISTS cards (
  object VARCHAR(50),
  id UUID PRIMARY KEY,
  oracle_id UUID,
  multiverse_ids JSONB,
  mtgo_id INT,
  tcgplayer_id INT,
  cardmarket_id INT,
  name VARCHAR(255) NOT NULL,
  lang VARCHAR(10),
  released_at DATE,
  uri TEXT,
  scryfall_uri TEXT,
  layout VARCHAR(50),
  highres_image BOOLEAN,
  image_status VARCHAR(50),
  image_uris JSONB,
  mana_cost VARCHAR(100),
  cmc NUMERIC,
  type_line TEXT,
  oracle_text TEXT,
  power VARCHAR(10),
  toughness VARCHAR(10),
  colors JSONB,
  color_identity JSONB,
  keywords JSONB,
  all_parts JSONB,
  legalities JSONB,
  games JSONB,
  reserved BOOLEAN,
  game_changer BOOLEAN,
  foil JSONB,
  nonfoil JSONB,
  finishes JSONB,
  oversized BOOLEAN,
  promo BOOLEAN,
  reprint BOOLEAN,
  variation BOOLEAN,
  set VARCHAR(50),
  rarity VARCHAR(50),
  imported_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cards_name ON cards(name);
CREATE INDEX idx_cards_id ON cards(id);
CREATE INDEX idx_cards_type_line ON cards USING gin(to_tsvector('english', type_line));

-- Bulk data import metadata
CREATE TABLE IF NOT EXISTS card_snapshots (
  id SERIAL PRIMARY KEY,
  dataset_type VARCHAR(50) NOT NULL, -- 'scryfall', 'mtgjson', etc.
  source_url TEXT,
  imported_at TIMESTAMP DEFAULT NOW(),
  checksum VARCHAR(64),
  total_cards INT,
  CONSTRAINT unique_snapshot UNIQUE (dataset_type, checksum)
);

-- Decks
CREATE TABLE IF NOT EXISTS decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  commander_ids UUID[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Deck contents
CREATE TABLE IF NOT EXISTS deck_cards (
  id SERIAL PRIMARY KEY,
  deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES cards(id),
  quantity INT NOT NULL CHECK (quantity > 0),
  zone VARCHAR(50) DEFAULT 'library', -- 'library', 'commander', 'sideboard'
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_deck_card UNIQUE (deck_id, card_id, zone)
);

-- Game sessions (ephemeral, multi-game support)
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'paused', 'completed'
  deck1_id UUID NOT NULL REFERENCES decks(id),
  deck2_id UUID NOT NULL REFERENCES decks(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Game state (zones and objects per seat)
CREATE TABLE IF NOT EXISTS game_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  seat INT NOT NULL CHECK (seat IN (1, 2)), -- Seat 1 or 2
  zone VARCHAR(50) NOT NULL, -- 'library', 'hand', 'battlefield', 'graveyard', 'exile', 'command_zone', 'stack'
  card_id UUID NOT NULL REFERENCES cards(id),
  is_token BOOLEAN DEFAULT FALSE,
  is_tapped BOOLEAN DEFAULT FALSE,
  is_flipped BOOLEAN DEFAULT FALSE,
  counters JSONB DEFAULT '{}', -- e.g., {'+1/+1': 3, 'poison': 1}
  attachments UUID[], -- IDs of cards attached to this object
  notes TEXT,
  position JSONB, -- For battlefield positioning: {x: number, y: number}
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_game_objects_session ON game_objects(game_session_id);
CREATE INDEX idx_game_objects_zone ON game_objects(zone);

-- Game state summary (life, commander damage, etc.)
CREATE TABLE IF NOT EXISTS game_state (
  id SERIAL PRIMARY KEY,
  game_session_id UUID UNIQUE NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  seat1_life INT DEFAULT 40,
  seat2_life INT DEFAULT 40,
  seat1_commander_damage INT DEFAULT 0,
  seat2_commander_damage INT DEFAULT 0,
  active_seat INT DEFAULT 1,
  turn_number INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Action history (audit trail + replay support)
CREATE TABLE IF NOT EXISTS game_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  seat INT NOT NULL,
  action_type VARCHAR(50) NOT NULL, -- 'draw', 'play', 'tap', 'counter_add', etc.
  target_object_id UUID REFERENCES game_objects(id),
  metadata JSONB, -- Stores action-specific data
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_game_actions_session ON game_actions(game_session_id);
CREATE INDEX idx_game_actions_action_type ON game_actions(action_type);

-- Record migration
INSERT INTO migrations (name) VALUES ('001_initial_schema') ON CONFLICT (name) DO NOTHING;

-- Alter position column if it exists and is the wrong type
ALTER TABLE IF EXISTS game_objects
  ALTER COLUMN position TYPE JSONB USING NULL;
`;
