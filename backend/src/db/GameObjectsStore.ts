import { query } from '../core/pool';

const GameObjectsStore = () => {
	const moveToLocation = async (objectId: string, seat: number | null, zone: string) => {
		if (seat) {
			await query(`UPDATE game_objects SET zone = $1, controller = $2 WHERE id = $3`, [zone, seat, objectId]);
		} else {
			await query(`UPDATE game_objects SET zone = $1 WHERE id = $2`, [zone, objectId]);
		}
	};
	const moveToGraveyard = async (objectId: string) => {
		await moveToLocation(objectId, null, 'graveyard');
	};
	const moveToHand = async (objectId: string) => {
		await moveToLocation(objectId, null, 'hand');
	};
	const moveToExile = async (objectId: string) => {
		await moveToLocation(objectId, null, 'exile');
	};
	const moveToCommandZone = async (objectId: string) => {
		await moveToLocation(objectId, null, 'command');
	};
	const moveToBattlefield = async (objectId: string, seat: number) => {
		await moveToLocation(objectId, seat, 'battlefield');
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
