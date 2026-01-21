import { Router } from "express";
import logger from "../core/logger";
import { query } from "../core/pool";
import { Card } from "../types/game";

const router = Router();

router.get("/tokens", async (req, res) => {
	try {
		logger.info("Retrieving token cards from database...");
		const tokens = await query<Card>(
			"SELECT * from cards c where c.layout = 'token'",
		);
		if (!tokens) {
			throw new Error("Failed to retrieve tokens from database");
		}
		res.json(tokens?.rows);
	} catch (error) {
		console.error("Card search error:", error);
		res.status(500).json({ error: "Card search failed" });
	}
});

export default router;
