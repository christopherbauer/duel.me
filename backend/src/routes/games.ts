import { Router, Request, Response } from "express";
import { query } from "../db/pool";
import { v4 as uuidv4 } from "uuid";
import {
	GameSession,
	GameState,
	GameStateView,
	DeckCards,
	CommanderIds,
	GameStateQueryResult,
	Card,
} from "../types/game";
import logger from "../core/logger";
import { handleGameAction } from "./gameActions";

const router = Router();
//in-memory store tokens for inclusion in gamestate responses
let tokenRecord: Record<string, Card> = {};
const retrieveTokens = async () => {
	logger.info("Retrieving token cards from database...");
	const tokens = await query<Card>(
		"SELECT * from cards c where c.layout = 'token'",
	);
	if (!tokens) {
		throw new Error("Failed to retrieve tokens from database");
	}
	tokenRecord = Object.values(tokens.rows).reduce(
		(acc, token) => {
			acc[token.name] = token;
			return acc;
		},
		{} as Record<string, Card>,
	);
};
retrieveTokens();

/**
 * @swagger
 * /api/games:
 *   get:
 *     summary: List active game sessions
 *     responses:
 *       200:
 *         description: List of game sessions
 */
router.get("/", async (req, res) => {
	try {
		const result = await query<GameSession>(
			`SELECT * FROM game_sessions WHERE status != 'completed' ORDER BY updated_at DESC`,
		);
		res.json(result?.rows);
	} catch (error) {
		console.error("Game list error:", error);
		res.status(500).json({ error: "Failed to fetch games" });
	}
});

/**
 * @swagger
 * /api/games:
 *   post:
 *     summary: Create a new game session
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deck1_id:
 *                 type: string
 *               deck2_id:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Game created and initialized
 */
router.post("/", async (req, res) => {
	const { deck1_id, deck2_id, name } = req.body;

	if (!deck1_id || !deck2_id) {
		return res
			.status(400)
			.json({ error: "Both deck1_id and deck2_id are required" });
	}

	try {
		const gameId = uuidv4();

		// Create game session
		await query(
			`INSERT INTO game_sessions (id, name, deck1_id, deck2_id, status) VALUES ($1, $2, $3, $4, 'active')`,
			[
				gameId,
				name || `Game ${new Date().toLocaleString()}`,
				deck1_id,
				deck2_id,
			],
		);

		// Initialize game state
		await query(
			`INSERT INTO game_state (game_session_id, seat1_life, seat2_life, active_seat, turn_number)
       VALUES ($1, 40, 40, 1, 1)`,
			[gameId],
		);

		// Load decks into library zones
		for (const seat of [1, 2]) {
			const deckId = seat === 1 ? deck1_id : deck2_id;
			const deckCardsResult = await query<DeckCards>(
				`SELECT dc.card_id, dc.quantity FROM deck_cards dc WHERE dc.deck_id = $1 AND dc.zone = 'library'`,
				[deckId],
			);
			if (!deckCardsResult) continue;
			let libraryOrder = 0;
			for (const row of deckCardsResult.rows) {
				for (let i = 0; i < row.quantity; i++) {
					await query(
						`INSERT INTO game_objects (id, game_session_id, seat, zone, card_id, "order")
             VALUES ($1, $2, $3, 'library', $4, $5)`,
						[uuidv4(), gameId, seat, row.card_id, libraryOrder],
					);
					libraryOrder++;
				}
			}

			// Load commanders
			const deckResult = await query<CommanderIds>(
				`SELECT commander_ids FROM decks WHERE id = $1`,
				[deckId],
			);
			if (!deckResult) continue;
			if (
				deckResult.rows[0]?.commander_ids &&
				deckResult.rows[0].commander_ids.length > 0
			) {
				for (const cmdId of deckResult.rows[0].commander_ids) {
					await query(
						`INSERT INTO game_objects (id, game_session_id, seat, zone, card_id)
             VALUES ($1, $2, $3, 'command_zone', $4)`,
						[uuidv4(), gameId, seat, cmdId],
					);
				}
			}
		}

		res.status(201).json({ id: gameId, name: name || "New Game" });
	} catch (error) {
		console.error("Game creation error:", error);
		res.status(500).json({ error: "Failed to create game" });
	}
});

/**
 * @swagger
 * /api/games/{id}:
 *   get:
 *     summary: Get game state (with visibility projection)
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *       - in: query
 *         name: viewer_seat
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Which seat is viewing (1 or 2)
 *     responses:
 *       200:
 *         description: Game state with projected visibility
 */
router.get("/:id", async (req, res) => {
	const { id } = req.params;
	const viewerSeat = (parseInt((req.query.viewer_seat as string) || "1") ||
		1) as 1 | 2;

	try {
		// Get game state
		const stateResult = await query<GameState>(
			"SELECT * FROM game_state WHERE game_session_id = $1",
			[id],
		);
		if (stateResult && stateResult.rows && stateResult.rows.length === 0) {
			return res.status(404).json({ error: "Game not found" });
		}
		const gameState = stateResult?.rows[0];
		if (!gameState) {
			throw new Error("Failed to retrieve game state");
		}

		// Get all objects
		const objectsResult = await query<GameStateQueryResult>(
			`SELECT go.id, go.seat, go.zone, go.card_id, go.is_token, go.is_tapped, go.is_flipped, 
			go.counters, go.notes, go.position, go."order",
			c.id as card_id, c."name", c.type_line, c.oracle_text, c.mana_cost, c.cmc, c.power, c.toughness, c.colors, c.color_identity, c.keywords, c.layout, c.image_uris
       FROM game_objects go
       LEFT JOIN cards c ON go.card_id = c.id
       WHERE go.game_session_id = $1
       ORDER BY go.zone, go."order", go.created_at`,
			[id],
		);

		logger.debug(JSON.stringify(objectsResult?.rows));
		// const extractTokens = (objects: GameStateQueryResult[]) => {
		// 	const tokens: Record<string, { id: string; name: string }> = {};
		// 	for (const obj of objects) {
		// 		if (obj.all_parts && obj.all_parts.length > 0) {
		// 			for (const part of obj.all_parts) {
		// 				if (part.component === "token" && part.name) {
		// 					tokens[part.id] = {
		// 						id: part.id,
		// 						name: part.name,
		// 					};
		// 				}
		// 			}
		// 		}
		// 	}
		// 	return tokens;
		// };
		// const gameTokenList = extractTokens(objectsResult?.rows || []);
		// const gameTokens = Object.values(gameTokenList).map((tokenInfo) => {
		// 	const tokenCard = tokenRecord[tokenInfo.name];
		// 	if (tokenCard) {
		// 		return tokenCard;
		// 	} else {
		// 		logger.warn(
		// 			`Token card not found for token name: ${tokenInfo.name}`,
		// 		);
		// 		return null;
		// 	}
		// });

		// Project visibility: hide opponent's hand and library
		const projectedObjects = objectsResult?.rows.map((obj) => {
			const isOpponent = obj.seat !== viewerSeat;
			const isHiddenZone = obj.zone === "hand" || obj.zone === "library";

			return {
				id: obj.id,
				seat: obj.seat,
				zone: obj.zone,
				card:
					!isOpponent || !isHiddenZone
						? {
								id: obj.card_id,
								name: obj.name,
								type_line: obj.type_line,
								oracle_text: obj.oracle_text,
								mana_cost: obj.mana_cost,
								cmc: obj.cmc,
								power: obj.power,
								toughness: obj.toughness,
								colors: obj.colors,
								color_identity: obj.color_identity,
								keywords: obj.keywords,
								layout: obj.layout,
								image_uris: obj.image_uris,
							}
						: null,
				is_token: obj.is_token,
				is_tapped: obj.is_tapped,
				is_flipped: obj.is_flipped,
				counters: obj.counters,
				notes: obj.notes,
				position: obj.position,
				// tokens: gameTokens,
			};
		});
		logger.debug(JSON.stringify(projectedObjects));
		if (!projectedObjects) {
			return res
				.status(500)
				.json({ error: "Failed to project game objects" });
		}
		const view: GameStateView = {
			game_session_id: gameState.game_session_id,
			seat1_life: gameState.seat1_life,
			seat2_life: gameState.seat2_life,
			seat1_commander_damage: gameState.seat1_commander_damage,
			seat2_commander_damage: gameState.seat2_commander_damage,
			active_seat: gameState.active_seat,
			turn_number: gameState.turn_number,
			objects: projectedObjects,
		};

		res.json(view);
	} catch (error) {
		console.error("Game fetch error:", error);
		res.status(500).json({ error: "Failed to fetch game" });
	}
});

/**
 * @swagger
 * /api/games/{id}/action:
 *   post:
 *     summary: Execute a game action
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               seat:
 *                 type: integer
 *               action_type:
 *                 type: string
 *                 enum: [draw, shuffle, tap, untap, counter_add, counter_remove, move, life_change]
 *               target_object_id:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Action executed
 */
router.post("/:id/action", async (req: Request, res: Response) => {
	const { id } = req.params;
	const { seat, action_type, target_object_id, metadata = {} } = req.body;

	if (!seat || !action_type) {
		return res
			.status(400)
			.json({ error: "seat and action_type are required" });
	}

	try {
		const actionId = uuidv4();

		// Log action
		await query(
			`INSERT INTO game_actions (id, game_session_id, seat, action_type, target_object_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
			[
				actionId,
				id,
				seat,
				action_type,
				target_object_id || null,
				JSON.stringify(metadata),
			],
		);

		await handleGameAction(action_type, id, seat, metadata);

		res.json({ success: true, action_id: actionId });
	} catch (error) {
		console.error("Game action error:", error);
		res.status(500).json({ error: "Failed to execute action" });
	}
});

export default router;
