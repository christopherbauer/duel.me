import { query } from '../core/pool';

const GameObjectsStore = () => {
	const moveToLocation = async (objectId: string, seat: number, zone: string) => {
		await query(`UPDATE game_objects SET zone = $1, controller = $2 WHERE id = $3`, [zone, seat, objectId]);
	};
	const moveToGraveyard = async (objectId: string, seat: number) => {
		await moveToLocation(objectId, seat, 'graveyard');
	};
	const moveToHand = async (objectId: string, seat: number) => {
		await moveToLocation(objectId, seat, 'hand');
	};
	const moveToExile = async (objectId: string, seat: number) => {
		await moveToLocation(objectId, seat, 'exile');
	};
	const moveToCommandZone = async (objectId: string, seat: number) => {
		await moveToLocation(objectId, seat, 'command');
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
