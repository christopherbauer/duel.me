import logger from '../../core/logger';
import { query } from '../../core/pool';
import { GameObjectId } from '../../types/game';
import { ActionMethod } from './types';

interface DrawMetadata {
	count?: number;
}
export const drawFromLibrary: ActionMethod<DrawMetadata> = async (gameId, seat, metadata) => {
	const count = metadata.count || 1;
	const drawResult = await query<GameObjectId>(
		`SELECT id FROM game_objects 
			WHERE game_session_id = $1 AND seat = $2 AND zone = 'library'
			ORDER BY "order", id
			LIMIT $3`,
		[gameId, seat, count]
	);
	if (drawResult && drawResult.rows) {
		for (const row of drawResult.rows) {
			await query(`UPDATE game_objects SET zone = 'hand' WHERE id = $1`, [row.id]);
		}
	}
};

export const moveToLibrary: ActionMethod = async (_gameId, _seat, metadata) => {
	// Move card back to library from anywhere
	const objectId = metadata.objectId;
	if (objectId) {
		await query(`UPDATE game_objects SET zone = 'library' WHERE id = $1`, [objectId]);
	}
};
interface ScryMetadata {
	count?: number;
	arrangement?: { top: string[]; bottom: string[] };
}
export const scry: ActionMethod<ScryMetadata> = async (gameId, seat, metadata) => {
	// Scry: arrange top X cards, unplaced go to bottom
	const { count, arrangement } = metadata;
	if (arrangement && count) {
		const { top, bottom } = arrangement;

		// Get all library cards currently
		const allCardsResult = await query(
			`SELECT id FROM game_objects
					 WHERE game_session_id = $1 AND seat = $2 AND zone = 'library'
					 ORDER BY "order", id`,
			[gameId, seat]
		);

		if (allCardsResult && allCardsResult.rows) {
			const allCardIds = allCardsResult.rows.map((row: any) => row.id);

			// Cards not in scry arrangement are the ones below the scried cards
			const scryCardIds = new Set([...top, ...bottom]);
			const remainingCards = allCardIds.filter((cardId: string) => !scryCardIds.has(cardId));

			// Rebuild the entire library order:
			// top cards first, then remaining cards, then bottom cards last
			const newOrder = [...top, ...remainingCards, ...bottom];

			// Update all cards with new order values
			for (let i = 0; i < newOrder.length; i++) {
				await query(`UPDATE game_objects SET "order" = $1 WHERE id = $2`, [i, newOrder[i]]);
			}
		}
	}
	logger.info(`Scry ${count} by seat ${seat} in game ${gameId}`);
};
interface SurveilMetadata {
	count?: number;
	arrangement?: { top: string[]; graveyard?: string[] };
}
export const surveil: ActionMethod<SurveilMetadata> = async (gameId, seat, metadata) => {
	// Surveil: arrange cards, putting some to graveyard
	const { count, arrangement } = metadata;
	if (arrangement) {
		const { top, graveyard } = arrangement;

		// Get all library cards currently
		const allCardsResult = await query(
			`SELECT id FROM game_objects
					 WHERE game_session_id = $1 AND seat = $2 AND zone = 'library'
					 ORDER BY "order", id`,
			[gameId, seat]
		);

		if (allCardsResult && allCardsResult.rows) {
			const allCardIds = allCardsResult.rows.map((row: any) => row.id);

			// Cards not in surveil arrangement are the ones below the surveiled cards
			const surveilCardIds = new Set([...top, ...(graveyard || [])]);
			const remainingCards = allCardIds.filter((cardId: string) => !surveilCardIds.has(cardId));

			// Update remaining library cards with sequential order
			for (let i = 0; i < top.length; i++) {
				await query(`UPDATE game_objects SET "order" = $1 WHERE id = $2`, [i, top[i]]);
			}
			for (let i = 0; i < remainingCards.length; i++) {
				await query(`UPDATE game_objects SET "order" = $1 WHERE id = $2`, [top.length + i, remainingCards[i]]);
			}

			// Move cards to graveyard
			if (graveyard) {
				for (const cardId of graveyard) {
					await query(`UPDATE game_objects SET zone = 'graveyard' WHERE id = $1`, [cardId]);
				}
			}
		}
	}
	logger.info(`Surveil ${count} by seat ${seat} in game ${gameId}`);
};

const getRandom = (low: number, high: number) => Math.floor(Math.random() * (high - low + 1)) + low;
const getHalfRandom = (size: number) => Math.floor(size / 2) + getRandom(-2, 2);

// Simulate a human-like riffle shuffle, didn't want to do pure random which generally feels "off"
const humanRiffleShuffle = (cardIds: string[]): string[] => {
	// Perform the riffle shuffle 2-3 times
	const shuffleIterations = 3;
	for (let iteration = 0; iteration < shuffleIterations; iteration++) {
		// Split into two halves
		const midpoint = getHalfRandom(cardIds.length);
		const half1 = cardIds.slice(0, midpoint);
		const half2 = cardIds.slice(midpoint);

		// Split each half into two piles (4 piles total)
		const half1Mid = getHalfRandom(half1.length);
		const pile1 = half1.slice(0, half1Mid);
		const pile2 = half1.slice(half1Mid);

		const half2Mid = getHalfRandom(half2.length);
		const pile3 = half2.slice(0, half2Mid);
		const pile4 = half2.slice(half2Mid);

		const mergePiles: (pileA: any[], pileB: any[]) => any[] = (pileA, pileB) => {
			const merged = [];
			while (pileA.length > 0 || pileB.length > 0) {
				if (pileA.length > 0) {
					merged.push(...pileA.splice(0, Math.max(1, getRandom(-1, 3))));
				}
				if (pileB.length > 0) {
					merged.push(...pileB.splice(0, Math.max(1, getRandom(-1, 3))));
				}
			}
			return merged;
		};

		// Merge piles by alternating 1-3 cards at a time
		const firstMerge = mergePiles(pile1, pile2);
		const secondMerge = mergePiles(pile3, pile4);
		cardIds = mergePiles(firstMerge, secondMerge);
	}
	return cardIds;
};

export const shuffleLibrary: ActionMethod = async (gameId, seat, _metadata) => {
	// Shuffle library using human-like riffle shuffle algorithm
	const libraryCardsResult = await query<{ id: string }>(
		`SELECT id FROM game_objects 
				 WHERE game_session_id = $1 AND seat = $2 AND zone = 'library'
				 ORDER BY "order", id`,
		[gameId, seat]
	);

	if (libraryCardsResult && libraryCardsResult.rows) {
		let cardIds = libraryCardsResult.rows.map((row) => row.id);

		const shuffledCardIds = humanRiffleShuffle(cardIds);

		// Batch update all library orders in a single query
		if (shuffledCardIds.length > 0) {
			// Build VALUES clause: (id1, 0), (id2, 1), (id3, 2), ...
			const values = shuffledCardIds.map((id, index) => `('${id}', ${index})`).join(', ');

			await query(
				`UPDATE game_objects AS go
				 SET "order" = v."order"
				 FROM (VALUES ${values}) AS v(id, "order")
				 WHERE go.id = v.id::uuid`
			);
		}
	}
	logger.info(`Library shuffled by seat ${seat} in game ${gameId}`);
};
