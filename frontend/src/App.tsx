import React from "react";
import {
	BrowserRouter,
	Routes,
	Route,
	Link,
	useParams,
} from "react-router-dom";
import { DeckList } from "./components/DeckList";
import { DeckLoader } from "./components/DeckLoader";
import { GameSetup } from "./components/GameSetup";
import { GameBoard } from "./components/GameBoard";

function HomePage() {
	return (
		<div style={styles.homeContainer}>
			<h1 style={styles.title}>duel.me</h1>
			<p style={styles.subtitle}>Commander Duel Playtester v0</p>

			<div style={styles.buttonGroup}>
				<Link to="/decks">
					<button style={styles.primaryButton}>Manage Decks</button>
				</Link>
				<Link to="/setup-game">
					<button style={styles.primaryButton}>Start Game</button>
				</Link>
			</div>
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
									<button style={styles.backButton}>
										← Home
									</button>
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
									<button style={styles.backButton}>
										← Back
									</button>
								</Link>
								<GameSetup />
							</div>
						}
					/>
					<Route
						path="/games/:gameId"
						element={
							<div>
								<Link to="/">
									<button style={styles.backButton}>
										← Back to Home
									</button>
								</Link>
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
		minHeight: "100vh",
		backgroundColor: "#1a1a1a",
		color: "#fff",
	},
	homeContainer: {
		display: "flex",
		flexDirection: "column" as const,
		justifyContent: "center",
		alignItems: "center",
		height: "100vh",
	},
	title: {
		fontSize: "48px",
		fontWeight: "bold" as const,
		marginBottom: "10px",
	},
	subtitle: {
		fontSize: "18px",
		color: "#999",
		marginBottom: "40px",
	},
	buttonGroup: {
		display: "flex",
		gap: "20px",
	},
	primaryButton: {
		padding: "15px 30px",
		fontSize: "16px",
		fontWeight: "bold" as const,
		backgroundColor: "#0066ff",
		color: "#fff",
		border: "none",
		borderRadius: "8px",
		cursor: "pointer",
		transition: "background-color 0.3s",
	},
	container: {
		padding: "20px",
		maxWidth: "800px",
		margin: "0 auto",
	},
	backButton: {
		marginBottom: "20px",
		padding: "8px 16px",
		backgroundColor: "#444",
		color: "#fff",
		border: "none",
		borderRadius: "4px",
		cursor: "pointer",
	},
};

export default App;
