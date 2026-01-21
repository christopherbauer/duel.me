import { tap, untap, toggle_tap } from "./tap";
import { shuffleLibrary } from "./shuffle";
import { drawFromLibrary, moveToLibrary, scry, surveil } from "./library";
import { lifeChange } from "./lifeChange";
import { exileTopFromLibrary, moveToExile } from "./exile";
import { moveToHand } from "./hand";
import { moveToBattlefield, moveToGraveyard } from "./play";
import { ActionMethod } from "./types";
import { query } from "../../db/pool";
import { addCounter, removeCounter } from "./counters";

enum Actions {
	tap,
	untap,
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
}

const actionMap: Record<keyof typeof Actions, ActionMethod> = {
	tap: tap,
	untap: untap,
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
};
export const handleGameAction = async (
	action: keyof typeof Actions,
	id: string,
	seat: number,
	metadata: any,
) => {
	const result = await actionMap[action](id, seat, metadata);
	await query(`UPDATE game_sessions SET updated_at = NOW() WHERE id = $1`, [
		id,
	]);
	return result;
};
