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

export type ActionMethod = (
	action: string,
	seat?: number,
	metadata?: any,
) => void;
