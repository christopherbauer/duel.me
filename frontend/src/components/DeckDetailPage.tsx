import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { DeckLoader } from './DeckLoader';

export const DeckDetailPage: React.FC = () => {
	const { deckId } = useParams<{ deckId: string }>();
	const [updated, setUpdated] = React.useState(false);

	const handleDeckUpdated = (id: string) => {
		setUpdated(true);
	};

	return (
		<div style={styles.container}>
			<Link to="/decks">
				<button style={styles.backButton}>← Back to Decks</button>
			</Link>
			<DeckLoader deckId={deckId} onDeckUpdated={handleDeckUpdated} />
		</div>
	);
};

const styles = {
	container: {
		padding: '20px',
		maxWidth: '800px',
		margin: '0 auto',
	},
	backButton: {
		marginBottom: '20px',
		padding: '8px 16px',
		backgroundColor: '#444',
		color: '#fff',
		border: 'none',
		borderRadius: '4px',
		cursor: 'pointer',
	},
};
