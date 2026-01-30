import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export interface GameSessionWithDecks {
	id: string;
	name?: string;
	status: 'active' | 'paused' | 'completed';
	deck1_id: string;
	deck2_id?: string;
	deck3_id?: string;
	deck4_id?: string;
	player_count?: 1 | 2 | 3 | 4;
	deck1_name?: string;
	deck2_name?: string;
	deck3_name?: string;
	deck4_name?: string;
	seat1_life?: number;
	seat2_life?: number;
	seat3_life?: number;
	seat4_life?: number;
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
						// Get all deck names and game state
						const deckIds = [game.deck1_id, game.deck2_id, game.deck3_id, game.deck4_id];
						const deckPromises = deckIds.map((id) => (id ? api.getDeck(id).catch(() => null) : Promise.resolve(null)));
						const decks = await Promise.all(deckPromises);
						const gameState = await api.getGame(game.id, 1).catch(() => null);

						const seats: Array<{ name?: string; life?: number }> = [];
						for (let i = 0; i < 4; i++) {
							const deck = decks[i];
							const deckName = deck && deck.data && deck.data.name ? deck.data.name : undefined;
							const lifeValue = gameState && gameState.data ? (gameState.data as any)[`seat${i + 1}_life`] : undefined;

							// Only include seat if deck exists
							if (deckIds[i]) {
								seats[i] = {
									name: deckName,
									life: lifeValue,
								};
							}
						}

						return {
							...game,
							deck1_name: seats[0]?.name,
							deck2_name: seats[1]?.name,
							deck3_name: seats[2]?.name,
							deck4_name: seats[3]?.name,
							seat1_life: seats[0]?.life,
							seat2_life: seats[1]?.life,
							seat3_life: seats[2]?.life,
							seat4_life: seats[3]?.life,
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
									{[game.deck1_name, game.deck2_name, game.deck3_name, game.deck4_name].filter(Boolean).join(' vs ')}
								</span>
							</div>
							<div style={styles.detailRow}>
								<span style={styles.detailLabel}>Life Totals:</span>
								<span style={styles.detailValue}>
									{[
										`Seat 1: ${game.seat1_life || '20'}`,
										game.seat2_life !== undefined ? `Seat 2: ${game.seat2_life || '20'}` : null,
										game.seat3_life !== undefined ? `Seat 3: ${game.seat3_life || '20'}` : null,
										game.seat4_life !== undefined ? `Seat 4: ${game.seat4_life || '20'}` : null,
									]
										.filter(Boolean)
										.join(' | ')}
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
