export enum ContextMenuType {
	Library = 'library',
	Hand = 'hand',
	Graveyard = 'graveyard',
	Exile = 'exile',
	CommandZone = 'command_zone',
	Battlefield = 'battlefield',
}

export interface MenuItem {
	label: string;
	action?: string;
	metadata?: any;
	submenu?: MenuItem[];
	isCounterSection?: boolean;
	counterItems?: { type: string; label: string; count: number }[];
}
