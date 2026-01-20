import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { CreateGameRequest } from "../types";

export const GameSetup: React.FC = () => {
	const navigate = useNavigate();
	const [decks, setDecks] = useState<any[]>([]);
	const [selectedDeck1, setSelectedDeck1] = useState("");
	const [selectedDeck2, setSelectedDeck2] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		loadDecks();
	}, []);

	const loadDecks = async () => {
		try {
			const response = await api.listDecks();
			setDecks(response.data);
		} catch (err: any) {
			setError("Failed to load decks");
		}
	};

	const handleCreateGame = async () => {
		if (!selectedDeck1 || !selectedDeck2) {
			setError("Select both decks");
			return;
		}

		setLoading(true);
		setError("");

		try {
			const payload: CreateGameRequest = {
				deck1_id: selectedDeck1,
				deck2_id: selectedDeck2,
				name: `${
					decks.find((d) => d.id === selectedDeck1).name || "Deck 1"
				} vs ${
					decks.find((d) => d.id === selectedDeck2).name || "Deck 2"
				}`,
			};
			const response = await api.createGame(payload);
			navigate(`/games/${response.data.id}`);
		} catch (err: any) {
			setError(err.response?.data?.error || "Failed to create game");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div style={styles.container}>
			<h2>Start New Game</h2>
			{error && <div style={styles.error}>{error}</div>}

			<div style={styles.formGroup}>
				<label>Seat 1 Deck *</label>
				<select
					value={selectedDeck1}
					onChange={(e) => setSelectedDeck1(e.target.value)}
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

			<div style={styles.formGroup}>
				<label>Seat 2 Deck *</label>
				<select
					value={selectedDeck2}
					onChange={(e) => setSelectedDeck2(e.target.value)}
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

			<button
				onClick={handleCreateGame}
				disabled={loading}
				style={styles.button}
			>
				{loading ? "Creating..." : "Start Game"}
			</button>

			{decks.length === 0 && (
				<p style={{ color: "#999", marginTop: "10px" }}>
					Create a deck first to start playing.
				</p>
			)}
		</div>
	);
};

const styles = {
	container: {
		padding: "20px",
		backgroundColor: "#2a2a2a",
		borderRadius: "8px",
		maxWidth: "600px",
	},
	formGroup: {
		marginBottom: "15px",
	},
	input: {
		width: "100%",
		padding: "10px",
		marginTop: "5px",
		borderRadius: "4px",
		border: "1px solid #444",
		backgroundColor: "#1a1a1a",
		color: "#fff",
		fontSize: "14px",
	} as React.CSSProperties,
	button: {
		padding: "10px 20px",
		backgroundColor: "#0066ff",
		color: "#fff",
		border: "none",
		borderRadius: "4px",
		cursor: "pointer",
		fontSize: "14px",
		fontWeight: "bold",
	},
	error: {
		color: "#ff4444",
		marginBottom: "15px",
		padding: "10px",
		backgroundColor: "#330000",
		borderRadius: "4px",
	},
};
