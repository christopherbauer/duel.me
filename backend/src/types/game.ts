export interface Card {
	id: string;
	name: string;
	type_line: string;
	oracle_text?: string;
	mana_cost?: string;
	cmc?: number;
	power?: string;
	toughness?: string;
	colors?: string[];
	color_identity?: string[];
	keywords?: string[];
	layout: string;
	image_uris?: Record<string, string>;
	imported_at: string;
	updated_at: string;
}

export interface CardFace {
	name: string;
	type_line: string;
	oracle_text?: string;
	power?: string;
	toughness?: string;
	mana_cost?: string;
	image_uri?: string;
}

export interface Deck {
	id: string;
	name: string;
	description?: string;
	commander_ids?: string[];
	created_at: string;
	updated_at: string;
}

export interface DeckCard {
	deck_id: string;
	card_id: string;
	quantity: number;
	zone: "library" | "commander" | "sideboard";
}

export interface GameSession {
	id: string;
	name?: string;
	status: "active" | "paused" | "completed";
	deck1_id: string;
	deck2_id: string;
	created_at: string;
	updated_at: string;
	completed_at?: string;
}

export interface GameObject {
	id: string;
	game_session_id: string;
	seat: 1 | 2;
	zone: Zone;
	card_id: string;
	is_token: boolean;
	is_tapped: boolean;
	is_flipped: boolean;
	counters?: Record<string, number>;
	attachments?: string[];
	notes?: string;
	position?: { x: number; y: number };
	created_at: string;
	updated_at: string;
}

export type Zone =
	| "library"
	| "hand"
	| "battlefield"
	| "graveyard"
	| "exile"
	| "command_zone"
	| "stack";

export interface GameState {
	game_session_id: string;
	seat1_life: number;
	seat2_life: number;
	seat1_commander_damage: number;
	seat2_commander_damage: number;
	active_seat: 1 | 2;
	turn_number: number;
	created_at: string;
	updated_at: string;
}

export interface GameAction {
	id: string;
	game_session_id: string;
	seat: 1 | 2;
	action_type: string;
	target_object_id?: string;
	metadata?: Record<string, any>;
	created_at: string;
}

// Visibility/Projection types
export interface GameStateView {
	game_session_id: string;
	seat1_life: number;
	seat2_life: number;
	seat1_commander_damage: number;
	seat2_commander_damage: number;
	active_seat: 1 | 2;
	turn_number: number;
	// Zones are projected based on viewer seat
	objects: GameObjectView[];
}

export interface GameObjectView {
	id: string;
	seat: 1 | 2;
	zone: Zone;
	card: Card | { id: string; name: string } | null; // Full card if public, minimal if hidden
	is_tapped?: boolean;
	is_flipped?: boolean;
	counters?: Record<string, number>;
	notes?: string;
	position?: { x: number; y: number };
}
