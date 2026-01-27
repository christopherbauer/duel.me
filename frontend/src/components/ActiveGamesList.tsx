import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export interface GameSessionWithDecks {
	id: string;
	name?: string;
	status: 'active' | 'paused' | 'completed';
	deck1_id: string;
	deck2_id: string;
	deck1_name?: string;
	deck2_name?: string;
	seat1_life?: number;
	seat2_life?: number;
	created_at: string;
	updated_at: string;
	completed_at?: string;
}

export const ActiveGamesList: React.FC = () => {
	const [games, setGames] = useState<GameSessionWithDecks[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const navigate = useNavigate();

	const loadGames = async () => {
		try {
			setLoading(true);
			const response = await api.listGames();
			const gamesList = response.data as GameSessionWithDecks[];

			// Load deck names and life totals for each game
			const gamesWithDetails = await Promise.all(
				gamesList.map(async (game) => {
					try {
						// Get deck names
						const [deck1, deck2, gameState] = await Promise.all([
							api.getDeck(game.deck1_id).catch(() => null),
							api.getDeck(game.deck2_id).catch(() => null),
							api.getGame(game.id, 1).catch(() => null),
						]);

						const deck1Name = (deck1 && deck1.data && deck1.data.name) || 'Unknown Deck';
						const deck2Name = (deck2 && deck2.data && deck2.data.name) || 'Unknown Deck';
						const seat1Life = gameState && gameState.data && gameState.data.seat1_life;
						const seat2Life = gameState && gameState.data && gameState.data.seat2_life;

						return {
							...game,
							deck1_name: deck1Name,
							deck2_name: deck2Name,
							seat1_life: seat1Life,
							seat2_life: seat2Life,
						};
					} catch (err) {
						console.error(`Error loading details for game ${game.id}:`, err);
						return game;
					}
				})
			);

			setGames(gamesWithDetails.filter((g) => g.status !== 'completed'));
			setError(null);
		} catch (err) {
			console.error('Failed to load games:', err);
			setError('Failed to load games');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadGames();
	}, []);

	const handleEndGame = async (gameId: string) => {
		if (!window.confirm('Are you sure you want to end this game?')) return;

		try {
			await api.endGame(gameId);
			setGames(games.filter((g) => g.id !== gameId));
		} catch (err) {
			console.error('Failed to end game:', err);
			setError('Failed to end game');
		}
	};

	const handleContinueGame = (gameId: string) => {
		navigate(`/games/${gameId}`);
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
	};

	const formatLastActivity = (dateString: string) => {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		return `${diffDays}d ago`;
	};

	if (loading) return <p style={styles.loadingText}>Loading games...</p>;
	if (error) return <p style={styles.errorText}>{error}</p>;
	if (games.length === 0) return <p style={styles.noGamesText}>No active games. Start a new one!</p>;

	return (
		<div style={styles.gamesSection}>
			<h2 style={styles.sectionTitle}>Active Games ({games.length})</h2>
			<div style={styles.gamesList}>
				{games.map((game) => (
					<div key={game.id} style={styles.gameCard}>
						<div style={styles.gameHeader}>
							<h3 style={styles.gameName}>{game.name}</h3>
							<span style={styles.gameStatus}>Active</span>
						</div>
						<div style={styles.gameDetails}>
							<div style={styles.detailRow}>
								<span style={styles.detailLabel}>Started:</span>
								<span style={styles.detailValue}>{formatDate(game.created_at)}</span>
							</div>
							<div style={styles.detailRow}>
								<span style={styles.detailLabel}>Last Activity:</span>
								<span style={styles.detailValue}>{formatLastActivity(game.updated_at)}</span>
							</div>
							<div style={styles.detailRow}>
								<span style={styles.detailLabel}>Decks:</span>
								<span style={styles.detailValue}>
									{game.deck1_name} vs {game.deck2_name}
								</span>
							</div>
							<div style={styles.detailRow}>
								<span style={styles.detailLabel}>Life Totals:</span>
								<span style={styles.detailValue}>
									{game.seat1_life || '20'} / {game.seat2_life || '20'}
								</span>
							</div>
						</div>
						<div style={styles.gameActions}>
							<button style={styles.continueButton} onClick={() => handleContinueGame(game.id)}>
								Continue Game
							</button>
							<button style={styles.endButton} onClick={() => handleEndGame(game.id)}>
								End Game
							</button>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

const styles = {
	gamesSection: {
		width: '100%',
		maxWidth: '1000px',
		marginTop: '20px',
	},
	sectionTitle: {
		fontSize: '24px',
		fontWeight: 'bold' as const,
		marginBottom: '20px',
		color: '#0099ff',
	},
	gamesList: {
		display: 'grid' as const,
		gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
		gap: '20px',
	},
	gameCard: {
		backgroundColor: '#2a2a2a',
		border: '2px solid #0066ff',
		borderRadius: '8px',
		padding: '20px',
		display: 'flex' as const,
		flexDirection: 'column' as const,
		gap: '15px',
	},
	gameHeader: {
		display: 'flex' as const,
		justifyContent: 'space-between' as const,
		alignItems: 'center' as const,
		borderBottom: '1px solid #444',
		paddingBottom: '10px',
	},
	gameName: {
		margin: '0',
		fontSize: '18px',
		fontWeight: 'bold' as const,
	},
	gameStatus: {
		backgroundColor: '#00aa00',
		color: '#fff',
		padding: '4px 12px',
		borderRadius: '4px',
		fontSize: '12px',
		fontWeight: 'bold' as const,
	},
	gameDetails: {
		display: 'flex' as const,
		flexDirection: 'column' as const,
		gap: '8px',
		fontSize: '14px',
	},
	detailRow: {
		display: 'flex' as const,
		justifyContent: 'space-between' as const,
	},
	detailLabel: {
		color: '#999',
		fontWeight: 'bold' as const,
	},
	detailValue: {
		color: '#fff',
		textAlign: 'right' as const,
	},
	gameActions: {
		display: 'flex' as const,
		gap: '10px',
		marginTop: '10px',
	},
	continueButton: {
		flex: 1,
		padding: '10px 15px',
		backgroundColor: '#0066ff',
		color: '#fff',
		border: 'none',
		borderRadius: '4px',
		cursor: 'pointer',
		fontWeight: 'bold' as const,
		fontSize: '14px',
		transition: 'background-color 0.3s',
	},
	endButton: {
		flex: 1,
		padding: '10px 15px',
		backgroundColor: '#cc0000',
		color: '#fff',
		border: 'none',
		borderRadius: '4px',
		cursor: 'pointer',
		fontWeight: 'bold' as const,
		fontSize: '14px',
		transition: 'background-color 0.3s',
	},
	loadingText: {
		fontSize: '16px',
		color: '#999',
		marginTop: '40px',
	},
	errorText: {
		fontSize: '16px',
		color: '#ff6666',
		marginTop: '40px',
	},
	noGamesText: {
		fontSize: '16px',
		color: '#999',
		marginTop: '40px',
	},
};
