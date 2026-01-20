import { query } from "../../db/pool";
import { ActionMethod } from "./types";

export const moveToBattlefield: ActionMethod = async (
	_id,
	_seat,
	metadata: {
		objectId: string;
		position?: { x: number; y: number };
	},
) => {
	// metadata.objectId contains the card ID to move
	// metadata.position contains { x, y } coordinates
	const objectId = metadata.objectId;
	const position = metadata.position;
	if (objectId) {
		let updateQuery = `UPDATE game_objects SET zone = 'battlefield'`;
		const params: any[] = [];

		if (position) {
			updateQuery += `, position = $1`;
			params.push(JSON.stringify({ x: position.x, y: position.y }));
		}

		updateQuery += ` WHERE id = $${params.length + 1}`;
		params.push(objectId);

		await query(updateQuery, params);
	}
};

export const moveToGraveyard: ActionMethod = async (_id, _seat, metadata) => {
	// Move card to graveyard from battlefield or hand
	const objectId = metadata.objectId;
	if (objectId) {
		await query(
			`UPDATE game_objects SET zone = 'graveyard' WHERE id = $1`,
			[objectId],
		);
	}
};
