export enum ContextMenuType {
	Library = 'library',
	Hand = 'hand',
	Graveyard = 'graveyard',
	Exile = 'exile',
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
