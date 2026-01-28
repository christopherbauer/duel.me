import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { DeckList } from './components/DeckList';
import { GameSetup } from './components/GameSetup';
import { GameBoard } from './components/GameBoard';
import { HomePage } from './components/HomePage';
import { DeckDetailPage } from './components/DeckDetailPage';

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
