import { query } from '../core/pool';

const GameObjectsStore = () => {
	const moveToLocation = async (objectId: string, zone: string) => {
		await query(`UPDATE game_objects SET zone = $1 WHERE id = $2`, [zone, objectId]);
	};
	const moveToGraveyard = async (objectId: string) => {
		await moveToLocation(objectId, 'graveyard');
	};
	const moveToHand = async (objectId: string) => {
		await moveToLocation(objectId, 'hand');
	};
	const moveToExile = async (objectId: string) => {
		await moveToLocation(objectId, 'exile');
	};
	const moveToCommandZone = async (objectId: string) => {
		await moveToLocation(objectId, 'command');
	};
	const moveToBattlefield = async (objectId: string) => {
		await moveToLocation(objectId, 'battlefield');
	};
	const deleteToken = async (objectId: string) => {
		await query(`DELETE FROM game_objects WHERE id = $1`, [objectId]);
	};
	return {
		moveToGraveyard,
		moveToHand,
		moveToExile,
		moveToCommandZone,
		moveToBattlefield,
		deleteToken,
	};
};
export default GameObjectsStore;
