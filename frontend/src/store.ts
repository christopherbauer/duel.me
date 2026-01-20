import { create } from "zustand";

export interface GameState {
	game_session_id: string;
	seat1_life: number;
	seat2_life: number;
	seat1_commander_damage: number;
	seat2_commander_damage: number;
	active_seat: 1 | 2;
	turn_number: number;
	objects: GameStateObjects[];
}

export interface GameStateObjects {
	id: string;
	seat: number;
	zone: Zone;
	card: Card | null;
	is_tapped: boolean;
	is_flipped: boolean;
	counters: Counters;
	notes: null;
	position: Position | null;
}
export interface Card {
	id: string;
	name: string;
	type_line: string;
	oracle_text: string;
	mana_cost: string;
	cmc: number;
	power: string;
	toughness: string;
	colors: string[];
	color_identity: string[];
	keywords: string[];
	layout: Layout;
	image_uris: ImageUris;
}
export interface ImageUris {
	png: string;
	large: string;
	small: string;
	normal: string;
	art_crop: string;
	border_crop: string;
}

export enum Color {
	B = "B",
	G = "G",
	R = "R",
	U = "U",
	W = "W",
}

export interface ImageUris {
	png: string;
	large: string;
	small: string;
	normal: string;
	art_crop: string;
	border_crop: string;
}

export enum Layout {
	Class = "class",
	Normal = "normal",
}

export interface Counters {}

export interface Position {
	x: number;
	y: number;
}

export enum Zone {
	Battlefield = "battlefield",
	CommandZone = "command_zone",
	Library = "library",
	Exile = "exile",
}

export interface GameStore {
	currentGameId: string | null;
	viewerSeat: 1 | 2;
	gameState: GameState | null;

	setCurrentGame: (gameId: string) => void;
	setViewerSeat: (seat: 1 | 2) => void;
	setGameState: (state: GameState) => void;
	clearGame: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
	currentGameId: null,
	viewerSeat: 1,
	gameState: null,

	setCurrentGame: (gameId: string) => set({ currentGameId: gameId }),
	setViewerSeat: (seat: 1 | 2) => set({ viewerSeat: seat }),
	setGameState: (state: GameState) => set({ gameState: state }),
	clearGame: () =>
		set({ currentGameId: null, gameState: null, viewerSeat: 1 }),
}));
