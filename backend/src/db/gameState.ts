import { GameState } from "../types/game";
import { query } from "../core/pool";
import { NotFoundError } from "../core/errors";

const GameStateStore = () => {
	const getGameState = async (id: string) => {
		const stateResult = await query<GameState>(
			"SELECT * FROM game_state WHERE game_session_id = $1",
			[id],
		);
		if (stateResult && stateResult.rows && stateResult.rows.length === 0) {
			throw new NotFoundError();
		}
		const gameState = stateResult?.rows[0];
		if (!gameState) {
			throw new Error("Failed to retrieve game state");
		}
		return gameState;
	};
	return {
		getGameState,
	};
};

export default GameStateStore;
