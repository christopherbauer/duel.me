import { v4 as uuidv4 } from 'uuid';
import { tap, untap, toggleTap, untapAll } from './tap';
import { drawFromLibrary, moveToLibrary, scry, shuffleLibrary, surveil, mill } from './library';
import { lifeChange } from './lifeChange';
import { exileTopFromLibrary, moveToExile } from './exile';
import { moveToBattlefield, moveToGraveyard, moveToHand, cast } from './play';
import { createTokenCopy, removeToken } from './tokens';
import { createIndicator, moveIndicator, deleteIndicator } from './indicators';
import { endTurn } from './endTurn';
import { ActionMethod } from './types';
import { query } from '../../core/pool';
import { addCounter, removeCounter } from './counters';
import logger from '../../core/logger';

export enum Actions {
	tap = 'tap',
	untap = 'untap',
	toggle_tap = 'toggle_tap',
	shuffle_library = 'shuffle_library',
	mill = 'mill',
	draw = 'draw',
	life_change = 'life_change',
	exile_from_top = 'exile_from_top',
	scry = 'scry',
	surveil = 'surveil',
	move_to_exile = 'move_to_exile',
	move_to_library = 'move_to_library',
	move_to_hand = 'move_to_hand',
	move_to_battlefield = 'move_to_battlefield',
	move_to_graveyard = 'move_to_graveyard',
	discard = 'discard',
	add_counter = 'add_counter',
	remove_counter = 'remove_counter',
	create_token_copy = 'create_token_copy',
	remove_token = 'remove_token',
	untap_all = 'untap_all',
	create_indicator = 'create_indicator',
	move_indicator = 'move_indicator',
	delete_indicator = 'delete_indicator',
	cast = 'cast',
	end_turn = 'end_turn',
}

const actionMap: Record<keyof typeof Actions, ActionMethod> = {
	tap: tap,
	untap: untap,
	untap_all: untapAll,
	toggle_tap: toggleTap,
	shuffle_library: shuffleLibrary,
	mill: mill,
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
	create_indicator: createIndicator,
	move_indicator: moveIndicator,
	delete_indicator: deleteIndicator,
	cast: cast,
	end_turn: endTurn,
};
export const handleGameAction = async (action: keyof typeof Actions, gameId: string, seat: number, metadata: any) => {
	logger.debug(`handleGameAction called with action: ${String(action)}`);
	logger.debug(`action in actionMap: ${action in actionMap}`);
	await actionMap[action](gameId, seat, metadata);
	await query(`UPDATE game_sessions SET updated_at = NOW() WHERE id = $1`, [gameId]);
	const actionId = uuidv4();

	const { target_object_id } = metadata;
	// Log action
	await query(
		`INSERT INTO game_actions (id, game_session_id, seat, action_type, target_object_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
		[actionId, gameId, seat, action, target_object_id || null, JSON.stringify(metadata)]
	);
	return actionId;
};
