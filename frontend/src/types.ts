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

export enum Zone {
	hand = 'hand',
	library = 'library',
	graveyard = 'graveyard',
	command_zone = 'command_zone',
	exile = 'exile',
	battlefield = 'battlefield',
}
export const ZoneNames: Record<Zone, string> = {
	[Zone.hand]: 'Hand',
	[Zone.library]: 'Library',
	[Zone.graveyard]: 'Graveyard',
	[Zone.command_zone]: 'Command Zone',
	[Zone.exile]: 'Exile',
	[Zone.battlefield]: 'Battlefield',
};
export const Zones = Object.values(Zone);
export type ActionMethod = (action: string, seat?: number, metadata?: any) => void;
