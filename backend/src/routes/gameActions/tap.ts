import { query } from '../../core/pool';
import { ActionMethod } from './types';
import Logger from '../../core/logger';

const tap: ActionMethod = async (_gameId, _seat, metadata) => {
	const { objectId } = metadata;
	// Toggle tap state
	const objResult = await query<{ is_tapped: boolean }>(`SELECT is_tapped FROM game_objects WHERE id = $1`, [objectId]);
	if (objResult && objResult.rows && objResult.rows.length > 0) {
		const currentTapped = objResult.rows[0].is_tapped;
		await query(`UPDATE game_objects SET is_tapped = $1 WHERE id = $2`, [!currentTapped, objectId]);
	}
};
const untap: ActionMethod = async (_gameId, _seat, metadata) => {
	await query(`UPDATE game_objects SET is_tapped = false WHERE id = $1`, [metadata.objectId]);
};
const toggleTap: ActionMethod = async (_gameId, _seat, metadata) => {
	const { objectId } = metadata;
	const objResult = await query<{ is_tapped: boolean }>(`SELECT is_tapped FROM game_objects WHERE id = $1`, [objectId]);
	if (objResult?.rows[0].is_tapped) {
		await untap(_gameId, _seat, metadata);
	} else {
		await tap(_gameId, _seat, metadata);
	}
};
const untapAll: ActionMethod = async (gameId, seat, _metadata) => {
	Logger.info(`untapAll called for seat ${seat} in game ${gameId}`);
	const result = await query(
		`UPDATE game_objects SET is_tapped = false WHERE game_session_id = $1 AND seat = $2 AND zone = 'battlefield'`,
		[gameId, seat]
	);
	Logger.info(`untapAll completed: ${result?.rowCount || 0} cards untapped for seat ${seat}`);
};
export { tap, untap, toggleTap, untapAll };
