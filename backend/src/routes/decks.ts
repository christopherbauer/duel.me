import { Router } from 'express';
import { query } from '../core/pool';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardId, Deck, DeckCard, DeckDetails } from '../types/game';

const router = Router();

/**
 * @swagger
 * /api/decks:
 *   get:
 *     summary: List all decks
 *     responses:
 *       200:
 *         description: List of decks
 */
router.get('/', async (req, res) => {
	try {
		const result = await query<Deck>('SELECT * FROM decks ORDER BY updated_at DESC');
		res.json(result?.rows);
	} catch (error) {
		console.error('Deck list error:', error);
		res.status(500).json({ error: 'Failed to fetch decks' });
	}
});

/**
 * @swagger
 * /api/decks:
 *   post:
 *     summary: Create a new deck
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               cardLines:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of "1x Card Name" or "1 Card Name" format
 *               commanderCardNames:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Deck created
 */
router.post('/', async (req, res) => {
	const { name, description, cardLines = [], commanderCardNames = [] } = req.body;

	if (!name) {
		return res.status(400).json({ error: 'Deck name is required' });
	}

	try {
		const deckId = uuidv4();

		// Parse commander IDs
		const commanderIds: string[] = [];
		for (const cmdName of commanderCardNames) {
			const cardResult = await query<CardId>('SELECT id FROM cards WHERE name ILIKE $1 LIMIT 1', [cmdName]);
			if (cardResult && cardResult.rows && cardResult?.rows?.length > 0) {
				commanderIds.push(cardResult.rows[0].id);
			}
		}

		// Create deck
		await query(`INSERT INTO decks (id, name, description, commander_ids) VALUES ($1, $2, $3, $4)`, [
			deckId,
			name,
			description || null,
			commanderIds.length > 0 ? commanderIds : null,
		]);

		// Parse and insert deck cards
		for (const line of cardLines) {
			const match = line.match(/^(\d+)?x?\s+(.+)$/i);
			if (match) {
				const quantity = parseInt(match[1]);
				const cardName = match[2].trim();

				const cardResult = await query<CardId>('SELECT id FROM cards WHERE name ILIKE $1 LIMIT 1', [cardName]);
				if (cardResult && cardResult.rows && cardResult?.rows?.length > 0) {
					const cardId = cardResult.rows[0].id;
					await query(
						`INSERT INTO deck_cards (deck_id, card_id, quantity, zone) VALUES ($1, $2, $3, 'library')
             ON CONFLICT (deck_id, card_id, zone) DO UPDATE SET quantity = $3`,
						[deckId, cardId, quantity]
					);
				}
			}
		}

		res.status(201).json({ id: deckId, name, commanderIds });
	} catch (error) {
		console.error('Deck creation error:', error);
		res.status(500).json({ error: 'Failed to create deck' });
	}
});

/**
 * @swagger
 * /api/decks/{id}:
 *   get:
 *     summary: Get deck details
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deck details with cards
 */
router.get('/:id', async (req, res) => {
	const { id } = req.params;

	try {
		const deckResult = await query<Deck>('SELECT * FROM decks WHERE id = $1', [id]);
		if (deckResult && deckResult.rows && deckResult.rows.length === 0) {
			return res.status(404).json({ error: 'Deck not found' });
		}

		const cardsResult = await query<DeckDetails>(
			`SELECT dc.quantity, dc.zone, c.id, c.name, c.type_line, c.mana_cost, c.colors, c.image_uris, c.card_faces
       FROM deck_cards dc
       JOIN cards c ON dc.card_id = c.id
       WHERE dc.deck_id = $1
       ORDER BY c.name`,
			[id]
		);

		res.json({
			...deckResult?.rows[0],
			cards: cardsResult?.rows,
		});
	} catch (error) {
		console.error('Deck fetch error:', error);
		res.status(500).json({ error: 'Failed to fetch deck' });
	}
});

/**
 * @swagger
 * /api/decks/{id}:
 *   put:
 *     summary: Update an existing deck
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               cardLines:
 *                 type: array
 *                 items:
 *                   type: string
 *               commanderCardNames:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Deck updated
 */
router.put('/:id', async (req, res) => {
	const { id } = req.params;
	const { name, description, cardLines = [], commanderCardNames = [] } = req.body;

	if (!name) {
		return res.status(400).json({ error: 'Deck name is required' });
	}

	try {
		// Check if deck exists
		const deckCheck = await query('SELECT * FROM decks WHERE id = $1', [id]);
		if (!deckCheck || deckCheck.rows.length === 0) {
			return res.status(404).json({ error: 'Deck not found' });
		}

		// Parse commander IDs
		const commanderIds: string[] = [];
		for (const cmdName of commanderCardNames) {
			const cardResult = await query<CardId>('SELECT id FROM cards WHERE name ILIKE $1 LIMIT 1', [cmdName]);
			if (cardResult && cardResult.rows && cardResult?.rows?.length > 0) {
				commanderIds.push(cardResult.rows[0].id);
			}
		}

		// Update deck
		await query(`UPDATE decks SET name = $1, description = $2, commander_ids = $3, updated_at = NOW() WHERE id = $4`, [
			name,
			description || null,
			commanderIds.length > 0 ? commanderIds : null,
			id,
		]);

		// Clear existing deck cards
		await query('DELETE FROM deck_cards WHERE deck_id = $1', [id]);

		// Parse and insert deck cards
		for (const line of cardLines) {
			const match = line.match(/^(\d+)?x?\s+(.+)$/i);
			if (match) {
				const quantity = parseInt(match[1]);
				const cardName = match[2].trim();

				const cardResult = await query<CardId>('SELECT id FROM cards WHERE name ILIKE $1 LIMIT 1', [cardName]);
				if (cardResult && cardResult.rows && cardResult?.rows?.length > 0) {
					const cardId = cardResult.rows[0].id;
					await query(`INSERT INTO deck_cards (deck_id, card_id, quantity, zone) VALUES ($1, $2, $3, 'library')`, [id, cardId, quantity]);
				}
			}
		}

		res.json({ id, name, commanderIds });
	} catch (error) {
		console.error('Deck update error:', error);
		res.status(500).json({ error: 'Failed to update deck' });
	}
});

/**
 * @swagger
 * /api/decks/{id}:
 *   delete:
 *     summary: Delete a deck
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deck deleted
 */
router.delete('/:id', async (req, res) => {
	const { id } = req.params;

	try {
		// Check if deck exists
		const deckCheck = await query<Deck>('SELECT * FROM decks WHERE id = $1', [id]);
		if (!deckCheck || deckCheck.rows.length === 0) {
			return res.status(404).json({ error: 'Deck not found' });
		}

		// Delete deck cards first (foreign key constraint)
		await query('DELETE FROM deck_cards WHERE deck_id = $1', [id]);

		// Delete deck
		await query('DELETE FROM decks WHERE id = $1', [id]);

		res.json({ success: true });
	} catch (error) {
		console.error('Deck delete error:', error);
		res.status(500).json({ error: 'Failed to delete deck' });
	}
});

export default router;
