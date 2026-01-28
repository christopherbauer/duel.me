import { Router, Request, Response } from 'express';
import { query } from '../core/pool';
import { v4 as uuidv4 } from 'uuid';
import { GameSession, GameStateView, DeckCards, CommanderIds, Card, Indicator } from '../types/game';
import logger from '../core/logger';
import { Actions, handleGameAction } from './gameActions';
import GamesStore from '../db/GamesStore';
import GameStateStore from '../db/GameStateStore';
import { AllPartsQueryResult } from '../db/types';
import CardsStore from '../db/CardsStore';
import { NotFoundError } from '../core/errors';
import { drawFromLibrary, shuffleLibrary } from './gameActions/library';

const router = Router();
//in-memory store tokens for inclusion in gamestate responses
let tokenRecord: Record<string, Card[]> = {};
const retrieveTokens = async () => {
	logger.info('Retrieving token cards from database...');
	const tokens = await CardsStore().getTokens();
	if (!tokens) {
		throw new Error('Failed to retrieve tokens from database');
	}
	tokenRecord = Object.values(tokens.rows).reduce(
		(acc, token) => {
			if (!(token.name in acc)) {
				acc[token.name] = [];
			}
			acc[token.name].push(token);
			return acc;
		},
		{} as Record<string, Card[]>
	);
};
retrieveTokens();

// Helper function to initialize game state
const initializeGame = async (gameId: string, deckIds: string[]) => {
	// Build game state columns dynamically based on player count
	const seatCount = deckIds.length;
	let gameStateColumns = 'game_session_id';
	let gameStateValues = '$1';
	const gameStateParams: any[] = [gameId];

	for (let seat = 1; seat <= seatCount; seat++) {
		gameStateColumns += `, seat${seat}_life`;
		gameStateValues += `, 40`;
	}
	gameStateColumns += ', active_seat, turn_number';
	gameStateValues += ', 1, 1';

	// Initialize game state
	await query(
		`INSERT INTO game_state (${gameStateColumns})
       VALUES (${gameStateValues})`,
		gameStateParams
	);

	// Get commander IDs first
	const commandersByDeck: Record<number, string[]> = {};
	for (let seat = 0; seat < deckIds.length; seat++) {
		const deckId = deckIds[seat];
		const deckResult = await query<CommanderIds>(`SELECT commander_ids FROM decks WHERE id = $1`, [deckId]);
		if (deckResult && deckResult.rows[0]?.commander_ids) {
			commandersByDeck[seat + 1] = deckResult.rows[0].commander_ids;
		} else {
			commandersByDeck[seat + 1] = [];
		}
	}

	// Load decks into library zones (excluding commanders)
	for (let seat = 0; seat < deckIds.length; seat++) {
		const seatNumber = seat + 1;
		const deckId = deckIds[seat];
		const deckCardsResult = await query<DeckCards>(
			`SELECT dc.card_id, dc.quantity FROM deck_cards dc WHERE dc.deck_id = $1 AND dc.zone = 'library'`,
			[deckId]
		);
		if (!deckCardsResult) continue;
		let libraryOrder = 0;
		for (const row of deckCardsResult.rows) {
			// Skip commanders - they should only be in command zone
			if (commandersByDeck[seatNumber].includes(row.card_id)) continue;

			for (let i = 0; i < row.quantity; i++) {
				await query(
					`INSERT INTO game_objects (id, game_session_id, seat, zone, card_id, "order")
             VALUES ($1, $2, $3, 'library', $4, $5)`,
					[uuidv4(), gameId, seatNumber, row.card_id, libraryOrder]
				);
				libraryOrder++;
			}
		}
		await handleGameAction(Actions.shuffle_library, gameId, seatNumber, {});

		// Load commanders into command zone
		if (commandersByDeck[seatNumber] && commandersByDeck[seatNumber].length > 0) {
			for (const cmdId of commandersByDeck[seatNumber]) {
				await query(
					`INSERT INTO game_objects (id, game_session_id, seat, zone, card_id)
             VALUES ($1, $2, $3, 'command_zone', $4)`,
					[uuidv4(), gameId, seatNumber, cmdId]
				);
			}
		}
		await handleGameAction(Actions.draw, gameId, seatNumber, { count: 7 });
	}
};

/**
 * @swagger
 * /api/games:
 *   get:
 *     summary: List active game sessions
 *     responses:
 *       200:
 *         description: List of game sessions
 */
router.get('/', async (req, res) => {
	try {
		const result = await query<GameSession>(`SELECT * FROM game_sessions WHERE status != 'completed' ORDER BY updated_at DESC`);
		res.json(result?.rows);
	} catch (error) {
		console.error('Game list error:', error);
		res.status(500).json({ error: 'Failed to fetch games' });
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
router.post('/', async (req, res) => {
	const { deck1_id, deck2_id, deck3_id, deck4_id, player_count, name } = req.body;

	if (!deck1_id) {
		return res.status(400).json({ error: 'deck1_id is required' });
	}

	const count = player_count || 2;
	if (count < 1 || count > 4) {
		return res.status(400).json({ error: 'player_count must be between 1 and 4' });
	}

	// Validate required decks based on player count
	if (count >= 2 && !deck2_id) {
		return res.status(400).json({ error: 'deck2_id is required for 2+ player games' });
	}
	if (count >= 3 && !deck3_id) {
		return res.status(400).json({ error: 'deck3_id is required for 3+ player games' });
	}
	if (count === 4 && !deck4_id) {
		return res.status(400).json({ error: 'deck4_id is required for 4-player games' });
	}

	try {
		const gameId = uuidv4();

		// Create game session
		await query(
			`INSERT INTO game_sessions (id, name, deck1_id, deck2_id, deck3_id, deck4_id, player_count, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')`,
			[gameId, name || `Game ${new Date().toLocaleString()}`, deck1_id, deck2_id || null, deck3_id || null, deck4_id || null, count]
		);

		// Initialize game state
		const deckIds = [deck1_id];
		if (count >= 2) deckIds.push(deck2_id);
		if (count >= 3) deckIds.push(deck3_id);
		if (count === 4) deckIds.push(deck4_id);

		await initializeGame(gameId, deckIds);

		res.status(201).json({ id: gameId, name: name || 'New Game' });
	} catch (error) {
		console.error('Game creation error:', error);
		res.status(500).json({ error: 'Failed to create game' });
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
router.get('/:id', async (req, res) => {
	const { id } = req.params;
	const viewerSeat = (parseInt((req.query.viewer_seat as string) || '1') || 1) as 1 | 2 | 3 | 4;

	try {
		const gameStateResult = await GameStateStore().getGameState(id);
		if (!gameStateResult) {
			throw new Error('Failed to retrieve game state');
		}

		// Get game state
		const objectsResult = await GamesStore()
			.getGamesObjects(id)
			.then((result) => {
				if (!result) {
					throw new Error('Failed to retrieve game objects');
				}
				return result;
			})
			.catch((err) => {
				logger.error(err);
				res.status(404).json({ error: 'Game not found' });
				throw new Error('Failed to retrieve game objects');
			});
		logger.debug(JSON.stringify(objectsResult));

		// Get indicators
		const indicatorsResult = await GamesStore().getIndicators(id);
		if (!indicatorsResult) {
			throw new Error('Failed to retrieve indicators');
		}
		const indicators: Indicator[] = indicatorsResult.map((row) => ({
			id: row.id,
			game_session_id: row.game_session_id,
			seat: row.seat,
			position: row.position,
			color: row.color,
		}));

		// Project visibility: hide opponent's hand and library
		const projectedObjects = objectsResult.map((obj) => {
			const isOpponent = obj.seat !== viewerSeat;
			const isHiddenZone = obj.zone === 'hand' || obj.zone === 'library';

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
								card_faces: obj.card_faces,
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
			return res.status(500).json({ error: 'Failed to project game objects' });
		}

		// Build view with all available seats
		const view: GameStateView = {
			game_session_id: gameStateResult.game_session_id,
			seat1_life: gameStateResult.seat1_life,
			seat2_life: gameStateResult.seat2_life,
			seat3_life: gameStateResult.seat3_life,
			seat4_life: gameStateResult.seat4_life,
			seat1_commander_damage: gameStateResult.seat1_commander_damage,
			seat2_commander_damage: gameStateResult.seat2_commander_damage,
			seat3_commander_damage: gameStateResult.seat3_commander_damage,
			seat4_commander_damage: gameStateResult.seat4_commander_damage,
			active_seat: gameStateResult.active_seat,
			turn_number: gameStateResult.turn_number,
			objects: projectedObjects,
			indicators: indicators,
		};

		res.json(view);
	} catch (error) {
		console.error('Game fetch error:', error);
		res.status(500).json({ error: 'Failed to fetch game' });
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
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Action executed
 */
router.post('/:id/action', async (req: Request, res: Response) => {
	const { id } = req.params;
	const { seat, action_type, metadata = {} } = req.body;

	if (!seat || !action_type) {
		return res.status(400).json({ error: 'seat and action_type are required' });
	}

	logger.info(`Received action: ${action_type} with metadata: ${JSON.stringify(metadata)}`);

	try {
		const actionId = await handleGameAction(action_type, id, seat, metadata);

		res.json({ success: true, action_id: actionId });
	} catch (error) {
		console.error('Game action error:', error);
		res.status(500).json({ error: 'Failed to execute action' });
	}
});

router.post('/:id/restart', async (req, res) => {
	const { id } = req.params;

	try {
		// Get current game to fetch deck IDs and player count
		const gameResult = await query<GameSession>(
			'SELECT deck1_id, deck2_id, deck3_id, deck4_id, player_count FROM game_sessions WHERE id = $1',
			[id]
		);

		if (!gameResult?.rows[0]) {
			return res.status(404).json({ error: 'Game not found' });
		}

		const { deck1_id, deck2_id, deck3_id, deck4_id, player_count } = gameResult.rows[0];

		// Build deck IDs array based on player count (default to 2 if not specified)
		const playerCount = player_count || 2;
		const deckIds = [deck1_id];
		if (playerCount >= 2 && deck2_id) deckIds.push(deck2_id);
		if (playerCount >= 3 && deck3_id) deckIds.push(deck3_id);
		if (playerCount === 4 && deck4_id) deckIds.push(deck4_id);

		// Clear all game data
		await Promise.all([
			query('DELETE FROM game_objects WHERE game_session_id = $1', [id]),
			query('DELETE FROM game_actions WHERE game_session_id = $1', [id]),
			query('DELETE FROM battlefield_indicators WHERE game_session_id = $1', [id]),
			query('DELETE FROM game_state WHERE game_session_id = $1', [id]),
		]);

		// Re-initialize game
		await initializeGame(id, deckIds);

		res.json({ success: true });
	} catch (error) {
		console.error('Game restart error:', error);
		res.status(500).json({ error: 'Failed to restart game' });
	}
});

router.get('/:id/tokens', async (req, res) => {
	const { id } = req.params;
	const extractTokens = (objects: AllPartsQueryResult[]) => {
		const tokens: Record<string, { id: string; name: string }> = {};
		for (const obj of objects) {
			if (obj.all_parts && obj.all_parts.length > 0) {
				for (const part of obj.all_parts) {
					if (part.component === 'token' && part.name) {
						// Deduplicate by token name, not ID
						if (!tokens[part.name]) {
							tokens[part.name] = {
								id: part.id,
								name: part.name,
							};
						}
					}
				}
			}
		}
		return tokens;
	};
	const allPartsResult = await GamesStore().getAllParts(id);
	const gameTokenList = extractTokens(allPartsResult || []);
	const gameTokens = Object.values(gameTokenList)
		.flatMap((tokenInfo) => {
			const tokenCards = tokenRecord[tokenInfo.name];
			if (tokenCards) {
				return tokenCards;
			} else {
				logger.warn(`Token card not found for token name: ${tokenInfo.name}`);
				return null;
			}
		})
		.filter((token): token is Card => token !== null)
		.sort((a, b) => a.name.localeCompare(b.name));
	res.json(gameTokens);
});

router.get('/:id/components', async (req, res) => {
	const { id } = req.params;
	const extractComponents = (objects: AllPartsQueryResult[]) => {
		const tokens: Record<string, { id: string; name: string }> = {};
		for (const obj of objects) {
			if (obj.all_parts && obj.all_parts.length > 0) {
				for (const part of obj.all_parts) {
					if (part.component === 'combo_piece' && part.name) {
						// Deduplicate by token name, not ID
						if (!tokens[part.name]) {
							tokens[part.name] = {
								id: part.id,
								name: part.name,
							};
						}
					}
				}
			}
		}
		return tokens;
	};
	const allPartsResult = await GamesStore().getAllParts(id);
	const gameComponentList = extractComponents(allPartsResult || []);
	const uniqueGameComponents = new Set(Object.values(gameComponentList).map((componentInfo) => componentInfo.name));
	const componentCards = await CardsStore().getCardsByName(Array.from(uniqueGameComponents));
	if (!componentCards) {
		throw new NotFoundError();
	}
	const gameComponents = componentCards.sort((a, b) => a.name.localeCompare(b.name));
	res.json(gameComponents);
});

/**
 * @swagger
 * /api/games/{id}/actions:
 *   get:
 *     summary: Get game audit log (action history)
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Game audit log with pagination
 */
router.get('/:id/actions', async (req, res) => {
	const { id } = req.params;
	const page = Math.max(1, parseInt((req.query.page as string) || '1'));
	const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '50')));
	const offset = (page - 1) * limit;

	try {
		// Get total count
		const countResult = await query<{ count: number }>(`SELECT COUNT(*) as count FROM game_actions WHERE game_session_id = $1`, [id]);
		const total = countResult?.rowCount;

		// Get actions with pagination, ordered by creation time (latest first)
		const actionsResult = await query<any>(
			`SELECT id, seat, action_type, metadata, created_at 
			 FROM game_actions 
			 WHERE game_session_id = $1 
			 ORDER BY created_at DESC 
			 LIMIT $2 OFFSET $3`,
			[id, limit, offset]
		);

		const actions =
			actionsResult?.rows.map((row) => ({
				id: row.id,
				seat: row.seat,
				action_type: row.action_type,
				metadata: row.metadata,
				created_at: row.created_at,
			})) || [];

		res.json({
			total,
			actions,
			page,
			limit,
		});
	} catch (error) {
		console.error('Audit log fetch error:', error);
		res.status(500).json({ error: 'Failed to fetch audit log' });
	}
});

/**
 * @swagger
 * /api/games/:id/end:
 *   post:
 *     summary: End a game session
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Game ended successfully
 *       404:
 *         description: Game not found
 */
router.post('/:id/end', async (req, res) => {
	try {
		const { id } = req.params;
		const result = await GamesStore().endGameSession(id);
		if (!result || result.rows.length === 0) {
			throw new NotFoundError();
		}

		res.json(result.rows[0]);
	} catch (error) {
		logger.error(JSON.stringify(error));
		res.status(500).json({ error: 'Failed to end game' });
	}
});

export default router;
