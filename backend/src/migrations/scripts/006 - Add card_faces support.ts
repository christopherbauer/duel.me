import { query } from '../../core/pool';

export const migration006 = async (): Promise<void> => {
	try {
		console.log('Running migration: Add card_faces support for dual-faced cards');

		// Check if column already exists
		const checkColumn = await query(`
			SELECT column_name FROM information_schema.columns 
			WHERE table_name = 'cards' AND column_name = 'card_faces'
		`);

		if (!checkColumn || checkColumn.rows.length === 0) {
			// Add card_faces column to store dual-faced card data
			await query(`
				ALTER TABLE cards 
				ADD COLUMN card_faces JSONB;
			`);
			console.log('Added card_faces column to cards table');
		} else {
			console.log('card_faces column already exists');
		}

		// Record migration as complete
		await query(`
			INSERT INTO migrations (name) VALUES ('006_add_card_faces')
			ON CONFLICT (name) DO NOTHING
		`);

		console.log('✓ Migration 006 completed successfully');
	} catch (error) {
		console.error('Migration 006 failed:', error);
		throw error;
	}
};
