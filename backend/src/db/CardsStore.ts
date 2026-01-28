import { query } from '../core/pool';
import { Card, CardSearchResult } from '../types/game';

const CardsStore = () => {
	const getCardsByName = (names: string[]) => {
		const placeholders = names.map((_, index) => `$${index + 1}`).join(', ');
		const queryText = `SELECT * FROM cards WHERE name IN (${placeholders})`;
		return query<Card>(queryText, names).then((result) => {
			return result?.rows;
		});
	};
	const getTokens = () => {
		return query<Card>("SELECT * from cards c where c.layout = 'token'");
	};
	const getCard = async (id: string) => {
		const result = await query<Card>('SELECT * FROM cards WHERE id = $1', [id]);
		return result?.rows[0];
	};
	const getSearchResult = (q: string, limit: string = '20') => {
		return query<CardSearchResult>(
			`SELECT id, name, type_line, mana_cost, colors, image_uris, card_faces 
			   FROM cards 
			   WHERE name ILIKE $1 
			   LIMIT $2`,
			[`${q}%`, Math.min(parseInt(limit as string) || 20, 100)]
		);
	};
	return {
		getCardsByName,
		getTokens,
		getCard,
		getSearchResult,
	};
};

export default CardsStore;
