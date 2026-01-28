import React from 'react';
import { Link } from 'react-router-dom';
import { ActiveGamesList } from './ActiveGamesList';

export const HomePage: React.FC = () => {
	return (
		<div style={styles.homeContainer}>
			<div style={styles.header}>
				<h1 style={styles.title}>duel.me</h1>
				<p style={styles.subtitle}>Commander Duel Playtester v0</p>
			</div>

			<div style={styles.buttonGroup}>
				<Link to="/decks">
					<button style={styles.primaryButton}>Manage Decks</button>
				</Link>
				<Link to="/setup-game">
					<button style={styles.primaryButton}>Start Game</button>
				</Link>
			</div>

			<ActiveGamesList />
		</div>
	);
};

const styles = {
	homeContainer: {
		minHeight: '100vh',
		backgroundColor: '#1a1a1a',
		color: '#fff',
		padding: '40px 20px',
		display: 'flex',
		flexDirection: 'column' as const,
		alignItems: 'center',
	},
	header: {
		textAlign: 'center' as const,
		marginBottom: '30px',
	},
	title: {
		fontSize: '48px',
		fontWeight: 'bold' as const,
		marginBottom: '10px',
	},
	subtitle: {
		fontSize: '18px',
		color: '#999',
		marginBottom: '0',
	},
	buttonGroup: {
		display: 'flex',
		gap: '20px',
		marginBottom: '40px',
	},
	primaryButton: {
		padding: '15px 30px',
		fontSize: '16px',
		fontWeight: 'bold' as const,
		backgroundColor: '#0066ff',
		color: '#fff',
		border: 'none',
		borderRadius: '8px',
		cursor: 'pointer',
		transition: 'background-color 0.3s',
	},
};
