import axios from "axios";
import { CreateDeckRequest, CreateGameRequest } from "./types";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3011";

const client = axios.create({
	baseURL: `${API_URL}/api`,
});

export const api = {
	// Cards
	searchCards: (q: string, limit?: number) =>
		client.get("/cards/search", { params: { q, limit } }),
	getCard: (id: string) => client.get(`/cards/${id}`),

	// Decks
	listDecks: () => client.get("/decks"),
	createDeck: (payload: CreateDeckRequest) => client.post("/decks", payload),
	getDeck: (id: string) => client.get(`/decks/${id}`),
	updateDeck: (id: string, payload: CreateDeckRequest) =>
		client.put(`/decks/${id}`, payload),
	deleteDeck: (id: string) => client.delete(`/decks/${id}`),

	// Games
	listGames: () => client.get("/games"),
	createGame: (payload: CreateGameRequest) => client.post("/games", payload),
	getGame: (id: string, viewerSeat?: 1 | 2) =>
		client.get(`/games/${id}`, {
			params: { viewer_seat: viewerSeat || 1 },
		}),
	getGameTokens: (gameId: string) => client.get(`/games/${gameId}/tokens`),
	getGameComponents: (gameId: string) =>
		client.get(`/games/${gameId}/components`),
	executeAction: (gameId: string, payload: any) =>
		client.post(`/games/${gameId}/action`, payload),
};
