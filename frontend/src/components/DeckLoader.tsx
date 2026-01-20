import React, { useState, useEffect } from "react";
import { api } from "../api";
import { CreateDeckRequest } from "../types";

interface DeckLoaderProps {
	deckId?: string;
	onDeckCreated?: (deckId: string) => void;
	onDeckUpdated?: (deckId: string) => void;
}

interface LegendaryCard {
	name: string;
	type_line: string;
}

export const DeckLoader: React.FC<DeckLoaderProps> = ({
	deckId,
	onDeckCreated,
	onDeckUpdated,
}) => {
	const [deckName, setDeckName] = useState("");
	const [deckText, setDeckText] = useState("");
	const [legendaryCards, setLegendaryCards] = useState<LegendaryCard[]>([]);
	const [selectedCommander, setSelectedCommander] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const isEditing = !!deckId;

	// Load existing deck if editing
	useEffect(() => {
		if (deckId) {
			loadDeck(deckId);
		}
	}, [deckId]);

	// Parse deck text and extract legendary creatures whenever it changes
	useEffect(() => {
		parseDeckTextForLegendaries();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [deckText]);

	const loadDeck = async (id: string) => {
		try {
			setLoading(true);
			const response = await api.getDeck(id);
			const { name, cards, commander_ids } = response.data;

			setDeckName(name);

			// Reconstruct deck text from cards
			const deckLines = cards
				.map((card: any) => `${card.quantity} ${card.name}`)
				.join("\n");
			setDeckText(deckLines);

			// Set selected commander if available
			if (commander_ids && commander_ids.length > 0) {
				// Find the card name for the first commander ID
				const commanderCard = cards.find(
					(c: any) => c.id === commander_ids[0],
				);
				if (commanderCard) {
					setSelectedCommander(commanderCard.name);
				}
			}
		} catch (err) {
			setError("Failed to load deck");
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	const parseDeckTextForLegendaries = async () => {
		const lines = deckText
			.split("\n")
			.map((line) => line.trim())
			.filter(
				(line) =>
					line &&
					!line.startsWith("//") &&
					!line.toLowerCase().includes("sideboard"),
			);

		const legends: LegendaryCard[] = [];
		const searchPromises = [];

		for (const line of lines) {
			// Match patterns like "1 Card", "1x Card", "4 Card Name"
			const match = line.match(/^(\d+)[x\s]+(.+)$/i);
			if (match) {
				const cardName = match[2].trim();
				const searchPromise = (async () => {
					try {
						console.log(
							`[DeckLoader] Searching for card: "${cardName}"`,
						);

						// Try searching with the exact name first
						let response = await api.searchCards(cardName, 5);

						if (!response.data || response.data.length === 0) {
							console.log(
								`[DeckLoader] No results for "${cardName}"`,
							);
							return null;
						}

						// Find a matching card (exact or close match)
						let foundCard = response.data.find(
							(card: any) =>
								card.name.toLowerCase() ===
								cardName.toLowerCase(),
						);

						if (!foundCard) {
							foundCard = response.data[0];
						}

						console.log(
							`[DeckLoader] Found card: "${foundCard.name}", type: "${foundCard.type_line}"`,
						);

						if (
							foundCard.type_line &&
							foundCard.type_line
								.toLowerCase()
								.includes("legendary") &&
							foundCard.type_line
								.toLowerCase()
								.includes("creature")
						) {
							console.log(
								`[DeckLoader] "${foundCard.name}" is a legendary creature ✓`,
							);
							return {
								name: foundCard.name,
								type_line: foundCard.type_line,
							};
						} else {
							console.log(
								`[DeckLoader] "${foundCard.name}" is not a legendary creature (type: ${foundCard.type_line})`,
							);
						}
					} catch (err) {
						console.error(
							`[DeckLoader] Error searching for "${cardName}":`,
							err,
						);
					}
					return null;
				})();
				searchPromises.push(searchPromise);
			}
		}

		const results = await Promise.all(searchPromises);
		const validLegends = results.filter(
			(result) => result !== null,
		) as LegendaryCard[];

		console.log(
			`[DeckLoader] Found ${validLegends.length} legendary creatures:`,
			validLegends.map((l) => l.name),
		);

		setLegendaryCards(validLegends);

		// Auto-select the first legendary if none selected
		if (validLegends.length > 0 && !selectedCommander) {
			setSelectedCommander(validLegends[0].name);
		}
	};

	const handleSaveDeck = async () => {
		if (!deckName.trim() || !deckText.trim()) {
			setError("Deck name and card list are required");
			return;
		}

		if (!selectedCommander) {
			setError("Please select a commander from the deck");
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
						!line.toLowerCase().includes("sideboard"),
				);

			const payload: CreateDeckRequest = {
				name: deckName,
				description: `Last updated ${new Date().toLocaleString()}`,
				cardLines,
				commanderCardNames: [selectedCommander],
			};

			if (isEditing) {
				await api.updateDeck(deckId, payload);
				onDeckUpdated?.(deckId);
			} else {
				const response = await api.createDeck(payload);
				onDeckCreated?.(response.data.id);
			}
		} catch (err: any) {
			setError(err.response?.data?.error || "Failed to save deck");
		} finally {
			setLoading(false);
		}
	};

	const cardLinesList = deckText
		.split("\n")
		.map((line) => line.trim())
		.filter(
			(line) =>
				line &&
				!line.startsWith("//") &&
				!line.toLowerCase().includes("sideboard"),
		);

	return (
		<div style={styles.container}>
			<h2>{isEditing ? "Edit Deck" : "Create New Deck"}</h2>
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
				<div style={styles.stats}>
					{cardLinesList.length} cards, {legendaryCards.length}{" "}
					legendary creatures found
				</div>
			</div>

			{legendaryCards.length > 0 && (
				<div style={styles.formGroup}>
					<label>Commander * (auto-detected from deck)</label>
					<select
						value={selectedCommander}
						onChange={(e) => setSelectedCommander(e.target.value)}
						style={styles.input}
						disabled={loading}
					>
						<option value="">Select a commander...</option>
						{legendaryCards.map((card) => (
							<option key={card.name} value={card.name}>
								{card.name}
							</option>
						))}
					</select>
				</div>
			)}

			<button
				onClick={handleSaveDeck}
				disabled={loading || legendaryCards.length === 0}
				style={styles.button}
			>
				{loading
					? "Saving..."
					: isEditing
						? "Update Deck"
						: "Create Deck"}
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
	stats: {
		color: "#999",
		fontSize: "12px",
		marginTop: "5px",
	},
} as Record<string, React.CSSProperties>;
