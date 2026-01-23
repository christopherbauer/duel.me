import { query } from '../core/pool';
import { Card } from '../types/game';

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
	return {
		getCardsByName,
		getTokens,
	};
};

export default CardsStore;
