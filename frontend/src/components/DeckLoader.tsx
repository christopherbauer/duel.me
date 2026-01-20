import React, { useState } from "react";
import { api } from "../api";
import { useGameStore } from "../store";

interface DeckLoaderProps {
	onDeckCreated?: (deckId: string) => void;
}

export const DeckLoader: React.FC<DeckLoaderProps> = ({ onDeckCreated }) => {
	const [deckName, setDeckName] = useState("");
	const [deckText, setDeckText] = useState("");
	const [commander, setCommander] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const handleCreateDeck = async () => {
		if (!deckName.trim() || !deckText.trim()) {
			setError("Deck name and card list are required");
			return;
		}

		setLoading(true);
		setError("");

		try {
			const cardLines = deckText
				.split("\n")
				.map((line) => line.trim())
				.filter(
					(line) =>
						line &&
						!line.startsWith("//") &&
						!line.toLowerCase().includes("sideboard")
				);

			const response = await api.createDeck({
				name: deckName,
				description: `Created ${new Date().toLocaleString()}`,
				cardLines,
				commanderCardNames: commander ? [commander] : [],
			});

			setDeckName("");
			setDeckText("");
			setCommander("");
			onDeckCreated?.(response.data.id);
		} catch (err: any) {
			setError(err.response?.data?.error || "Failed to create deck");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div style={styles.container}>
			<h2>Create New Deck</h2>
			{error && <div style={styles.error}>{error}</div>}

			<div style={styles.formGroup}>
				<label>Deck Name *</label>
				<input
					type="text"
					value={deckName}
					onChange={(e) => setDeckName(e.target.value)}
					placeholder="e.g., Urza Control"
					style={styles.input}
					disabled={loading}
				/>
			</div>

			<div style={styles.formGroup}>
				<label>Commander</label>
				<input
					type="text"
					value={commander}
					onChange={(e) => setCommander(e.target.value)}
					placeholder="e.g., Urza, Lord High Artificer"
					style={styles.input}
					disabled={loading}
				/>
			</div>

			<div style={styles.formGroup}>
				<label>Card List * (one per line, format: 1x Card Name)</label>
				<textarea
					value={deckText}
					onChange={(e) => setDeckText(e.target.value)}
					placeholder={"1 Mountain\n2 Lightning Bolt\n..."}
					style={{
						...styles.input,
						minHeight: "300px",
						fontFamily: "monospace",
					}}
					disabled={loading}
				/>
			</div>

			<button
				onClick={handleCreateDeck}
				disabled={loading}
				style={styles.button}
			>
				{loading ? "Creating..." : "Create Deck"}
			</button>
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
