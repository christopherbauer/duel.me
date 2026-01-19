import React, { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import { Card, useGameStore } from "../store";

export const GameBoard: React.FC = () => {
	const {
		currentGameId,
		viewerSeat,
		setViewerSeat,
		gameState,
		setGameState,
	} = useGameStore();
	const [draggedCard, setDraggedCard] = useState<string | null>(null);
	const [dragStart, setDragStart] = useState<{
		cardId: string;
		initialPos: { x: number; y: number };
		mousePos: { x: number; y: number };
	} | null>(null);

	const loadGameState = useCallback(async () => {
		if (!currentGameId) return;
		try {
			const response = await api.getGame(currentGameId, viewerSeat);
			setGameState(response.data);
		} catch (err) {
			console.error("Failed to load game state:", err);
		}
	}, [currentGameId, viewerSeat, setGameState]);

	useEffect(() => {
		if (currentGameId) {
			loadGameState();
			const interval = setInterval(loadGameState, 5000);
			return () => clearInterval(interval);
		}
	}, [currentGameId, viewerSeat, loadGameState]);

	if (!gameState) {
		return <div style={styles.loading}>Loading game...</div>;
	}

	const seat1Objects = gameState.objects.filter((obj) => obj.seat === 1);
	const seat2Objects = gameState.objects.filter((obj) => obj.seat === 2);

	const seat1Life = gameState.seat1_life;
	const seat2Life = gameState.seat2_life;

	const playerObjects = viewerSeat === 1 ? seat1Objects : seat2Objects;
	const opponentObjects = viewerSeat === 1 ? seat2Objects : seat1Objects;

	return (
		<div style={styles.container}>
			<div style={styles.header}>
				<h1>duel.me — Game Board</h1>
				<button
					onClick={() => setViewerSeat(viewerSeat === 1 ? 2 : 1)}
					style={styles.switchButton}
				>
					Switch to Seat {viewerSeat === 1 ? 2 : 1}
				</button>
			</div>

			<div style={styles.board}>
				{/* Opponent (top) - 10% */}
				<div style={styles.opponentSection}>
					<div style={styles.seatLabel}>
						{viewerSeat === 1
							? "Seat 2 (Opponent)"
							: "Seat 1 (Opponent)"}
					</div>
					<div style={styles.lifeCounter}>
						<span style={styles.lifeValue}>
							{viewerSeat === 1 ? seat2Life : seat1Life}
						</span>
						<div style={styles.lifeBars}>
							<button
								style={styles.lifeButton}
								onClick={() => executeAction("life_change", -1)}
							>
								−
							</button>
							<button
								style={styles.lifeButton}
								onClick={() => executeAction("life_change", 1)}
							>
								+
							</button>
						</div>
					</div>

					<div style={styles.zoneGrid}>
						<ZoneDisplay
							zone="hand"
							label="Hand"
							objects={opponentObjects.filter(
								(o) => o.zone === "hand"
							)}
							redacted={true}
						/>
						<ZoneDisplay
							zone="library"
							label="Library"
							objects={opponentObjects.filter(
								(o) => o.zone === "library"
							)}
							redacted={true}
						/>
						<ZoneDisplay
							zone="graveyard"
							label="Graveyard"
							objects={opponentObjects.filter(
								(o) => o.zone === "graveyard"
							)}
							redacted={false}
						/>
						<ZoneDisplay
							zone="exile"
							label="Exile"
							objects={opponentObjects.filter(
								(o) => o.zone === "exile"
							)}
							redacted={false}
						/>
					</div>
				</div>

				{/* Battlefield (middle) */}
				<div style={styles.battlefieldSection}>
					<div style={styles.zoneLabel}>Battlefield</div>
					<div
						style={styles.battlefieldGrid}
						onDragOver={(e) => e.preventDefault()}
						onDrop={(e) => {
							e.preventDefault();
							const cardId = e.dataTransfer.getData("text/plain");

							if (cardId) {
								if (dragStart && dragStart.cardId === cardId) {
									// Dragging an existing battlefield card (delta movement)
									const deltaX =
										e.clientX - dragStart.mousePos.x;
									const deltaY =
										e.clientY - dragStart.mousePos.y;

									// Apply delta to initial position
									const newX =
										dragStart.initialPos.x + deltaX;
									const newY =
										dragStart.initialPos.y + deltaY;

									executeAction("move_to_battlefield", {
										objectId: cardId,
										position: { x: newX, y: newY },
									});
									setDragStart(null);
									setDraggedCard(null);
								} else {
									// Dragging from hand (absolute positioning, centered on cursor)
									const rect = (
										e.currentTarget as HTMLElement
									).getBoundingClientRect();
									const x = e.clientX - rect.left - 75; // Center card (half of 150px width)
									const y = e.clientY - rect.top - 100; // Center card (rough center height)

									executeAction("move_to_battlefield", {
										objectId: cardId,
										position: { x, y },
									});
									setDraggedCard(null);
								}
							}
						}}
					>
						{gameState.objects
							.filter((o) => o.zone === "battlefield")
							.map((obj) => (
								<div
									key={obj.id}
									draggable
									onDragStart={(e) => {
										e.dataTransfer.effectAllowed = "move";
										e.dataTransfer.setData(
											"text/plain",
											obj.id
										);
										setDraggedCard(obj.id);
										setDragStart({
											cardId: obj.id,
											initialPos: {
												x: obj.position
													? obj.position.x
													: 0,
												y: obj.position
													? obj.position.y
													: 0,
											},
											mousePos: {
												x: e.clientX,
												y: e.clientY,
											},
										});
									}}
									onDragEnd={() => {
										setDraggedCard(null);
										setDragStart(null);
									}}
									style={{
										...styles.positionedCard,
										left: `${
											obj.position ? obj.position.x : 0
										}px`,
										top: `${
											obj.position ? obj.position.y : 0
										}px`,
										opacity:
											draggedCard === obj.id ? 0.5 : 1,
									}}
								>
									<CardImage
										card={obj.card}
										isTapped={obj.is_tapped}
										onDoubleClick={() =>
											executeAction("tap", {
												objectId: obj.id,
											})
										}
									/>
								</div>
							))}
					</div>
				</div>

				{/* Your side (bottom) - 20% */}
				<div style={styles.playerSection}>
					<div style={styles.seatLabel}>Seat {viewerSeat} (You)</div>
					<div style={styles.lifeCounter}>
						<span style={styles.lifeValue}>
							{viewerSeat === 1 ? seat1Life : seat2Life}
						</span>
						<div style={styles.lifeBars}>
							<button
								style={styles.lifeButton}
								onClick={() => executeAction("life_change", -1)}
							>
								−
							</button>
							<button
								style={styles.lifeButton}
								onClick={() => executeAction("life_change", 1)}
							>
								+
							</button>
						</div>
					</div>

					<div style={styles.zoneGrid}>
						<ZoneDisplay
							zone="hand"
							label="Hand"
							objects={playerObjects.filter(
								(o) => o.zone === "hand"
							)}
							redacted={false}
							onCardDragStart={(cardId) => setDraggedCard(cardId)}
						/>
						<ZoneDisplay
							zone="library"
							label="Library"
							objects={playerObjects.filter(
								(o) => o.zone === "library"
							)}
							redacted={false}
						/>
						<ZoneDisplay
							zone="graveyard"
							label="Graveyard"
							objects={playerObjects.filter(
								(o) => o.zone === "graveyard"
							)}
							redacted={false}
						/>
						<ZoneDisplay
							zone="exile"
							label="Exile"
							objects={playerObjects.filter(
								(o) => o.zone === "exile"
							)}
							redacted={false}
						/>
					</div>

					<button
						style={styles.drawButton}
						onClick={() => executeAction("draw")}
					>
						Draw Card
					</button>
				</div>
			</div>

			<div style={styles.turnInfo}>
				Turn {gameState.turn_number} • Active: Seat{" "}
				{gameState.active_seat}
			</div>
		</div>
	);

	async function executeAction(action: string, metadata?: any) {
		if (!currentGameId) return;
		try {
			await api.executeAction(currentGameId, {
				seat: viewerSeat,
				action_type: action,
				metadata,
			});
			await loadGameState();
		} catch (err) {
			console.error("Action failed:", err);
		}
	}
};

interface ZoneDisplayProps {
	zone: string;
	label: string;
	objects: any[];
	redacted: boolean;
	onCardDragStart?: (cardId: string) => void;
}

const ZoneDisplay: React.FC<ZoneDisplayProps> = ({
	zone,
	label,
	objects,
	redacted,
	onCardDragStart,
}) => {
	const count = objects.length;

	return (
		<div style={styles.zone}>
			<div style={styles.zoneLabel}>
				{label} ({count})
			</div>
			<div style={styles.zoneContent}>
				{redacted ? (
					<div style={styles.redactedCount}>{count} card(s)</div>
				) : objects.length === 0 ? (
					<div style={styles.emptyZone}>Empty</div>
				) : (
					objects.map((obj) => (
						<div
							key={obj.id}
							draggable
							onDragStart={(e) => {
								e.dataTransfer.effectAllowed = "move";
								e.dataTransfer.setData("text/plain", obj.id);
								if (onCardDragStart) onCardDragStart(obj.id);
							}}
							style={styles.cardItem}
						>
							{obj.card ? obj.card.name : "Unknown"}
						</div>
					))
				)}
			</div>
		</div>
	);
};

interface CardImageProps {
	card?: Card;
	isTapped?: boolean;
	onDoubleClick?: () => void;
}

const CardImage: React.FC<CardImageProps> = ({
	card,
	isTapped,
	onDoubleClick,
}) => {
	const imageUrl =
		(card && card.image_uris && card.image_uris.normal) ||
		(card && card.image_uris && card.image_uris.large) ||
		null;

	return (
		<div
			style={{
				...styles.cardImage,
				transform: isTapped ? "rotate(90deg)" : "rotate(0deg)",
			}}
			onDoubleClick={onDoubleClick}
		>
			{imageUrl ? (
				<img
					src={imageUrl}
					alt={card ? card.name : "Unknown Card"}
					style={styles.cardImageImg}
					onError={(e) => {
						(e.target as HTMLImageElement).style.display = "none";
					}}
				/>
			) : (
				<div style={styles.cardPlaceholder}>
					{/* Card Header: Mana Cost (top right) */}
					<div style={styles.cardCost}>
						{card ? card.mana_cost : ""}
					</div>

					{/* Card Name */}
					<div style={styles.cardName}>
						{card ? card.name : "Unknown"}
					</div>

					{/* Card Type Line */}
					<div style={styles.cardType}>
						{card ? card.type_line : ""}
					</div>

					{/* Card Text Body */}
					<div style={styles.cardText}>
						{card ? card.oracle_text : ""}
					</div>

					{/* Power/Toughness (if creature) */}
					{card && card.power && card.toughness && (
						<div style={styles.cardPT}>
							{card.power}/{card.toughness}
						</div>
					)}
				</div>
			)}
			{isTapped && <div style={styles.tappedLabel}>TAP</div>}
		</div>
	);
};

const styles = {
	container: {
		padding: "20px",
		height: "100vh",
		display: "flex",
		flexDirection: "column" as const,
	},
	header: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: "20px",
	},
	switchButton: {
		padding: "10px 20px",
		backgroundColor: "#0066ff",
		color: "#fff",
		border: "none",
		borderRadius: "4px",
		cursor: "pointer",
		fontWeight: "bold",
	},
	board: {
		display: "flex",
		flexDirection: "column" as const,
		flex: 1,
		gap: "20px",
	},
	opponentSection: {
		flex: "0 0 10%",
		backgroundColor: "#2a2a2a",
		padding: "15px",
		borderRadius: "8px",
		display: "flex",
		flexDirection: "column" as const,
	},
	playerSection: {
		flex: "0 0 20%",
		backgroundColor: "#2a2a2a",
		padding: "15px",
		borderRadius: "8px",
		display: "flex",
		flexDirection: "column" as const,
		overflow: "auto" as const,
	},
	seatLabel: {
		fontSize: "14px",
		fontWeight: "bold" as const,
		marginBottom: "10px",
		color: "#aaa",
	},
	lifeCounter: {
		display: "flex",
		alignItems: "center",
		gap: "10px",
		marginBottom: "10px",
	},
	lifeValue: {
		fontSize: "32px",
		fontWeight: "bold" as const,
		minWidth: "60px",
	},
	lifeBars: {
		display: "flex",
		gap: "5px",
	},
	lifeButton: {
		padding: "5px 10px",
		backgroundColor: "#444",
		color: "#fff",
		border: "none",
		borderRadius: "4px",
		cursor: "pointer",
	},
	battlefieldSection: {
		flex: "0 0 70%",
		backgroundColor: "#1a1a1a",
		padding: "15px",
		borderRadius: "8px",
		position: "relative" as const,
		overflow: "hidden" as const,
		display: "flex",
		flexDirection: "column" as const,
	},
	battlefieldGrid: {
		position: "relative" as const,
		width: "100%",
		height: "100%",
		padding: "15px",
		border: "2px dashed #444",
		borderRadius: "8px",
		backgroundColor: "#0d0d0d",
	},
	positionedCard: {
		position: "absolute" as const,
		width: "150px",
		cursor: "move",
		userSelect: "none" as const,
		transition: "box-shadow 0.2s",
	},
	cardImage: {
		cursor: "pointer",
		transition: "transform 0.2s",
		perspective: "1000px",
	},
	cardImageImg: {
		width: "100%",
		height: "auto",
		borderRadius: "8px",
		boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
		userSelect: "none" as const,
	},
	cardPlaceholder: {
		width: "100%",
		aspectRatio: "2/3",
		backgroundColor: "#1a1a1a",
		border: "2px solid #444",
		borderRadius: "8px",
		padding: "8px",
		display: "flex",
		flexDirection: "column" as const,
		justifyContent: "flex-start",
		alignItems: "stretch",
		textAlign: "left" as const,
		fontSize: "10px",
		boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
		position: "relative" as const,
		overflow: "hidden" as const,
	},
	cardCost: {
		position: "absolute" as const,
		top: "4px",
		right: "4px",
		fontSize: "9px",
		fontWeight: "bold" as const,
		color: "#ffd700",
		minWidth: "20px",
		textAlign: "center" as const,
	},
	cardName: {
		fontWeight: "bold" as const,
		fontSize: "9px",
		marginBottom: "2px",
		color: "#fff",
		lineHeight: "1.2",
		flex: "0 0 auto",
	},
	cardType: {
		fontSize: "8px",
		color: "#bbb",
		marginBottom: "3px",
		lineHeight: "1.1",
		flex: "0 0 auto",
		borderTop: "1px solid #555",
		borderBottom: "1px solid #555",
		paddingTop: "2px",
		paddingBottom: "2px",
	},
	cardText: {
		fontSize: "7px",
		color: "#ddd",
		flex: "1 1 auto",
		overflowY: "auto" as const,
		marginBottom: "4px",
		lineHeight: "1.3",
	},
	cardPT: {
		position: "absolute" as const,
		bottom: "4px",
		right: "4px",
		fontSize: "8px",
		fontWeight: "bold" as const,
		color: "#fff",
		backgroundColor: "#000",
		padding: "2px 4px",
		borderRadius: "3px",
		flex: "0 0 auto",
	},
	tappedLabel: {
		position: "absolute" as const,
		top: "50%",
		left: "50%",
		transform: "translate(-50%, -50%) rotate(-90deg)",
		backgroundColor: "rgba(255, 0, 0, 0.7)",
		color: "#fff",
		padding: "5px 10px",
		fontSize: "12px",
		fontWeight: "bold" as const,
		borderRadius: "4px",
		pointerEvents: "none" as const,
	},
	zoneGrid: {
		display: "grid",
		gridTemplateColumns: "repeat(4, 1fr)",
		gap: "10px",
		marginTop: "10px",
	},
	zone: {
		backgroundColor: "#1a1a1a",
		padding: "10px",
		borderRadius: "4px",
		fontSize: "12px",
		border: "1px solid #333",
	},
	zoneLabel: {
		fontSize: "12px",
		fontWeight: "bold" as const,
		color: "#aaa",
		marginBottom: "5px",
	},
	zoneContent: {
		maxHeight: "120px",
		overflowY: "auto" as const,
		fontSize: "11px",
	},
	cardItem: {
		padding: "5px",
		marginBottom: "4px",
		backgroundColor: "#2a2a2a",
		borderRadius: "3px",
		cursor: "move",
		userSelect: "none" as const,
		fontSize: "11px",
		border: "1px solid #444",
		transition: "background-color 0.2s",
	},
	redactedCount: {
		color: "#888",
		fontStyle: "italic" as const,
	},
	emptyZone: {
		color: "#555",
		fontStyle: "italic" as const,
		padding: "5px",
	},
	drawButton: {
		marginTop: "10px",
		padding: "10px 20px",
		backgroundColor: "#006600",
		color: "#fff",
		border: "none",
		borderRadius: "4px",
		cursor: "pointer",
		fontWeight: "bold",
	},
	turnInfo: {
		marginTop: "10px",
		textAlign: "center" as const,
		color: "#999",
		fontSize: "12px",
	},
	loading: {
		padding: "20px",
		textAlign: "center" as const,
		color: "#aaa",
	},
};
