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
const initializeGame = async (gameId: string, deck1_id: string, deck2_id: string) => {
	// Initialize game state
	await query(
		`INSERT INTO game_state (game_session_id, seat1_life, seat2_life, active_seat, turn_number)
       VALUES ($1, 40, 40, 1, 1)`,
		[gameId]
	);

	// Get commander IDs first
	const commandersByDeck: Record<number, string[]> = {};
	for (const seat of [1, 2]) {
		const deckId = seat === 1 ? deck1_id : deck2_id;
		const deckResult = await query<CommanderIds>(`SELECT commander_ids FROM decks WHERE id = $1`, [deckId]);
		if (deckResult && deckResult.rows[0]?.commander_ids) {
			commandersByDeck[seat] = deckResult.rows[0].commander_ids;
		} else {
			commandersByDeck[seat] = [];
		}
	}

	// Load decks into library zones (excluding commanders)
	for (const seat of [1, 2]) {
		const deckId = seat === 1 ? deck1_id : deck2_id;
		const deckCardsResult = await query<DeckCards>(
			`SELECT dc.card_id, dc.quantity FROM deck_cards dc WHERE dc.deck_id = $1 AND dc.zone = 'library'`,
			[deckId]
		);
		if (!deckCardsResult) continue;
		let libraryOrder = 0;
		for (const row of deckCardsResult.rows) {
			// Skip commanders - they should only be in command zone
			if (commandersByDeck[seat].includes(row.card_id)) continue;

			for (let i = 0; i < row.quantity; i++) {
				await query(
					`INSERT INTO game_objects (id, game_session_id, seat, zone, card_id, "order")
             VALUES ($1, $2, $3, 'library', $4, $5)`,
					[uuidv4(), gameId, seat, row.card_id, libraryOrder]
				);
				libraryOrder++;
			}
		}

		// Load commanders into command zone
		if (commandersByDeck[seat] && commandersByDeck[seat].length > 0) {
			for (const cmdId of commandersByDeck[seat]) {
				await query(
					`INSERT INTO game_objects (id, game_session_id, seat, zone, card_id)
             VALUES ($1, $2, $3, 'command_zone', $4)`,
					[uuidv4(), gameId, seat, cmdId]
				);
			}
		}
		await handleGameAction(Actions.untap_all, gameId, seat, {});
		await handleGameAction(Actions.draw, gameId, seat, { count: 7 });
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
	const { deck1_id, deck2_id, name } = req.body;

	if (!deck1_id || !deck2_id) {
		return res.status(400).json({ error: 'Both deck1_id and deck2_id are required' });
	}

	try {
		const gameId = uuidv4();

		// Create game session
		await query(`INSERT INTO game_sessions (id, name, deck1_id, deck2_id, status) VALUES ($1, $2, $3, $4, 'active')`, [
			gameId,
			name || `Game ${new Date().toLocaleString()}`,
			deck1_id,
			deck2_id,
		]);

		// Initialize game state
		await initializeGame(gameId, deck1_id, deck2_id);

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
	const viewerSeat = (parseInt((req.query.viewer_seat as string) || '1') || 1) as 1 | 2;

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
		const view: GameStateView = {
			game_session_id: gameStateResult.game_session_id,
			seat1_life: gameStateResult.seat1_life,
			seat2_life: gameStateResult.seat2_life,
			seat1_commander_damage: gameStateResult.seat1_commander_damage,
			seat2_commander_damage: gameStateResult.seat2_commander_damage,
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
		// Get current game to fetch deck IDs
		const gameResult = await query<GameSession>('SELECT deck1_id, deck2_id FROM game_sessions WHERE id = $1', [id]);

		if (!gameResult?.rows[0]) {
			return res.status(404).json({ error: 'Game not found' });
		}

		const { deck1_id, deck2_id } = gameResult.rows[0];

		// Clear all game data
		await Promise.all([
			query('DELETE FROM game_objects WHERE game_session_id = $1', [id]),
			query('DELETE FROM game_actions WHERE game_session_id = $1', [id]),
			query('DELETE FROM battlefield_indicators WHERE game_session_id = $1', [id]),
			query('DELETE FROM game_state WHERE game_session_id = $1', [id]),
		]);

		// Re-initialize game
		await initializeGame(id, deck1_id, deck2_id);

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

export default router;
