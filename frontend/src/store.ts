import { create } from 'zustand';
import { Zone } from './types';

export interface Indicator {
	id: string;
	seat: number;
	position: Position;
	color: string;
}

export interface GameState {
	game_session_id: string;
	seat1_life: number;
	seat2_life?: number;
	seat3_life?: number;
	seat4_life?: number;
	seat1_commander_damage: number;
	seat2_commander_damage?: number;
	seat3_commander_damage?: number;
	seat4_commander_damage?: number;
	active_seat: 1 | 2 | 3 | 4;
	turn_number: number;
	objects: GameStateObjects[];
	indicators?: Indicator[];
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
	B = 'B',
	G = 'G',
	R = 'R',
	U = 'U',
	W = 'W',
}

export enum Layout {
	Class = 'class',
	Normal = 'normal',
}

export interface Counters {
	plus_one_plus_one?: number;
	minus_one_minus_one?: number;
	charge?: number;
	generic?: number;
}

export interface Position {
	x: number;
	y: number;
}

export interface GameStore {
	currentGameId: string | null;
	viewerSeat: 1 | 2;
	gameState: GameState | null;
	availableTokens: Card[];
	availableComponents: Card[];

	setCurrentGame: (gameId: string) => void;
	setViewerSeat: (seat: 1 | 2) => void;
	setGameState: (state: GameState) => void;
	setAvailableTokens: (tokens: Card[]) => void;
	setAvailableComponents: (components: Card[]) => void;
	clearGame: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
	currentGameId: null,
	viewerSeat: 1,
	gameState: null,
	availableTokens: [],
	availableComponents: [],

	setCurrentGame: (gameId: string) => set({ currentGameId: gameId }),
	setViewerSeat: (seat: 1 | 2) => set({ viewerSeat: seat }),
	setGameState: (state: GameState) => {
		set({ gameState: state });
		set({ viewerSeat: state.active_seat });
	},
	setAvailableTokens: (tokens: Card[]) => set({ availableTokens: tokens }),
	setAvailableComponents: (components: Card[]) => set({ availableComponents: components }),
	clearGame: () =>
		set({
			currentGameId: null,
			gameState: null,
			viewerSeat: 1,
			availableTokens: [],
			availableComponents: [],
		}),
}));
