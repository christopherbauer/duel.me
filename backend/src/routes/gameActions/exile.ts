import logger from "../../core/logger";
import { query } from "../../db/pool";
import { GameObjectId } from "../../types/game";
import { ActionMethod } from "./types";

export const moveToExile: ActionMethod = async (_id, seat, metadata) => {
	const count = metadata.count || 1;
	// Move card from any zone to exile
	const objectId = metadata.objectId;
	if (objectId) {
		await query(`UPDATE game_objects SET zone = 'exile' WHERE id = $1`, [
			objectId,
		]);
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
