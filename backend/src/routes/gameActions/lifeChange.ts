import { query } from '../../core/pool';
import { ActionMethod } from './types';

interface LifeChangeMetadata {
	amount: number;
}
export const lifeChange: ActionMethod<LifeChangeMetadata> = async (gameId, seat, metadata) => {
	const { amount } = metadata;
	if (amount && typeof amount === 'number') {
		const column = seat === 1 ? 'seat1_life' : 'seat2_life';
		await query(`UPDATE game_state SET ${column} = ${column} + $1 WHERE game_session_id = $2`, [amount, gameId]);
	}
};
