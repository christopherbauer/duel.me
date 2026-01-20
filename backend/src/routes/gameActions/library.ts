import logger from "../../core/logger";
import { query } from "../../db/pool";
import { GameObjectId } from "../../types/game";
import { ActionMethod } from "./types";

export const drawFromLibrary = async (
	id: string,
	seat: number,
	metadata: { count?: number },
) => {
	const count = metadata.count || 1;
	const drawResult = await query<GameObjectId>(
		`SELECT id FROM game_objects 
			WHERE game_session_id = $1 AND seat = $2 AND zone = 'library'
			ORDER BY "order", id
			LIMIT $3`,
		[id, seat, count],
	);
	if (drawResult && drawResult.rows) {
		for (const row of drawResult.rows) {
			await query(`UPDATE game_objects SET zone = 'hand' WHERE id = $1`, [
				row.id,
			]);
		}
	}
};

export const moveToLibrary: ActionMethod = async (_id, _seat, metadata) => {
	// Move card back to library from anywhere
	const objectId = metadata.objectId;
	if (objectId) {
		await query(`UPDATE game_objects SET zone = 'library' WHERE id = $1`, [
			objectId,
		]);
	}
};

export const scry = async (
	id: string,
	seat: number,
	metadata: {
		count?: number;
		arrangement?: { top: string[]; bottom: string[] };
	},
) => {
	// Scry: arrange top X cards, unplaced go to bottom
	const { count, arrangement } = metadata;
	if (arrangement && count) {
		const { top, bottom } = arrangement;

		// Get all library cards currently
		const allCardsResult = await query(
			`SELECT id FROM game_objects
					 WHERE game_session_id = $1 AND seat = $2 AND zone = 'library'
					 ORDER BY "order", id`,
			[id, seat],
		);

		if (allCardsResult && allCardsResult.rows) {
			const allCardIds = allCardsResult.rows.map((row: any) => row.id);

			// Cards not in scry arrangement are the ones below the scried cards
			const scryCardIds = new Set([...top, ...bottom]);
			const remainingCards = allCardIds.filter(
				(cardId: string) => !scryCardIds.has(cardId),
			);

			// Rebuild the entire library order:
			// top cards first, then remaining cards, then bottom cards last
			const newOrder = [...top, ...remainingCards, ...bottom];

			// Update all cards with new order values
			for (let i = 0; i < newOrder.length; i++) {
				await query(
					`UPDATE game_objects SET "order" = $1 WHERE id = $2`,
					[i, newOrder[i]],
				);
			}
		}
	}
	logger.info(`Scry ${count} by seat ${seat} in game ${id}`);
};

export const surveil = async (
	id: string,
	seat: number,
	metadata: {
		count?: number;
		arrangement?: { top: string[]; graveyard?: string[] };
	},
) => {
	// Surveil: arrange cards, putting some to graveyard
	const { count, arrangement } = metadata;
	if (arrangement) {
		const { top, graveyard } = arrangement;

		// Get all library cards currently
		const allCardsResult = await query(
			`SELECT id FROM game_objects
					 WHERE game_session_id = $1 AND seat = $2 AND zone = 'library'
					 ORDER BY "order", id`,
			[id, seat],
		);

		if (allCardsResult && allCardsResult.rows) {
			const allCardIds = allCardsResult.rows.map((row: any) => row.id);

			// Cards not in surveil arrangement are the ones below the surveiled cards
			const surveilCardIds = new Set([...top, ...(graveyard || [])]);
			const remainingCards = allCardIds.filter(
				(cardId: string) => !surveilCardIds.has(cardId),
			);

			// Update remaining library cards with sequential order
			for (let i = 0; i < top.length; i++) {
				await query(
					`UPDATE game_objects SET "order" = $1 WHERE id = $2`,
					[i, top[i]],
				);
			}
			for (let i = 0; i < remainingCards.length; i++) {
				await query(
					`UPDATE game_objects SET "order" = $1 WHERE id = $2`,
					[top.length + i, remainingCards[i]],
				);
			}

			// Move cards to graveyard
			if (graveyard) {
				for (const cardId of graveyard) {
					await query(
						`UPDATE game_objects SET zone = 'graveyard' WHERE id = $1`,
						[cardId],
					);
				}
			}
		}
	}
	logger.info(`Surveil ${count} by seat ${seat} in game ${id}`);
};
