import { query } from '../../core/pool';

export const migration005 = async (): Promise<void> => {
	try {
		console.log('Running migration: Add support for up to 4 players');

		// Update game_objects seat check constraint to allow seats 1-4
		await query(`
			ALTER TABLE game_objects DROP CONSTRAINT game_objects_seat_check;
		`).catch(() => {
			// Constraint might not exist or have different name, that's ok
		});

		await query(`
			ALTER TABLE game_objects ADD CONSTRAINT game_objects_seat_check CHECK (seat IN (1, 2, 3, 4));
		`).catch(() => {
			// Constraint might already exist, that's ok
		});

		// Add seat3_life, seat4_life and their corresponding commander damage columns
		const checkColumn = await query(`
			SELECT column_name FROM information_schema.columns 
			WHERE table_name = 'game_state' AND column_name = 'seat3_life'
		`);

		if (!checkColumn || checkColumn.rows.length === 0) {
			await query(`
				ALTER TABLE game_state 
				ADD COLUMN seat3_life INT DEFAULT 40,
				ADD COLUMN seat4_life INT DEFAULT 40,
				ADD COLUMN seat3_commander_damage INT DEFAULT 0,
				ADD COLUMN seat4_commander_damage INT DEFAULT 0;
			`);
		}

		// Add player_count column to game_sessions to track how many players
		const checkPlayerCount = await query(`
			SELECT column_name FROM information_schema.columns 
			WHERE table_name = 'game_sessions' AND column_name = 'player_count'
		`);

		if (!checkPlayerCount || checkPlayerCount.rows.length === 0) {
			await query(`
				ALTER TABLE game_sessions 
				ADD COLUMN player_count INT DEFAULT 2 CHECK (player_count IN (1, 2, 3, 4));
			`);
		}

		// Add deck3_id and deck4_id to game_sessions
		const checkDeck3 = await query(`
			SELECT column_name FROM information_schema.columns 
			WHERE table_name = 'game_sessions' AND column_name = 'deck3_id'
		`);

		if (!checkDeck3 || checkDeck3.rows.length === 0) {
			await query(`
				ALTER TABLE game_sessions 
				ADD COLUMN deck3_id UUID REFERENCES decks(id),
				ADD COLUMN deck4_id UUID REFERENCES decks(id);
			`);
		}

		console.log('Migration 005 completed successfully');
	} catch (error) {
		console.error('Migration 005 failed:', error);
		throw error;
	}
};
