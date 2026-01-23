import { query } from '../../core/pool';
import GameObjectsStore from '../../db/GameObjectsStore';
import { ActionMethod } from './types';

interface MoveToBattlefieldMetadata {
	objectId: string;
	position?: { x: number; y: number };
}
const checkToken = async (objectId: string): Promise<boolean> => {
	const result = await query<{ is_token: boolean }>(`SELECT is_token FROM game_objects WHERE id = $1`, [objectId]);
	return result?.rows?.[0]?.is_token || false;
};
export const moveToBattlefield: ActionMethod<MoveToBattlefieldMetadata> = async (_gameId, _seat, metadata) => {
	const objectId = metadata.objectId;
	const position = metadata.position;
	if (objectId) {
		let updateQuery = `UPDATE game_objects SET zone = 'battlefield'`;
		const params: any[] = [];

		if (position) {
			updateQuery += `, position = $1`;
			params.push(JSON.stringify({ x: position.x, y: position.y }));
		}

		updateQuery += ` WHERE id = $${params.length + 1}`;
		params.push(objectId);

		await query(updateQuery, params);
	}
};

export const moveToGraveyard: ActionMethod = async (_gameId, _seat, metadata) => {
	// Move card to graveyard from battlefield or hand
	// If it's a token, delete it instead
	const objectId = metadata.objectId;
	if (objectId) {
		// Check if it's a token
		const isToken = await checkToken(objectId);

		if (isToken) {
			// Delete token
			await GameObjectsStore().deleteToken(objectId);
		} else {
			// Move card to graveyard
			await GameObjectsStore().moveToGraveyard(objectId);
		}
	}
};

export const moveToHand: ActionMethod = async (_gameId, _seat, metadata) => {
	// Move card back to hand from graveyard or exile
	const objectId = metadata.objectId;
	const isToken = await checkToken(objectId);
	if (isToken) {
		// Delete token
		await GameObjectsStore().deleteToken(objectId);
	} else {
		if (objectId) {
			await GameObjectsStore().moveToHand(objectId);
		}
	}
};

export const cast: ActionMethod = async (_gameId, _seat, metadata) => {
	// Move card from command zone to battlefield (put into play)
	const objectId = metadata.objectId;
	if (objectId) {
		const position = metadata.position || { x: 100, y: 100 };
		await query(`UPDATE game_objects SET zone = 'battlefield', position = $1 WHERE id = $2`, [
			JSON.stringify({ x: position.x, y: position.y }),
			objectId,
		]);
	}
};
