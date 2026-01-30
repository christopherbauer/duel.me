import { query } from '../core/pool';
import { Card, CardSearchResult } from '../types/game';

const CardsStore = () => {
	const getCardsByName = (names: string[]) => {
		if (!names || names.length === 0) {
			return Promise.resolve([] as Card[]);
		}
		const placeholders = names.map((_, index) => `$${index + 1}`).join(', ');
		const queryText = `SELECT * FROM cards WHERE lang='en' AND name IN (${placeholders})`;
		return query<Card>(queryText, names).then((result) => {
			return result?.rows;
		});
	};
	const getTokens = () => {
		return query<Card>("SELECT * from cards c where c.lang='en' AND c.layout = 'token'").then((result) => {
			return result?.rows;
		});
	};
	const getCard = async (id: string) => {
		const result = await query<Card>("SELECT * FROM cards WHERE lang='en' AND id = $1", [id]);
		return result?.rows[0];
	};
	const getSearchResult = (q: string, limit: string = '20') => {
		return query<CardSearchResult>(
			`SELECT id, name, type_line, mana_cost, colors, image_uris, card_faces 
			   FROM cards 
			   WHERE lang='en' AND name ILIKE $1 
			   LIMIT $2`,
			[`${q}%`, Math.min(parseInt(limit as string) || 20, 100)]
		).then((result) => {
			return result?.rows;
		});
	};
	return {
		getCardsByName,
		getTokens,
		getCard,
		getSearchResult,
	};
};

export default CardsStore;
