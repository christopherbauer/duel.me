import logger from '../core/logger';
import { query } from '../core/pool';
import { migrations } from './scripts';

export async function migrate() {
	try {
		logger.info('Starting database migrations...');
		for (const migration of migrations) {
			if (typeof migration === 'string') {
				await query(migration);
			} else if (typeof migration === 'function') {
				await migration();
			}
		}
	} catch (error) {
		logger.info(`Migration failed`);
		logger.catchError(error);
		throw error;
	}
}

if (require.main === module) {
	migrate().then(() => process.exit(0));
}
