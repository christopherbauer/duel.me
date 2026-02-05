import { query } from '../../core/pool';
import logger from '../../core/logger';

export const migration008 = async (): Promise<void> => {
	try {
		// Add controller column - defaults to the seat (owner) of the card
		await query(
			`ALTER TABLE game_objects 
			 ADD COLUMN controller INTEGER`
		);
		logger.info('Migration 008: Added controller column to game_objects');

		// Update all existing cards so controller matches their owner (seat)
		await query(`UPDATE game_objects SET controller = seat`);
		logger.info('Migration 008: Set all controllers to match their seat (owner)');
	} catch (err) {
		logger.catchError(err);
		throw err;
	}
};
