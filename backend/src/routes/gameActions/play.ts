import { query } from "../../core/pool";
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
	// If it's a token, delete it instead
	const objectId = metadata.objectId;
	if (objectId) {
		// Check if it's a token
		const checkToken = await query<{ is_token: boolean }>(
			`SELECT is_token FROM game_objects WHERE id = $1`,
			[objectId],
		);

		if (checkToken?.rows?.[0]?.is_token) {
			// Delete token
			await query(`DELETE FROM game_objects WHERE id = $1`, [objectId]);
		} else {
			// Move card to graveyard
			await query(
				`UPDATE game_objects SET zone = 'graveyard' WHERE id = $1`,
				[objectId],
			);
		}
	}
};
