import { query } from '../../core/pool';

export const migration007 = async (): Promise<void> => {
	try {
		console.log('Running migration: Make deck columns nullable for multi-player support');

		// Make deck2_id nullable to support 1-player games
		await query(`
			ALTER TABLE game_sessions 
			ALTER COLUMN deck2_id DROP NOT NULL;
		`).catch((err) => {
			// Column might already be nullable, that's ok
			console.log('deck2_id is already nullable or constraint does not exist');
		});

		console.log('Migration 007 completed successfully');
	} catch (error) {
		console.error('Migration 007 failed:', error);
		throw error;
	}
};
