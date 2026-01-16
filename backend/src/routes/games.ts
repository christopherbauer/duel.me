import { Router } from "express";
import { query } from "../db/pool";
import { v4 as uuidv4 } from "uuid";
import {
	GameSession,
	GameObject,
	GameState,
	GameStateView,
	GameObjectView,
	Zone,
} from "../types/game";

const router = Router();

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
		const result = await query(
			`SELECT * FROM game_sessions WHERE status != 'completed' ORDER BY updated_at DESC`
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
			]
		);

		// Initialize game state
		await query(
			`INSERT INTO game_state (game_session_id, seat1_life, seat2_life, active_seat, turn_number)
       VALUES ($1, 40, 40, 1, 1)`,
			[gameId]
		);

		// Load decks into library zones
		for (const seat of [1, 2]) {
			const deckId = seat === 1 ? deck1_id : deck2_id;
			const deckCardsResult = await query(
				`SELECT dc.card_id, dc.quantity FROM deck_cards dc WHERE dc.deck_id = $1 AND dc.zone = 'library'`,
				[deckId]
			);
			if (!deckCardsResult) continue;
			for (const row of deckCardsResult.rows) {
				for (let i = 0; i < row.quantity; i++) {
					await query(
						`INSERT INTO game_objects (id, game_session_id, seat, zone, card_id)
             VALUES ($1, $2, $3, 'library', $4)`,
						[uuidv4(), gameId, seat, row.card_id]
					);
				}
			}

			// Load commanders
			const deckResult = await query(
				`SELECT commander_ids FROM decks WHERE id = $1`,
				[deckId]
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
						[uuidv4(), gameId, seat, cmdId]
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
		const stateResult = await query(
			"SELECT * FROM game_state WHERE game_session_id = $1",
			[id]
		);
		if (stateResult && stateResult.rows && stateResult.rows.length === 0) {
			return res.status(404).json({ error: "Game not found" });
		}
		const gameState = stateResult?.rows[0];

		// Get all objects
		const objectsResult = await query(
			`SELECT go.id, go.seat, go.zone, go.card_id, go.is_tapped, go.is_flipped, 
              go.counters, go.notes, c.name, c.type_line, c.image_uris
       FROM game_objects go
       LEFT JOIN cards c ON go.card_id = c.id
       WHERE go.game_session_id = $1
       ORDER BY go.zone, go.created_at`,
			[id]
		);

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
						  }
						: null,
				is_tapped: obj.is_tapped,
				is_flipped: obj.is_flipped,
				counters: obj.counters,
				notes: obj.notes,
			};
		});
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
router.post("/:id/action", async (req, res) => {
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
			]
		);

		// Handle specific actions
		if (action_type === "draw") {
			const drawResult = await query(
				`SELECT id FROM game_objects WHERE game_session_id = $1 AND seat = $2 AND zone = 'library' LIMIT 1`,
				[id, seat]
			);
			if (drawResult && drawResult.rows && drawResult.rows.length > 0) {
				const cardId = drawResult.rows[0].id;
				await query(
					`UPDATE game_objects SET zone = 'hand' WHERE id = $1`,
					[cardId]
				);
			}
		} else if (action_type === "tap" && target_object_id) {
			await query(
				`UPDATE game_objects SET is_tapped = true WHERE id = $1`,
				[target_object_id]
			);
		} else if (action_type === "untap" && target_object_id) {
			await query(
				`UPDATE game_objects SET is_tapped = false WHERE id = $1`,
				[target_object_id]
			);
		} else if (action_type === "life_change") {
			const { amount } = metadata;
			if (amount && typeof amount === "number") {
				const column = seat === 1 ? "seat1_life" : "seat2_life";
				await query(
					`UPDATE game_state SET ${column} = ${column} + $1 WHERE game_session_id = $2`,
					[amount, id]
				);
			}
		}

		await query(
			`UPDATE game_sessions SET updated_at = NOW() WHERE id = $1`,
			[id]
		);

		res.json({ success: true, action_id: actionId });
	} catch (error) {
		console.error("Game action error:", error);
		res.status(500).json({ error: "Failed to execute action" });
	}
});

export default router;
