import { query } from "../../core/pool";

export const lifeChange = async (
	id: string,
	seat: number,
	metadata: { amount: number },
) => {
	const { amount } = metadata;
	if (amount && typeof amount === "number") {
		const column = seat === 1 ? "seat1_life" : "seat2_life";
		await query(
			`UPDATE game_state SET ${column} = ${column} + $1 WHERE game_session_id = $2`,
			[amount, id],
		);
	}
};
