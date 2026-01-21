import { query } from "../../core/pool";
import { ActionMethod } from "./types";
import { v4 as uuidv4 } from "uuid";
import logger from "../../core/logger";

interface SourceCardResult {
	card_id: string;
}

interface TokenResult {
	is_token: boolean;
}

export const createTokenCopy: ActionMethod = async (
	gameId,
	seat,
	metadata: {
		sourceObjectId?: string; // For card token copies
		tokenCardId?: string; // For battlefield token creation
		quantity: number;
		position?: { x: number; y: number };
	},
) => {
	logger.info(
		`Creating token copy with metadata: ${JSON.stringify(metadata)}`,
	);
	const { sourceObjectId, tokenCardId, quantity, position } = metadata;

	if (!tokenCardId && !sourceObjectId) {
		throw new Error("Either tokenCardId or sourceObjectId is required");
	}

	let cardIdToUse: string | null = null;

	// If creating a copy of a card on the battlefield
	if (sourceObjectId) {
		const sourceResult = await query<SourceCardResult>(
			`SELECT card_id FROM game_objects WHERE id = $1`,
			[sourceObjectId],
		);

		if (!sourceResult || sourceResult.rows.length === 0) {
			throw new Error("Source object not found");
		}

		cardIdToUse = sourceResult.rows[0].card_id;
	} else if (tokenCardId) {
		cardIdToUse = tokenCardId;
	}

	// Create the specified number of token copies
	for (let i = 0; i < quantity; i++) {
		const tokenObjectId = uuidv4();

		const params: any[] = [
			tokenObjectId,
			gameId,
			seat,
			"battlefield",
			cardIdToUse,
			true, // is_token
		];

		let insertQuery = `
			INSERT INTO game_objects 
			(id, game_session_id, seat, zone, card_id, is_token`;

		if (position) {
			insertQuery += `, position`;
			const offsetX = position.x + i * 5;
			const offsetY = position.y + i * 5;
			params.push(JSON.stringify({ x: offsetX, y: offsetY }));
		}

		insertQuery += `) VALUES ($1, $2, $3, $4, $5, $6`;

		if (position) {
			insertQuery += `, $${params.length}`;
		}

		insertQuery += `)`;

		await query(insertQuery, params);
	}
};

export const removeToken: ActionMethod = async (
	_gameId,
	_seat,
	metadata: {
		objectId: string;
	},
) => {
	const { objectId } = metadata;

	if (!objectId) {
		throw new Error("objectId is required");
	}

	// Verify it's actually a token
	const result = await query<TokenResult>(
		`SELECT is_token FROM game_objects WHERE id = $1`,
		[objectId],
	);

	if (!result || result.rows.length === 0) {
		throw new Error("Object not found");
	}

	if (!result.rows[0].is_token) {
		throw new Error("Can only remove tokens");
	}

	// Delete the token
	await query(`DELETE FROM game_objects WHERE id = $1`, [objectId]);
};
