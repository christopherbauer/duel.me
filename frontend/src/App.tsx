import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import { api } from './api';
import { DeckList } from './components/DeckList';
import { DeckLoader } from './components/DeckLoader';
import { GameSetup } from './components/GameSetup';
import { GameBoard } from './components/GameBoard';

interface GameSessionWithDecks {
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

function HomePage() {
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

						return {
							...game,
							deck1_name: deck1?.data?.name || 'Unknown Deck',
							deck2_name: deck2?.data?.name || 'Unknown Deck',
							seat1_life: gameState?.data?.seat1_life,
							seat2_life: gameState?.data?.seat2_life,
						};
					} catch (err) {
						console.error(`Error loading details for game ${game.id}:`, err);
						return game;
					}
				})
			);

			setGames(gamesWithDetails.filter(g => g.status !== 'completed'));
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
			setGames(games.filter(g => g.id !== gameId));
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

			{loading && <p style={styles.loadingText}>Loading games...</p>}
			{error && <p style={styles.errorText}>{error}</p>}

			{!loading && games.length > 0 && (
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
										<span style={styles.detailValue}>{game.deck1_name} vs {game.deck2_name}</span>
									</div>
									<div style={styles.detailRow}>
										<span style={styles.detailLabel}>Life Totals:</span>
										<span style={styles.detailValue}>
											{game.seat1_life ?? '20'} / {game.seat2_life ?? '20'}
										</span>
									</div>
								</div>
								<div style={styles.gameActions}>
									<button
										style={styles.continueButton}
										onClick={() => handleContinueGame(game.id)}
									>
										Continue Game
									</button>
									<button
										style={styles.endButton}
										onClick={() => handleEndGame(game.id)}
									>
										End Game
									</button>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{!loading && games.length === 0 && (
				<p style={styles.noGamesText}>No active games. Start a new one!</p>
			)}
		</div>
	);
}

function DeckDetailPage() {
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
}

function App() {
	return (
		<BrowserRouter>
			<div style={styles.app}>
				<Routes>
					<Route path="/" element={<HomePage />} />
					<Route
						path="/decks"
						element={
							<div style={styles.container}>
								<Link to="/">
									<button style={styles.backButton}>← Home</button>
								</Link>
								<DeckList />
							</div>
						}
					/>
					<Route path="/decks/:deckId" element={<DeckDetailPage />} />
					<Route
						path="/setup-game"
						element={
							<div style={styles.container}>
								<Link to="/">
									<button style={styles.backButton}>← Back</button>
								</Link>
								<GameSetup />
							</div>
						}
					/>
					<Route
						path="/games/:gameId"
						element={
							<div>
								<GameBoard />
							</div>
						}
					/>
				</Routes>
			</div>
		</BrowserRouter>
	);
}

const styles = {
	app: {
		minHeight: '100vh',
		backgroundColor: '#1a1a1a',
		color: '#fff',
	},
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

export default App;
