import { query } from '../../core/pool';
import { ActionMethod } from './types';

export const createIndicator: ActionMethod = async (gameId, seat, metadata) => {
	const { position, color } = metadata;

	if (!position || !color) {
		throw new Error('Invalid metadata for create_indicator: position and color required');
	}

	await query(
		`INSERT INTO battlefield_indicators (game_session_id, seat, position, color)
		 VALUES ($1, $2, $3, $4)
		 RETURNING *`,
		[gameId, seat, JSON.stringify(position), color]
	);
};
interface MoveIndicatorMetadata {
	indicatorId: string;
	position: { x: number; y: number };
}
export const moveIndicator: ActionMethod<MoveIndicatorMetadata> = async (gameId, seat, metadata) => {
	const { indicatorId, position } = metadata;

	if (!indicatorId || !position) {
		throw new Error('Invalid metadata for move_indicator: indicatorId and position required');
	}

	await query(
		`UPDATE battlefield_indicators 
		 SET position = $1, updated_at = NOW()
		 WHERE id = $2 AND seat = $3
		 RETURNING *`,
		[JSON.stringify(position), indicatorId, seat]
	);
};
interface DeleteIndicatorMetadata {
	indicatorId: string;
}
export const deleteIndicator: ActionMethod<DeleteIndicatorMetadata> = async (gameId, seat, metadata) => {
	const { indicatorId } = metadata;

	if (!indicatorId) {
		throw new Error('Invalid metadata for delete_indicator: indicatorId required');
	}

	await query(
		`DELETE FROM battlefield_indicators 
		 WHERE id = $1 AND seat = $2
		 RETURNING *`,
		[indicatorId, seat]
	);
};
