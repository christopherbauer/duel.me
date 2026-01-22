import { useGameStore } from '../../store';
import { MenuItem } from './types';

export const libraryMenuItems = (): MenuItem[] => [
	{ label: 'Search Library', action: 'search_library' },
	{ label: 'Shuffle Library', action: 'shuffle_library' },
	{
		label: 'Draw',
		submenu: [
			{ label: '1', action: 'draw', metadata: { count: 1 } },
			{ label: '2', action: 'draw', metadata: { count: 2 } },
			{ label: '3', action: 'draw', metadata: { count: 3 } },
			{ label: '4', action: 'draw', metadata: { count: 4 } },
		],
	},
	{
		label: 'Scry',
		submenu: [
			{ label: '1', action: 'scry', metadata: { count: 1 } },
			{ label: '2', action: 'scry', metadata: { count: 2 } },
			{ label: '3', action: 'scry', metadata: { count: 3 } },
			{ label: '4', action: 'scry', metadata: { count: 4 } },
		],
	},
	{
		label: 'Surveil',
		submenu: [
			{ label: '1', action: 'surveil', metadata: { count: 1 } },
			{ label: '2', action: 'surveil', metadata: { count: 2 } },
			{ label: '3', action: 'surveil', metadata: { count: 3 } },
			{ label: '4', action: 'surveil', metadata: { count: 4 } },
		],
	},
	{
		label: 'Exile',
		submenu: [
			{ label: '1', action: 'exile_from_top', metadata: { count: 1 } },
			{ label: '2', action: 'exile_from_top', metadata: { count: 2 } },
			{ label: '3', action: 'exile_from_top', metadata: { count: 3 } },
			{ label: '4', action: 'exile_from_top', metadata: { count: 4 } },
		],
	},
];
export const handMenuItems = (objectId?: string): MenuItem[] => [
	{
		label: 'Cast',
		action: 'cast',
		metadata: { objectId },
	},
	{
		label: 'Move to Exile',
		action: 'move_to_exile',
		metadata: { objectId },
	},
	{
		label: 'Discard',
		action: 'discard',
		metadata: { objectId },
	},
];
export const graveyardMenuItems = (objectId?: string): MenuItem[] => [
	{
		label: 'Return to Hand',
		action: 'move_to_hand',
		metadata: { objectId },
	},
	{
		label: 'Return to Library',
		action: 'move_to_library',
		metadata: { objectId },
	},
];
export const exileMenuItems = (objectId?: string): MenuItem[] => [
	{
		label: 'Return to Hand',
		action: 'move_to_hand',
		metadata: { objectId },
	},
];
export const battlefieldMenuItems = (objectId?: string): MenuItem[] => {
	// Get counters for this object from the store
	const gameState = useGameStore.getState().gameState;
	if (!gameState) return [];
	const obj = gameState?.objects.find((o) => o.id === objectId);
	const counters = obj?.counters || {};
	const counterTypes = [
		{ type: 'plus_one_plus_one', label: '+1/+1' },
		{ type: 'minus_one_minus_one', label: '-1/-1' },
		{ type: 'charge', label: 'Charge' },
		{ type: 'generic', label: 'Generic' },
	];

	// Build counter items for the counters section
	const counterDisplayItems = counterTypes.map((ct) => ({
		type: ct.type,
		label: ct.label,
		count: (counters as any)[ct.type] || 0,
	}));

	return [
		{
			label: 'Tap/Untap',
			action: 'toggle_tap',
			metadata: { objectId },
		},
		{
			label: 'Counters',
			isCounterSection: true,
			counterItems: counterDisplayItems,
		},
		{
			label: 'Add Counter',
			submenu: counterTypes.map((ct) => ({
				label: ct.label,
				action: 'add_counter',
				metadata: { objectId, counterType: ct.type },
			})),
		},
		{
			label: 'Remove Counter',
			submenu: counterTypes.map((ct) => ({
				label: ct.label,
				action: 'remove_counter',
				metadata: { objectId, counterType: ct.type },
			})),
		},
		{
			label: 'Create Token Copy',
			submenu: [
				{
					label: '1',
					action: 'create_token_copy',
					metadata: { sourceObjectId: objectId, quantity: 1 },
				},
				{
					label: '2',
					action: 'create_token_copy',
					metadata: { sourceObjectId: objectId, quantity: 2 },
				},
				{
					label: '3',
					action: 'create_token_copy',
					metadata: { sourceObjectId: objectId, quantity: 3 },
				},
				{
					label: '4',
					action: 'create_token_copy',
					metadata: { sourceObjectId: objectId, quantity: 4 },
				},
			],
		},
		{
			label: 'Move to Hand',
			action: 'move_to_hand',
			metadata: { objectId },
		},
		{
			label: 'Move to Graveyard',
			action: 'move_to_graveyard',
			metadata: { objectId },
		},
		{
			label: 'Exile',
			action: 'move_to_exile',
			metadata: { objectId },
		},
	];
};
