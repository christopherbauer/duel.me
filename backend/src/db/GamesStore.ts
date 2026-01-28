import { GameState, GameStateQueryResult } from '../types/game';
import { query } from '../core/pool';
import { AllPart } from '../seed/types';
import { AllPartsQueryResult, IndicatorQueryResult } from './types';

const GamesStore = () => {
	const getGamesObjects = async (id: string) => {
		// Get all objects
		const objectsResult = await query<GameStateQueryResult>(
			`SELECT go.id, go.seat, go.zone, go.card_id, go.is_token, go.is_tapped, go.is_flipped, 
					go.counters, go.notes, go.position, go."order",
					c.id as card_id, c."name", c.type_line, c.oracle_text, c.mana_cost, c.cmc, c.power, c.toughness, c.colors, c.color_identity, c.keywords, c.layout, c.image_uris, c.card_faces
			   FROM game_objects go
			   	LEFT JOIN cards c ON go.card_id = c.id
			   WHERE go.game_session_id = $1
			   ORDER BY go.zone, go."order", go.created_at`,
			[id]
		);
		return objectsResult?.rows;
	};

	const getAllParts = async (id: string) => {
		const allPartsResult = await query<AllPartsQueryResult>(
			`SELECT c.id, c.all_parts 
			FROM game_objects go 
				LEFT JOIN cards c ON go.card_id = c.id 
			WHERE go.game_session_id = $1`,
			[id]
		);
		return allPartsResult?.rows;
	};
	const getIndicators = async (id: string) => {
		const indicatorsResult = await query<IndicatorQueryResult>(
			`SELECT id, game_session_id, seat, position, color 
			FROM battlefield_indicators 
			WHERE 
				game_session_id = $1 
			ORDER BY created_at ASC`,
			[id]
		);
		return indicatorsResult?.rows || [];
	};
	const endGameSession = async (id: string) => {
		const result = await query(`UPDATE game_sessions SET status = 'completed', completed_at = NOW() WHERE id = $1 RETURNING *`, [id]);
		return result;
	};

	return {
		getGamesObjects,
		getAllParts,
		getIndicators,
		endGameSession,
	};
};
export default GamesStore;
