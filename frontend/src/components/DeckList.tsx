import React, { useState, useEffect } from "react";
import { api } from "../api";
import { DeckLoader } from "./DeckLoader";
import { Link } from "react-router-dom";

interface Deck {
	id: string;
	name: string;
	description?: string;
	updated_at: string;
	commander_ids?: string[];
	cards?: any[];
	commander_image?: string;
}

type View = "list" | "create" | "edit";

export const DeckList: React.FC = () => {
	const [view, setView] = useState<View>("list");
	const [decks, setDecks] = useState<Deck[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [editingDeckId, setEditingDeckId] = useState<string | null>(null);

	const loadDecks = async () => {
		try {
			setLoading(true);
			const response = await api.listDecks();
			const decksData = response.data;

			// Fetch full details for each deck to get commander image
			const decksWithImages = await Promise.all(
				decksData.map(async (deck: Deck) => {
					try {
						const fullDeck = await api.getDeck(deck.id);
						const commanderImage = getCommanderImage(fullDeck.data);
						return { ...deck, commander_image: commanderImage };
					} catch (err) {
						console.error(
							`Failed to fetch details for deck ${deck.id}`,
							err,
						);
						return deck;
					}
				}),
			);

			setDecks(decksWithImages);
		} catch (err) {
			setError("Failed to load decks");
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadDecks();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleDeleteDeck = async (id: string, name: string) => {
		if (!window.confirm(`Delete deck "${name}"?`)) {
			return;
		}

		try {
			await api.deleteDeck(id);
			setDecks(decks.filter((d) => d.id !== id));
		} catch (err) {
			setError("Failed to delete deck");
			console.error(err);
		}
	};

	const handleDeckCreated = (deckId: string) => {
		setView("list");
		loadDecks();
	};

	const handleDeckUpdated = (deckId: string) => {
		setView("list");
		loadDecks();
	};

	// Helper to get commander image from deck (if present)
	function getCommanderImage(deck: any): string | undefined {
		if (deck.commander_ids && deck.cards) {
			const commander = deck.cards.find((c: any) =>
				deck.commander_ids.includes(c.id),
			);
			if (commander && commander.image_uris) {
				return (
					commander.image_uris.art_crop || commander.image_uris.normal
				);
			}
		}
		return undefined;
	}

	if (view === "create") {
		return (
			<div>
				<button
					onClick={() => setView("list")}
					style={styles.backButton}
				>
					← Back to Decks
				</button>
				<DeckLoader onDeckCreated={handleDeckCreated} />
			</div>
		);
	}

	if (view === "edit" && editingDeckId) {
		return (
			<div>
				<button
					onClick={() => {
						setView("list");
						setEditingDeckId(null);
					}}
					style={styles.backButton}
				>
					← Back to Decks
				</button>
				<DeckLoader
					deckId={editingDeckId}
					onDeckUpdated={handleDeckUpdated}
				/>
			</div>
		);
	}

	return (
		<div style={styles.container}>
			<div style={styles.header}>
				<h2>My Decks</h2>
				<button
					onClick={() => setView("create")}
					style={styles.createButton}
				>
					+ Create New Deck
				</button>
			</div>

			{error && <div style={styles.error}>{error}</div>}

			{loading ? (
				<div style={styles.loading}>Loading decks...</div>
			) : decks.length === 0 ? (
				<div style={styles.empty}>
					<p>No decks yet. Create one to get started!</p>
				</div>
			) : (
				<div style={styles.deckGrid}>
					{decks.map((deck) => (
						<Link
							to={`/decks/${deck.id}`}
							key={deck.id}
							style={{ textDecoration: "none" }}
						>
							<div
								style={{
									...styles.deckCard,
									backgroundImage: deck.commander_image
										? `url(${deck.commander_image})`
										: undefined,
									backgroundSize: "cover",
									backgroundPosition: "center",
									backgroundRepeat: "no-repeat",
									position: "relative",
									overflow: "hidden",
								}}
							>
								<div
									style={{
										position: "absolute",
										top: 0,
										left: 0,
										width: "100%",
										height: "100%",
										background: deck.commander_image
											? "rgba(30,30,30,0.75)"
											: undefined,
										zIndex: 1,
									}}
								/>
								<div
									style={{ position: "relative", zIndex: 2 }}
								>
									<div style={styles.deckName}>
										{deck.name}
									</div>
									{deck.description && (
										<div style={styles.deckDescription}>
											{deck.description}
										</div>
									)}
									<div style={styles.deckDate}>
										Updated{" "}
										{new Date(
											deck.updated_at,
										).toLocaleDateString()}
									</div>
									<div style={styles.deckActions}>
										<span
											style={{
												...styles.editButton,
												opacity: 0.7,
												pointerEvents: "none",
											}}
										>
											Edit
										</span>
										<button
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												handleDeleteDeck(
													deck.id,
													deck.name,
												);
											}}
											style={styles.deleteButton}
										>
											Delete
										</button>
									</div>
								</div>
							</div>
						</Link>
					))}
				</div>
			)}
		</div>
	);
};

const styles = {
	container: {
		padding: "20px",
		maxWidth: "1000px",
	},
	header: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: "20px",
	},
	createButton: {
		padding: "10px 20px",
		backgroundColor: "#00aa00",
		color: "#fff",
		border: "none",
		borderRadius: "4px",
		cursor: "pointer",
		fontSize: "14px",
		fontWeight: "bold",
	},
	backButton: {
		padding: "8px 16px",
		backgroundColor: "#444",
		color: "#fff",
		border: "none",
		borderRadius: "4px",
		cursor: "pointer",
		fontSize: "14px",
		marginBottom: "20px",
	},
	deckGrid: {
		display: "grid",
		gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
		gap: "15px",
	},
	deckCard: {
		backgroundColor: "#2a2a2a",
		padding: "15px",
		borderRadius: "8px",
		border: "1px solid #444",
	},
	deckName: {
		fontSize: "16px",
		fontWeight: "bold",
		marginBottom: "8px",
		color: "#fff",
	},
	deckDescription: {
		fontSize: "12px",
		color: "#999",
		marginBottom: "8px",
	},
	deckDate: {
		fontSize: "11px",
		color: "#666",
		marginBottom: "12px",
	},
	deckActions: {
		display: "flex",
		gap: "8px",
	},
	editButton: {
		flex: 1,
		padding: "8px 12px",
		backgroundColor: "#0066ff",
		color: "#fff",
		border: "none",
		borderRadius: "4px",
		cursor: "pointer",
		fontSize: "12px",
		fontWeight: "bold",
	},
	deleteButton: {
		flex: 1,
		padding: "8px 12px",
		backgroundColor: "#ff4444",
		color: "#fff",
		border: "none",
		borderRadius: "4px",
		cursor: "pointer",
		fontSize: "12px",
		fontWeight: "bold",
	},
	error: {
		color: "#ff4444",
		padding: "10px",
		backgroundColor: "#330000",
		borderRadius: "4px",
		marginBottom: "15px",
	},
	loading: {
		color: "#999",
		padding: "20px",
		textAlign: "center",
	},
	empty: {
		color: "#999",
		padding: "40px 20px",
		textAlign: "center",
		backgroundColor: "#2a2a2a",
		borderRadius: "8px",
	},
} as Record<string, React.CSSProperties>;
