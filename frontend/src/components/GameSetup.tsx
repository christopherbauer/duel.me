import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { CreateGameRequest } from '../types';
import { isAxiosError } from 'axios';

export const GameSetup: React.FC = () => {
	const navigate = useNavigate();
	const [decks, setDecks] = useState<any[]>([]);
	const [playerCount, setPlayerCount] = useState<1 | 2 | 3 | 4>(2);
	const [selectedDecks, setSelectedDecks] = useState<Record<number, string>>({
		1: '',
		2: '',
		3: '',
		4: '',
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		loadDecks();
	}, []);

	const loadDecks = async () => {
		try {
			const response = await api.listDecks();
			setDecks(response.data);
		} catch (err: any) {
			setError('Failed to load decks');
		}
	};

	const handleCreateGame = async () => {
		// Validate that at least the required decks are selected
		const requiredDecks = selectedDecks[1] && (playerCount === 1 || selectedDecks[2]);
		if (!requiredDecks || (playerCount >= 3 && !selectedDecks[3]) || (playerCount === 4 && !selectedDecks[4])) {
			setError('Select decks for all players');
			return;
		}

		setLoading(true);
		setError('');

		try {
			const deckNames = [];
			for (let i = 1; i <= playerCount; i++) {
				const deckName = decks.find((d) => d.id === selectedDecks[i])?.name || `Deck ${i}`;
				deckNames.push(deckName);
			}

			const payload: CreateGameRequest = {
				deck1_id: selectedDecks[1],
				deck2_id: playerCount >= 2 ? selectedDecks[2] : undefined,
				deck3_id: playerCount >= 3 ? selectedDecks[3] : undefined,
				deck4_id: playerCount === 4 ? selectedDecks[4] : undefined,
				player_count: playerCount,
				name: deckNames.join(' vs '),
			};
			const response = await api.createGame(payload);
			navigate(`/games/${response.data.id}`);
		} catch (err) {
			if (isAxiosError(err)) {
				setError(err.message || 'Failed to create game');
			} else {
				throw err;
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<div style={styles.container}>
			<h2>Start New Game</h2>
			{error && <div style={styles.error}>{error}</div>}

			<div style={styles.formGroup}>
				<label>Number of Players *</label>
				<div style={styles.playerCountButtons}>
					{[1, 2, 3, 4].map((count) => (
						<button
							key={count}
							onClick={() => setPlayerCount(count as 1 | 2 | 3 | 4)}
							disabled={loading}
							style={{
								...styles.playerCountButton,
								...(playerCount === count ? styles.playerCountButtonActive : {}),
							}}
						>
							{count} Player{count > 1 ? 's' : ''}
						</button>
					))}
				</div>
			</div>

			{[1, 2, 3, 4].map((seat) => {
				if (seat > playerCount) return null;

				const seatLabel = seat === 1 ? 'Seat 1 Deck (Your Deck)' : `Seat ${seat} Deck`;

				return (
					<div key={seat} style={styles.formGroup}>
						<label>{seatLabel} *</label>
						<select
							value={selectedDecks[seat]}
							onChange={(e) =>
								setSelectedDecks({
									...selectedDecks,
									[seat]: e.target.value,
								})
							}
							style={styles.input}
							disabled={loading}
						>
							<option value="">Select deck...</option>
							{decks.map((deck) => (
								<option key={deck.id} value={deck.id}>
									{deck.name}
								</option>
							))}
						</select>
					</div>
				);
			})}

			<button onClick={handleCreateGame} disabled={loading} style={styles.button}>
				{loading ? 'Creating...' : 'Start Game'}
			</button>

			{decks.length === 0 && <p style={{ color: '#999', marginTop: '10px' }}>Create a deck first to start playing.</p>}
		</div>
	);
};

const styles = {
	container: {
		padding: '20px',
		backgroundColor: '#2a2a2a',
		borderRadius: '8px',
		maxWidth: '600px',
	},
	formGroup: {
		marginBottom: '15px',
	},
	playerCountButtons: {
		display: 'flex',
		gap: '10px',
		marginTop: '5px',
	},
	playerCountButton: {
		flex: 1,
		padding: '10px',
		backgroundColor: '#333',
		color: '#fff',
		border: '2px solid #444',
		borderRadius: '4px',
		cursor: 'pointer',
		fontSize: '14px',
		fontWeight: 'bold',
		transition: 'all 0.2s',
	} as React.CSSProperties,
	playerCountButtonActive: {
		backgroundColor: '#0066ff',
		borderColor: '#0066ff',
	} as React.CSSProperties,
	input: {
		width: '100%',
		padding: '10px',
		marginTop: '5px',
		borderRadius: '4px',
		border: '1px solid #444',
		backgroundColor: '#1a1a1a',
		color: '#fff',
		fontSize: '14px',
	} as React.CSSProperties,
	button: {
		padding: '10px 20px',
		backgroundColor: '#0066ff',
		color: '#fff',
		border: 'none',
		borderRadius: '4px',
		cursor: 'pointer',
		fontSize: '14px',
		fontWeight: 'bold',
	},
	error: {
		color: '#ff4444',
		marginBottom: '15px',
		padding: '10px',
		backgroundColor: '#330000',
		borderRadius: '4px',
	},
};
