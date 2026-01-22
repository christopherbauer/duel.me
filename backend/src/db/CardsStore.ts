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
	return {
		getCardsByName,
	};
};

export default CardsStore;
