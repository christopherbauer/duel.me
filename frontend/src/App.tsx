import React, { useState, useEffect } from "react";
import { DeckLoader } from "./components/DeckLoader";
import { GameSetup } from "./components/GameSetup";
import { GameBoard } from "./components/GameBoard";
import { useGameStore } from "./store";

type View = "home" | "create-deck" | "setup-game" | "in-game";

function App() {
	const [view, setView] = useState<View>("home");
	const { currentGameId, setCurrentGame, clearGame } = useGameStore();

	useEffect(() => {
		if (currentGameId && view !== "in-game") {
			setView("in-game");
		}
	}, [currentGameId, view]);

	const handleBackToHome = () => {
		clearGame();
		setView("home");
	};

	return (
		<div style={styles.app}>
			{view === "home" && (
				<div style={styles.homeContainer}>
					<h1 style={styles.title}>duel.me</h1>
					<p style={styles.subtitle}>Commander Duel Playtester v0</p>

					<div style={styles.buttonGroup}>
						<button
							style={styles.primaryButton}
							onClick={() => setView("create-deck")}
						>
							Create Deck
						</button>
						<button
							style={styles.primaryButton}
							onClick={() => setView("setup-game")}
						>
							Start Game
						</button>
					</div>
				</div>
			)}

			{view === "create-deck" && (
				<div style={styles.container}>
					<button
						style={styles.backButton}
						onClick={() => setView("home")}
					>
						← Back
					</button>
					<DeckLoader onDeckCreated={() => setView("home")} />
				</div>
			)}

			{view === "setup-game" && (
				<div style={styles.container}>
					<button
						style={styles.backButton}
						onClick={() => setView("home")}
					>
						← Back
					</button>
					<GameSetup
						onGameCreated={(gameId) => setCurrentGame(gameId)}
					/>
				</div>
			)}

			{view === "in-game" && (
				<div>
					<button
						style={styles.backButton}
						onClick={handleBackToHome}
					>
						← Back to Home
					</button>
					<GameBoard />
				</div>
			)}
		</div>
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
