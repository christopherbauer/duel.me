import express, { Router } from "express";
import { query } from "../db/pool";
import { v4 as uuidv4 } from "uuid";
import { Card } from "../types/game";

const router = Router();

/**
 * @swagger
 * /api/cards/search:
 *   get:
 *     summary: Search cards by name (autocomplete)
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Card name search query
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of matching cards
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get("/search", async (req, res) => {
	const { q, limit = 20 } = req.query;

	if (!q || typeof q !== "string") {
		return res.status(400).json({ error: "q parameter is required" });
	}

	try {
		const result = await query(
			`SELECT id, name, type_line, mana_cost, colors, image_uris 
       FROM cards 
       WHERE name ILIKE $1 
       LIMIT $2`,
			[`${q}%`, Math.min(parseInt(limit as string) || 20, 100)]
		);
		res.json(result?.rows);
	} catch (error) {
		console.error("Card search error:", error);
		res.status(500).json({ error: "Card search failed" });
	}
});

/**
 * @swagger
 * /api/cards/{id}:
 *   get:
 *     summary: Get card details by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Card details
 */
router.get("/:id", async (req, res) => {
	const { id } = req.params;

	try {
		const result = await query("SELECT * FROM cards WHERE id = $1", [id]);
		if (result && result.rows && result.rows.length === 0) {
			return res.status(404).json({ error: "Card not found" });
		}
		res.json(result?.rows[0]);
	} catch (error) {
		console.error("Card fetch error:", error);
		res.status(500).json({ error: "Card fetch failed" });
	}
});

export default router;
