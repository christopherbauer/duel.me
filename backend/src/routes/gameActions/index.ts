import { tap, untap, toggleTap, untapAll } from './tap';
import { drawFromLibrary, moveToLibrary, scry, shuffleLibrary, surveil } from './library';
import { lifeChange } from './lifeChange';
import { exileTopFromLibrary, moveToExile } from './exile';
import { moveToBattlefield, moveToGraveyard, moveToHand } from './play';
import { createTokenCopy, removeToken } from './tokens';
import { ActionMethod } from './types';
import { query } from '../../core/pool';
import { addCounter, removeCounter } from './counters';

enum Actions {
	tap,
	untap,
	toggle_tap,
	shuffle_library,
	draw,
	life_change,
	exile_from_top,
	scry,
	surveil,
	move_to_exile,
	move_to_library,
	move_to_hand,
	move_to_battlefield,
	move_to_graveyard,
	discard,
	add_counter,
	remove_counter,
	create_token_copy,
	remove_token,
	untap_all,
}

const actionMap: Record<keyof typeof Actions, ActionMethod> = {
	tap: tap,
	untap: untap,
	untap_all: untapAll,
	toggle_tap: toggleTap,
	shuffle_library: shuffleLibrary,
	draw: drawFromLibrary,
	life_change: lifeChange,
	exile_from_top: exileTopFromLibrary,
	scry: scry,
	surveil: surveil,
	move_to_hand: moveToHand,
	move_to_library: moveToLibrary,
	move_to_exile: moveToExile,
	move_to_battlefield: moveToBattlefield,
	move_to_graveyard: moveToGraveyard,
	discard: moveToGraveyard,
	add_counter: addCounter,
	remove_counter: removeCounter,
	create_token_copy: createTokenCopy,
	remove_token: removeToken,
};
export const handleGameAction = async (action: keyof typeof Actions, id: string, seat: number, metadata: any) => {
	console.log(`handleGameAction called with action: ${String(action)}`);
	console.log(`actionMap keys:`, Object.keys(actionMap));
	console.log(`action in actionMap:`, action in actionMap);
	const result = await actionMap[action](id, seat, metadata);
	await query(`UPDATE game_sessions SET updated_at = NOW() WHERE id = $1`, [id]);
	return result;
};
