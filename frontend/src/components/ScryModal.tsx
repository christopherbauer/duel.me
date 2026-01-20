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

	return (
		<div style={styles.overlay}>
			<div style={styles.modal}>
				<div style={styles.header}>
					<h2 style={styles.title}>
						{type === "scry" ? "Scry" : "Surveil"} {cards.length}
					</h2>
					<p style={styles.instructions}>
						{type === "scry"
							? "Arrange top X cards. Cards not placed on top go to the bottom."
							: "Arrange cards. Cards moved to graveyard are exiled."}
					</p>
				</div>

				<div style={styles.content}>
					{/* Top of Library */}
					<div style={styles.zone}>
						<div style={styles.zoneTitle}>
							Top of Library ({top.length})
						</div>
						<div style={styles.zoneCards}>
							{topCards.length === 0 ? (
								<div style={styles.emptyZone}>
									Drag cards here
								</div>
							) : (
								topCards.map((card) => (
									<div
										key={card.id}
										style={styles.cardItem}
										draggable
										onDragStart={(e) => {
											e.dataTransfer.effectAllowed =
												"move";
											e.dataTransfer.setData(
												"application/json",
												JSON.stringify({
													cardId: card.id,
													from: "top",
												}),
											);
										}}
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
												data.from !== "top" &&
												data.cardId !== card.id
											) {
												moveToTop(data.cardId);
											}
										}}
									>
										<div style={styles.cardName}>
											{card.card && card.card.name
												? card.card.name
												: "Unknown"}
										</div>
										<div style={styles.cardActions}>
											{type === "scry" && (
												<button
													onClick={() =>
														moveToBottom(card.id)
													}
													style={styles.actionButton}
												>
													→ Bottom
												</button>
											)}
											{type === "surveil" && (
												<button
													onClick={() =>
														moveToGraveyard(card.id)
													}
													style={styles.actionButton}
												>
													→ Graveyard
												</button>
											)}
										</div>
									</div>
								))
							)}
						</div>
					</div>

					{/* Bottom of Library (Scry only) */}
					{type === "scry" && (
						<div style={styles.zone}>
							<div style={styles.zoneTitle}>
								Bottom of Library ({bottom.length})
							</div>
							<div style={styles.zoneCards}>
								{bottomCards.length === 0 ? (
									<div style={styles.emptyZone}>
										Drag cards here
									</div>
								) : (
									bottomCards.map((card) => (
										<div
											key={card.id}
											style={styles.cardItem}
											draggable
											onDragStart={(e) => {
												e.dataTransfer.effectAllowed =
													"move";
												e.dataTransfer.setData(
													"application/json",
													JSON.stringify({
														cardId: card.id,
														from: "bottom",
													}),
												);
											}}
											onDragOver={(e) => {
												e.preventDefault();
												e.dataTransfer.dropEffect =
													"move";
											}}
											onDrop={(e) => {
												e.preventDefault();
												const data = JSON.parse(
													e.dataTransfer.getData(
														"application/json",
													),
												);
												if (
													data.from !== "bottom" &&
													data.cardId !== card.id
												) {
													moveToBottom(data.cardId);
												}
											}}
										>
											<div style={styles.cardName}>
												{card.card && card.card.name
													? card.card.name
													: "Unknown"}
											</div>
											<button
												onClick={() =>
													moveToTop(card.id)
												}
												style={styles.actionButton}
											>
												← Top
											</button>
										</div>
									))
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
							<div style={styles.zoneCards}>
								{graveyardCards.length === 0 ? (
									<div style={styles.emptyZone}>
										Drag cards here
									</div>
								) : (
									graveyardCards.map((card) => (
										<div
											key={card.id}
											style={styles.cardItem}
											draggable
											onDragStart={(e) => {
												e.dataTransfer.effectAllowed =
													"move";
												e.dataTransfer.setData(
													"application/json",
													JSON.stringify({
														cardId: card.id,
														from: "graveyard",
													}),
												);
											}}
											onDragOver={(e) => {
												e.preventDefault();
												e.dataTransfer.dropEffect =
													"move";
											}}
											onDrop={(e) => {
												e.preventDefault();
												const data = JSON.parse(
													e.dataTransfer.getData(
														"application/json",
													),
												);
												if (
													data.from !== "graveyard" &&
													data.cardId !== card.id
												) {
													moveToGraveyard(
														data.cardId,
													);
												}
											}}
										>
											<div style={styles.cardName}>
												{card.card && card.card.name
													? card.card.name
													: "Unknown"}
											</div>
											<button
												onClick={() =>
													moveToTop(card.id)
												}
												style={styles.actionButton}
											>
												← Top
											</button>
										</div>
									))
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
		maxWidth: "800px",
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
		flexDirection: "column" as const,
		gap: "8px",
		overflowY: "auto" as const,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		borderRadius: "4px",
		padding: "8px",
		minHeight: "150px",
	},
	cardItem: {
		backgroundColor: "#2a2a2a",
		border: "1px solid #555",
		borderRadius: "4px",
		padding: "8px",
		display: "flex" as const,
		justifyContent: "space-between" as const,
		alignItems: "center" as const,
		cursor: "move",
		transition: "background-color 0.2s, border-color 0.2s",
	},
	cardName: {
		fontSize: "11px",
		color: "#fff",
		flex: 1,
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
