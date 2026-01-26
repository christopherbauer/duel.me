import { query } from '../../core/pool';
import { ActionMethod } from './types';
import logger from '../../core/logger';
import { Actions, handleGameAction } from '.';

export const endTurn: ActionMethod = async (gameId, _seat, _metadata) => {
	// Get current game state to determine next player
	const gameStateResult = await query<{ active_seat: number; turn_number: number }>(
		`SELECT active_seat, turn_number FROM game_state WHERE game_session_id = $1`,
		[gameId]
	);

	if (!gameStateResult?.rows[0]) {
		throw new Error('Game state not found');
	}

	const { active_seat, turn_number } = gameStateResult.rows[0];
	const nextSeat = active_seat === 1 ? 2 : 1;

	logger.info(`End turn: changing from seat ${active_seat} to seat ${nextSeat}, turn ${turn_number} -> ${turn_number + 1}`);

	// Update game state with next active seat and increment turn
	const updateResult = await query(`UPDATE game_state SET active_seat = $1, turn_number = $2 WHERE game_session_id = $3`, [
		nextSeat,
		turn_number + 1,
		gameId,
	]);

	logger.info(`Update result: ${updateResult?.rowCount} rows affected`);

	// Verify the update
	const verifyResult = await query<{ active_seat: number; turn_number: number }>(
		`SELECT active_seat, turn_number FROM game_state WHERE game_session_id = $1`,
		[gameId]
	);
	logger.info(`Verified: active_seat=${verifyResult?.rows[0]?.active_seat}, turn_number=${verifyResult?.rows[0]?.turn_number}`);

	await handleGameAction(Actions.untap_all, gameId, nextSeat, {});
	await handleGameAction(Actions.draw, gameId, nextSeat, { count: 1 });
};
