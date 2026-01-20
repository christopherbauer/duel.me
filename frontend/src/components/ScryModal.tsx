import React, { useState } from "react";

export interface ScryModalProps {
	cards: any[];
	type: "scry" | "surveil";
	onConfirm: (arrangement: {
		top: string[];
		bottom: string[];
		graveyard?: string[];
	}) => void;
	onCancel: () => void;
}

export const ScryModal: React.FC<ScryModalProps> = ({
	cards,
	type,
	onConfirm,
	onCancel,
}) => {
	const [top, setTop] = useState<string[]>(cards.map((c) => c.id));
	const [bottom, setBottom] = useState<string[]>([]);
	const [graveyard, setGraveyard] = useState<string[]>([]);

	const topCards = cards.filter((c) => top.includes(c.id));
	const bottomCards = cards.filter((c) => bottom.includes(c.id));
	const graveyardCards = cards.filter((c) => graveyard.includes(c.id));

	const isComplete =
		top.length + bottom.length + graveyard.length === cards.length;

	const moveToBottom = (cardId: string) => {
		setTop(top.filter((id) => id !== cardId));
		setBottom([...bottom, cardId]);
	};

	const moveToGraveyard = (cardId: string) => {
		setTop(top.filter((id) => id !== cardId));
		setGraveyard([...graveyard, cardId]);
	};

	const moveToTop = (cardId: string) => {
		setBottom(bottom.filter((id) => id !== cardId));
		setGraveyard(graveyard.filter((id) => id !== cardId));
		setTop([...top, cardId]);
	};

	const handleConfirm = () => {
		onConfirm({
			top,
			bottom,
			...(type === "surveil" && { graveyard }),
		});
	};

	const renderCard = (card: any) => {
		const handleDragStart = (e: React.DragEvent) => {
			e.dataTransfer.effectAllowed = "move";
			e.dataTransfer.setData(
				"application/json",
				JSON.stringify({ cardId: card.id }),
			);
		};

		return (
			<div
				key={card.id}
				style={styles.card}
				draggable
				onDragStart={handleDragStart}
				title={card.card && card.card.name ? card.card.name : "Unknown"}
			>
				{card.card &&
				card.card.image_uris &&
				card.card.image_uris.normal ? (
					<img
						src={card.card.image_uris.normal}
						style={styles.cardImage}
						alt={card.card.name || "Card"}
					/>
				) : (
					<div style={styles.cardPlaceholder}>
						{card.card && card.card.name
							? card.card.name
							: "Unknown"}
					</div>
				)}
			</div>
		);
	};

	return (
		<div style={styles.overlay}>
			<div style={styles.modal}>
				<div style={styles.header}>
					<h2 style={styles.title}>
						{type === "scry" ? "Scry" : "Surveil"} {cards.length}
					</h2>
					<p style={styles.instructions}>
						{type === "scry"
							? "Drag cards to arrange. Unplaced cards go to bottom."
							: "Drag cards to arrange. Unplaced cards go to graveyard."}
					</p>
				</div>

				<div style={styles.content}>
					{/* Top of Library */}
					<div style={styles.zone}>
						<div style={styles.zoneTitle}>
							Top of Library ({top.length})
						</div>
						<div
							style={styles.zoneCards}
							onDragOver={(e) => {
								e.preventDefault();
								e.dataTransfer.dropEffect = "move";
							}}
							onDrop={(e) => {
								e.preventDefault();
								const data = JSON.parse(
									e.dataTransfer.getData("application/json"),
								);
								if (data.cardId && !top.includes(data.cardId)) {
									moveToTop(data.cardId);
								}
							}}
						>
							{topCards.length === 0 ? (
								<div style={styles.emptyZone}>
									Drag cards here
								</div>
							) : (
								topCards.map((card) => renderCard(card))
							)}
						</div>
					</div>

					{/* Bottom of Library (Scry only) */}
					{type === "scry" && (
						<div style={styles.zone}>
							<div style={styles.zoneTitle}>
								Bottom of Library ({bottom.length})
							</div>
							<div
								style={styles.zoneCards}
								onDragOver={(e) => {
									e.preventDefault();
									e.dataTransfer.dropEffect = "move";
								}}
								onDrop={(e) => {
									e.preventDefault();
									const data = JSON.parse(
										e.dataTransfer.getData(
											"application/json",
										),
									);
									if (
										data.cardId &&
										!bottom.includes(data.cardId)
									) {
										moveToBottom(data.cardId);
									}
								}}
							>
								{bottomCards.length === 0 ? (
									<div style={styles.emptyZone}>
										Drag cards here
									</div>
								) : (
									bottomCards.map((card) => renderCard(card))
								)}
							</div>
						</div>
					)}

					{/* Graveyard (Surveil only) */}
					{type === "surveil" && (
						<div style={styles.zone}>
							<div style={styles.zoneTitle}>
								Graveyard ({graveyard.length})
							</div>
							<div
								style={styles.zoneCards}
								onDragOver={(e) => {
									e.preventDefault();
									e.dataTransfer.dropEffect = "move";
								}}
								onDrop={(e) => {
									e.preventDefault();
									const data = JSON.parse(
										e.dataTransfer.getData(
											"application/json",
										),
									);
									if (
										data.cardId &&
										!graveyard.includes(data.cardId)
									) {
										moveToGraveyard(data.cardId);
									}
								}}
							>
								{graveyardCards.length === 0 ? (
									<div style={styles.emptyZone}>
										Drag cards here
									</div>
								) : (
									graveyardCards.map((card) =>
										renderCard(card),
									)
								)}
							</div>
						</div>
					)}
				</div>

				<div style={styles.footer}>
					<button onClick={onCancel} style={styles.cancelButton}>
						Cancel
					</button>
					<button
						onClick={handleConfirm}
						disabled={!isComplete}
						style={{
							...styles.confirmButton,
							opacity: isComplete ? 1 : 0.5,
							cursor: isComplete ? "pointer" : "not-allowed",
						}}
					>
						Confirm
					</button>
				</div>
			</div>
		</div>
	);
};

const styles = {
	overlay: {
		position: "fixed" as const,
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: "rgba(0, 0, 0, 0.8)",
		display: "flex" as const,
		alignItems: "center" as const,
		justifyContent: "center" as const,
		zIndex: 3000,
	},
	modal: {
		backgroundColor: "#1a1a1a",
		border: "2px solid #0066ff",
		borderRadius: "8px",
		padding: "20px",
		maxWidth: "1000px",
		maxHeight: "80vh",
		display: "flex" as const,
		flexDirection: "column" as const,
		boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
	},
	header: {
		marginBottom: "20px",
	},
	title: {
		margin: "0 0 8px 0",
		fontSize: "18px",
		fontWeight: "bold" as const,
		color: "#fff",
	},
	instructions: {
		margin: 0,
		fontSize: "12px",
		color: "#aaa",
	},
	content: {
		display: "grid" as const,
		gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
		gap: "15px",
		flex: 1,
		overflowY: "auto" as const,
		marginBottom: "15px",
	},
	zone: {
		backgroundColor: "#0d0d0d",
		border: "1px solid #444",
		borderRadius: "6px",
		padding: "12px",
		display: "flex" as const,
		flexDirection: "column" as const,
		minHeight: "200px",
	},
	zoneTitle: {
		fontSize: "12px",
		fontWeight: "bold" as const,
		color: "#0066ff",
		marginBottom: "10px",
		textTransform: "uppercase" as const,
		letterSpacing: "0.5px",
	},
	zoneCards: {
		flex: 1,
		display: "flex" as const,
		flexDirection: "row" as const,
		flexWrap: "wrap" as const,
		gap: "12px",
		overflowY: "auto" as const,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		borderRadius: "4px",
		padding: "12px",
		minHeight: "220px",
		alignContent: "flex-start" as const,
	},
	card: {
		width: "140px",
		height: "195px",
		flex: "0 0 auto",
		cursor: "move",
		transition: "opacity 0.2s, transform 0.2s",
		border: "2px solid transparent",
		borderRadius: "4px",
		opacity: 1,
	},
	cardImage: {
		width: "100%",
		height: "100%",
		borderRadius: "4px",
		objectFit: "cover" as const,
	},
	cardPlaceholder: {
		width: "100%",
		height: "100%",
		backgroundColor: "#2a2a2a",
		border: "1px solid #555",
		borderRadius: "4px",
		display: "flex" as const,
		alignItems: "center" as const,
		justifyContent: "center" as const,
		fontSize: "10px",
		color: "#aaa",
		textAlign: "center" as const,
		padding: "8px",
		boxSizing: "border-box" as const,
	},
	cardActions: {
		display: "flex" as const,
		gap: "4px",
	},
	actionButton: {
		padding: "4px 8px",
		fontSize: "10px",
		backgroundColor: "#0066ff",
		color: "#fff",
		border: "none",
		borderRadius: "3px",
		cursor: "pointer",
		whiteSpace: "nowrap" as const,
	},
	emptyZone: {
		fontSize: "11px",
		color: "#666",
		fontStyle: "italic" as const,
		textAlign: "center" as const,
		padding: "20px 10px",
	},
	footer: {
		display: "flex" as const,
		gap: "10px",
		justifyContent: "flex-end" as const,
	},
	cancelButton: {
		padding: "8px 16px",
		backgroundColor: "#444",
		color: "#fff",
		border: "none",
		borderRadius: "4px",
		cursor: "pointer",
		fontSize: "12px",
	},
	confirmButton: {
		padding: "8px 20px",
		backgroundColor: "#00cc44",
		color: "#fff",
		border: "none",
		borderRadius: "4px",
		fontWeight: "bold" as const,
		fontSize: "12px",
	},
};
