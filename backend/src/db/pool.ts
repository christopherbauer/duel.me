import { Pool } from "pg";
import logger from "../core/logger";

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err: Error) => {
	console.error("Unexpected error on idle client", err);
});

export async function query<T>(text: string, params?: any[]) {
	const start = Date.now();
	try {
		const res = await pool.query(text, params);
		const duration = Date.now() - start;
		logger.debug(
			`Executed query\n${JSON.stringify({
				text,
				duration,
				rows: res.rowCount,
			})}`,
		);
		return res as { rows: T[]; rowCount: number };
	} catch (error) {
		logger.info(`Database query error`);
		logger.catchError(error);
	}
}

export async function getClient() {
	return pool.connect();
}

export async function closePool() {
	await pool.end();
}
