import { create } from "zustand";

export interface Card {
	id: string;
	name: string;
	type_line: string;
	mana_cost?: string;
	colors?: string[];
}

export interface GameState {
	game_session_id: string;
	seat1_life: number;
	seat2_life: number;
	seat1_commander_damage: number;
	seat2_commander_damage: number;
	active_seat: 1 | 2;
	turn_number: number;
	objects: any[];
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
