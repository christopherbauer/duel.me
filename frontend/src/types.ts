export interface CreateDeckRequest {
	name: string;
	description: string;
	cardLines: string[];
	commanderCardNames: string[];
}
export interface CreateGameRequest {
	deck1_id: string;
	deck2_id: string;
	name: string;
}
