import { query } from "../../core/pool";
import { ActionMethod } from "./types";

export const moveToHand: ActionMethod = async (_id, _seat, metadata) => {
	// Move card back to hand from graveyard or exile
	const objectId = metadata.objectId;
	if (objectId) {
		await query(`UPDATE game_objects SET zone = 'hand' WHERE id = $1`, [
			objectId,
		]);
	}
};
