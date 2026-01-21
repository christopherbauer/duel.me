import logger from "../../core/logger";
import { query } from "../../core/pool";
import { GameObjectId } from "../../types/game";
import { ActionMethod } from "./types";

export const moveToExile: ActionMethod = async (_id, seat, metadata) => {
	const count = metadata.count || 1;
	// Move card from any zone to exile, or delete if it's a token
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
			// Move card to exile
			await query(
				`UPDATE game_objects SET zone = 'exile' WHERE id = $1`,
				[objectId],
			);
		}
	}
	logger.info(`Exiled ${count} cards from library by seat ${seat}`);
};

export const exileTopFromLibrary = async (
	id: string,
	seat: number,
	metadata: { count?: number },
) => {
	// Exile X cards from top of library
	const count = metadata.count || 1;
	const exileResult = await query<GameObjectId>(
		`SELECT id FROM game_objects 
				 WHERE game_session_id = $1 AND seat = $2 AND zone = 'library'
				 ORDER BY "order", id
				 LIMIT $3`,
		[id, seat, count],
	);
	if (exileResult && exileResult.rows) {
		for (const row of exileResult.rows) {
			await query(
				`UPDATE game_objects SET zone = 'exile' WHERE id = $1`,
				[row.id],
			);
		}
	}
	logger.info(`Exiled ${count} cards from library by seat ${seat}`);
};
