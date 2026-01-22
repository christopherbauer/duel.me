import { query } from '../../core/pool';
import { ActionMethod } from './types';
enum CounterTypes {
	plus_one_plus_one = 'plus_one_plus_one',
	minus_one_minus_one = 'minus_one_minus_one',
	charge = 'charge',
	generic = 'generic',
}

type Metadata = {
	counterType: CounterTypes;
	amount?: number;
	objectId: string;
};
export const addCounter: ActionMethod = async (gameId, seat, metadata: Metadata) => {
	const { objectId, counterType, amount = 1 } = metadata;
	if (!objectId || !counterType) return;
	// Fetch current counters
	const result = await query<{ counters: Record<string, number> | null }>(`SELECT counters FROM game_objects WHERE id = $1`, [objectId]);
	let counters = (result?.rows?.[0]?.counters as Record<string, number> | null) || {};
	if (!counters[counterType]) counters[counterType] = 0;
	counters[counterType] += amount;
	await query(`UPDATE game_objects SET counters = $1 WHERE id = $2`, [JSON.stringify(counters), objectId]);
};

export const removeCounter: ActionMethod = async (gameId, seat, metadata: Metadata) => {
	const { objectId, counterType, amount = 1 } = metadata;
	if (!objectId || !counterType) return;
	// Fetch current counters
	const result = await query<{ counters: Record<string, number> | null }>(`SELECT counters FROM game_objects WHERE id = $1`, [objectId]);
	let counters = (result?.rows?.[0]?.counters as Record<string, number> | null) || {};
	if (!counters[counterType]) return; // Nothing to remove
	counters[counterType] -= amount;
	if (counters[counterType] <= 0) {
		delete counters[counterType];
	}
	await query(`UPDATE game_objects SET counters = $1 WHERE id = $2`, [
		Object.keys(counters).length ? JSON.stringify(counters) : null,
		objectId,
	]);
};
