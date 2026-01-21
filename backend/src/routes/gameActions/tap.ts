import { query } from "../../db/pool";
import { ActionMethod } from "./types";

const tap: ActionMethod = async (_id, _seat, metadata) => {
	// Toggle tap state
	const objectId = metadata?.objectId;
	if (objectId) {
		const objResult = await query<{ is_tapped: boolean }>(
			`SELECT is_tapped FROM game_objects WHERE id = $1`,
			[objectId],
		);
		if (objResult && objResult.rows && objResult.rows.length > 0) {
			const currentTapped = objResult.rows[0].is_tapped;
			await query(
				`UPDATE game_objects SET is_tapped = $1 WHERE id = $2`,
				[!currentTapped, objectId],
			);
		}
	}
};
const untap: ActionMethod = async (_id, _seat, metadata) => {
	await query(`UPDATE game_objects SET is_tapped = false WHERE id = $1`, [
		metadata.objectId,
	]);
};
const toggle_tap: ActionMethod = async (_id, _seat, metadata) => {
	const { objectId } = metadata;
	const objResult = await query<{ is_tapped: boolean }>(
		`SELECT is_tapped FROM game_objects WHERE id = $1`,
		[objectId],
	);
	if (objResult?.rows[0].is_tapped) {
		await untap(_id, _seat, { objectId: objectId! });
	} else {
		await tap(_id, _seat, metadata);
	}
};
export { tap, untap, toggle_tap };
