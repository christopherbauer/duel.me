import logger from "../../core/logger";
import { query } from "../../core/pool";

const getRandom = (low: number, high: number) =>
	Math.floor(Math.random() * (high - low + 1)) + low;
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

		const mergePiles: (pileA: any[], pileB: any[]) => any[] = (
			pileA,
			pileB,
		) => {
			const merged = [];
			while (pileA.length > 0 || pileB.length > 0) {
				if (pileA.length > 0) {
					merged.push(
						...pileA.splice(0, Math.max(1, getRandom(-1, 3))),
					);
				}
				if (pileB.length > 0) {
					merged.push(
						...pileB.splice(0, Math.max(1, getRandom(-1, 3))),
					);
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

export const shuffleLibrary = async (
	id: string,
	seat: number,
): Promise<void> => {
	// Shuffle library using human-like riffle shuffle algorithm
	const libraryCardsResult = await query<{ id: string }>(
		`SELECT id FROM game_objects 
				 WHERE game_session_id = $1 AND seat = $2 AND zone = 'library'
				 ORDER BY "order", id`,
		[id, seat],
	);

	if (libraryCardsResult && libraryCardsResult.rows) {
		let cardIds = libraryCardsResult.rows.map((row) => row.id);

		const shuffledCardIds = humanRiffleShuffle(cardIds);

		// Batch update all library orders in a single query
		if (shuffledCardIds.length > 0) {
			// Build VALUES clause: (id1, 0), (id2, 1), (id3, 2), ...
			const values = shuffledCardIds
				.map((id, index) => `('${id}', ${index})`)
				.join(", ");

			await query(
				`UPDATE game_objects AS go
				 SET "order" = v."order"
				 FROM (VALUES ${values}) AS v(id, "order")
				 WHERE go.id = v.id::uuid`,
			);
		}
	}
	logger.info(`Library shuffled by seat ${seat} in game ${id}`);
};
