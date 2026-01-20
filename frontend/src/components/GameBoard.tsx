import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { Card, useGameStore } from "../store";

export const GameBoard: React.FC = () => {
	const { gameId } = useParams<{ gameId: string }>();
	const { viewerSeat, setViewerSeat, gameState, setGameState } =
		useGameStore();
	const [draggedCard, setDraggedCard] = useState<string | null>(null);
	const [dragStart, setDragStart] = useState<{
		cardId: string;
		initialPos: { x: number; y: number };
		mousePos: { x: number; y: number };
	} | null>(null);
	const [cardScale, setCardScale] = useState(1);
	const [browserZoom, setBrowserZoom] = useState(100);
	const [invertOpponent, setInvertOpponent] = useState(true);
	const [showSettings, setShowSettings] = useState(false);
	const [showZoneBreakdown, setShowZoneBreakdown] = useState<string | null>(
		null,
	);
	const [contextMenu, setContextMenu] = useState<{
		x: number;
		y: number;
		type: "library" | "card";
		objectId?: string;
	} | null>(null);
	const battlefieldRef = useRef<HTMLDivElement>(null);
	const flippedSeatsRef = useRef<Set<number>>(new Set());

	const loadGameState = useCallback(async () => {
		if (!gameId) return;
		try {
			const response = await api.getGame(gameId, viewerSeat);
			setGameState(response.data);
		} catch (err) {
			console.error("Failed to load game state:", err);
		}
	}, [gameId, viewerSeat, setGameState]);

	const executeAction = useCallback(
		async (action: string, metadata?: any) => {
			if (!gameId) return;
			try {
				await api.executeAction(gameId, {
					seat: viewerSeat,
					action_type: action,
					metadata,
				});
				await loadGameState();
			} catch (err) {
				console.error("Action failed:", err);
			}
		},
		[gameId, viewerSeat, loadGameState],
	);

	useEffect(() => {
		if (gameId) {
			loadGameState();
			flippedSeatsRef.current.clear(); // Reset flipped seats when loading new game
			const interval = setInterval(loadGameState, 5000);
			return () => clearInterval(interval);
		}
	}, [gameId, viewerSeat, loadGameState]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.code === "Space") {
				e.preventDefault();
				executeAction("end_turn");
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [executeAction]);

	useEffect(() => {
		document.body.style.zoom = `${browserZoom}%`;
	}, [browserZoom]);

	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(() => {
		if (gameState && battlefieldRef.current) {
			// Only flip if we haven't flipped for this seat yet
			if (!flippedSeatsRef.current.has(viewerSeat)) {
				const battlefieldHeight = battlefieldRef.current.clientHeight;

				// Update all battlefield card positions to flip them
				const updatedObjects = gameState.objects.map((obj) => {
					if (obj.zone === "battlefield" && obj.position) {
						const newY = battlefieldHeight - obj.position.y;
						return {
							...obj,
							position: {
								x: obj.position.x,
								y: newY,
							},
						};
					}
					return obj;
				});

				setGameState({ ...gameState, objects: updatedObjects });
				flippedSeatsRef.current.add(viewerSeat);
			}
		}
	}, [viewerSeat, gameState, setGameState]);

	if (!gameState) {
		return <div style={styles.loading}>Loading game...</div>;
	}

	const seat1Objects = gameState.objects.filter((obj) => obj.seat === 1);
	const seat2Objects = gameState.objects.filter((obj) => obj.seat === 2);

	const seat1Life = gameState.seat1_life;
	const seat2Life = gameState.seat2_life;

	const playerObjects = viewerSeat === 1 ? seat1Objects : seat2Objects;
	const opponentObjects = viewerSeat === 1 ? seat2Objects : seat1Objects;

	function getCardsByType(objects: any[]) {
		return {
			creatures: objects.filter((o) => {
				const type = o.card && o.card.type_line;
				return type && type.toLowerCase().includes("creature");
			}).length,
			instants: objects.filter((o) => {
				const type = o.card && o.card.type_line;
				return type && type.toLowerCase().includes("instant");
			}).length,
			sorceries: objects.filter((o) => {
				const type = o.card && o.card.type_line;
				return type && type.toLowerCase().includes("sorcery");
			}).length,
			lands: objects.filter((o) => {
				const type = o.card && o.card.type_line;
				return type && type.toLowerCase().includes("land");
			}).length,
			other: objects.filter((o) => {
				const type = o.card && o.card.type_line;
				return (
					type &&
					!type.toLowerCase().includes("creature") &&
					!type.toLowerCase().includes("instant") &&
					!type.toLowerCase().includes("sorcery") &&
					!type.toLowerCase().includes("land")
				);
			}).length,
		};
	}

	function handleCardDropOnBattlefield(
		e: React.DragEvent<HTMLDivElement>,
		cardId: string,
	) {
		e.preventDefault();
		if (!gameState) return;

		if (dragStart && dragStart.cardId === cardId) {
			const deltaX = e.clientX - dragStart.mousePos.x;
			const deltaY = e.clientY - dragStart.mousePos.y;

			const newX = dragStart.initialPos.x + deltaX;
			const newY = dragStart.initialPos.y + deltaY;

			const existingCard = gameState.objects.find(
				(o) =>
					o.zone === "battlefield" && o.id !== cardId && o.position,
			);
			if (
				existingCard &&
				existingCard.position &&
				Math.abs(newX - existingCard.position.x) < 3 &&
				Math.abs(newY - existingCard.position.y) < 3
			) {
				executeAction("move_to_battlefield", {
					objectId: cardId,
					position: existingCard.position,
				});
			} else {
				executeAction("move_to_battlefield", {
					objectId: cardId,
					position: { x: newX, y: newY },
				});
			}
			setDragStart(null);
			setDraggedCard(null);
		} else {
			const rect = (
				e.currentTarget as HTMLElement
			).getBoundingClientRect();
			const x = e.clientX - rect.left - 75;
			const y = e.clientY - rect.top - 100;

			executeAction("move_to_battlefield", {
				objectId: cardId,
				position: { x, y },
			});
			setDraggedCard(null);
		}
	}

	return (
		<div style={styles.container}>
			<div style={styles.header}>
				<h1 style={styles.title}>duel.me — Game Board</h1>
				<div style={styles.headerControls}>
					<button
						onClick={() => setViewerSeat(viewerSeat === 1 ? 2 : 1)}
						style={styles.switchButton}
					>
						Seat {viewerSeat === 1 ? 2 : 1}
					</button>
					<button
						onClick={() => setShowSettings(!showSettings)}
						style={styles.settingsButton}
					>
						⋮
					</button>
				</div>
			</div>

			{showSettings && (
				<div style={styles.settingsMenu}>
					<div>Browser Zoom</div>
					<div style={styles.zoomControls}>
						<button
							onClick={() =>
								setBrowserZoom(Math.max(50, browserZoom - 10))
							}
						>
							−
						</button>
						<span>{browserZoom}%</span>
						<button
							onClick={() =>
								setBrowserZoom(Math.min(200, browserZoom + 10))
							}
						>
							+
						</button>
					</div>

					<div style={{ marginTop: "10px" }}>Card Size</div>
					<div style={styles.cardScaleControls}>
						{[1, 2, 4].map((scale) => (
							<button
								key={scale}
								onClick={() => setCardScale(scale)}
								style={{
									...styles.scaleButton,
									backgroundColor:
										cardScale === scale
											? "#0066ff"
											: "#444",
								}}
							>
								{scale}×
							</button>
						))}
					</div>

					<div style={{ marginTop: "10px" }}>
						<label>
							<input
								type="checkbox"
								checked={invertOpponent}
								onChange={() =>
									setInvertOpponent(!invertOpponent)
								}
							/>
							Invert Opponent Cards
						</label>
					</div>

					<button
						onClick={() => setShowSettings(false)}
						style={styles.closeSettingsButton}
					>
						Close
					</button>
				</div>
			)}

			<div style={styles.board}>
				{/* Opponent Section (5%) */}
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
								onClick={() =>
									executeAction("life_change", { delta: -1 })
								}
							>
								−
							</button>
							<button
								style={styles.lifeButton}
								onClick={() =>
									executeAction("life_change", { delta: 1 })
								}
							>
								+
							</button>
						</div>
					</div>
					<div style={styles.zoneGrid}>
						{["hand", "library", "graveyard", "exile"].map(
							(zone) => (
								<ZoneDisplay
									key={zone}
									zone={zone}
									label={
										zone.charAt(0).toUpperCase() +
										zone.slice(1)
									}
									objects={opponentObjects.filter(
										(o) => o.zone === zone,
									)}
									redacted={
										zone === "hand" || zone === "library"
									}
									onCountClick={() =>
										setShowZoneBreakdown(`opponent-${zone}`)
									}
									showBreakdown={false}
									typeBreakdown={getCardsByType(
										opponentObjects.filter(
											(o) => o.zone === zone,
										),
									)}
								/>
							),
						)}
					</div>
				</div>

				{/* Battlefield (70%) */}
				<div ref={battlefieldRef} style={styles.battlefieldSection}>
					<div style={styles.zoneLabel}>Battlefield</div>

					{/* Opponent's cards mini preview */}
					{opponentObjects.filter((o) => o.zone === "battlefield")
						.length > 0 && (
						<div style={styles.opponentPreview}>
							<div style={styles.opponentPreviewLabel}>
								Opponent's Cards
							</div>
							<div style={styles.opponentPreviewGrid}>
								{opponentObjects
									.filter((o) => o.zone === "battlefield")
									.map((obj) => (
										<div
											key={obj.id}
											style={styles.opponentPreviewCard}
										>
											<CardImage
												card={obj.card}
												isTapped={obj.is_tapped}
												scale={0.4}
											/>
										</div>
									))}
							</div>
						</div>
					)}

					<div
						style={styles.battlefieldGrid}
						onDragOver={(e) => e.preventDefault()}
						onDrop={(e) => {
							const cardId = e.dataTransfer.getData("text/plain");
							if (cardId) handleCardDropOnBattlefield(e, cardId);
						}}
						onContextMenu={(e) => {
							e.preventDefault();
							setContextMenu({
								x: e.clientX,
								y: e.clientY,
								type: "library",
							});
						}}
					>
						{gameState.objects
							.filter(
								(o) =>
									o.zone === "battlefield" &&
									o.seat === viewerSeat,
							)
							.map((obj) => (
								<div
									key={obj.id}
									draggable
									onDragStart={(e) => {
										e.dataTransfer.effectAllowed = "move";
										e.dataTransfer.setData(
											"text/plain",
											obj.id,
										);
										setDraggedCard(obj.id);
										const posX =
											obj.position && obj.position.x
												? obj.position.x
												: 0;
										const posY =
											obj.position && obj.position.y
												? obj.position.y
												: 0;
										setDragStart({
											cardId: obj.id,
											initialPos: {
												x: posX,
												y: posY,
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
									onContextMenu={(e) => {
										e.preventDefault();
										setContextMenu({
											x: e.clientX,
											y: e.clientY,
											type: "card",
											objectId: obj.id,
										});
									}}
									onDoubleClick={() =>
										executeAction("tap", {
											objectId: obj.id,
										})
									}
									style={{
										...styles.positionedCard,
										left: `${obj.position ? obj.position.x : 0}px`,
										top: `${obj.position ? obj.position.y : 0}px`,
										opacity:
											draggedCard === obj.id ? 0.5 : 1,
										transform:
											invertOpponent &&
											obj.seat !== viewerSeat
												? "rotate(180deg)"
												: undefined,
									}}
								>
									<CardImage
										card={obj.card}
										isTapped={obj.is_tapped}
										scale={cardScale}
									/>
								</div>
							))}
					</div>
				</div>

				{/* Player Section (20%) */}
				<div style={styles.playerSection}>
					<div style={styles.seatLabel}>Seat {viewerSeat} (You)</div>
					<div style={styles.lifeCounter}>
						<span style={styles.lifeValue}>
							{viewerSeat === 1 ? seat1Life : seat2Life}
						</span>
						<div style={styles.lifeBars}>
							<button
								style={styles.lifeButton}
								onClick={() =>
									executeAction("life_change", { delta: -1 })
								}
							>
								−
							</button>
							<button
								style={styles.lifeButton}
								onClick={() =>
									executeAction("life_change", { delta: 1 })
								}
							>
								+
							</button>
						</div>
					</div>
					<div style={styles.zoneGrid}>
						{["hand", "library", "graveyard", "exile"].map(
							(zone) => (
								<ZoneDisplay
									key={zone}
									zone={zone}
									label={
										zone.charAt(0).toUpperCase() +
										zone.slice(1)
									}
									objects={playerObjects.filter(
										(o) => o.zone === zone,
									)}
									redacted={false}
									onCardDragStart={(cardId) =>
										setDraggedCard(cardId)
									}
									onCountClick={() =>
										setShowZoneBreakdown(`player-${zone}`)
									}
									showBreakdown={
										showZoneBreakdown === `player-${zone}`
									}
									typeBreakdown={getCardsByType(
										playerObjects.filter(
											(o) => o.zone === zone,
										),
									)}
								/>
							),
						)}
					</div>
				</div>
			</div>

			{/* Footer */}
			<div style={styles.footer}>
				<button
					style={styles.footerButton}
					onClick={() => (window.location.href = "/")}
				>
					← Home
				</button>
				<div style={styles.undoRedoButtons}>
					<button style={styles.footerButton}>↶ Undo</button>
					<button style={styles.footerButton}>↷ Redo</button>
				</div>
				<button
					style={styles.endTurnButton}
					onClick={() => executeAction("end_turn")}
				>
					End Turn
				</button>
			</div>

			{contextMenu && (
				<ContextMenu
					x={contextMenu.x}
					y={contextMenu.y}
					type={contextMenu.type}
					objectId={contextMenu.objectId}
					onClose={() => setContextMenu(null)}
					executeAction={executeAction}
				/>
			)}

			<div style={styles.turnInfo}>
				Turn {gameState.turn_number} • Active: Seat{" "}
				{gameState.active_seat}
			</div>
		</div>
	);
};

interface ZoneDisplayProps {
	zone: string;
	label: string;
	objects: any[];
	redacted: boolean;
	onCardDragStart?: (cardId: string) => void;
	onCountClick?: () => void;
	showBreakdown?: boolean;
	typeBreakdown?: {
		creatures: number;
		instants: number;
		sorceries: number;
		lands: number;
		other: number;
	};
}

const ZoneDisplay: React.FC<ZoneDisplayProps> = ({
	zone,
	label,
	objects,
	redacted,
	onCardDragStart,
	onCountClick,
	showBreakdown,
	typeBreakdown,
}) => {
	const count = objects.length;

	return (
		<div style={styles.zone}>
			<div style={styles.zoneLabel}>
				{label}{" "}
				<span
					onClick={onCountClick}
					style={{ cursor: "pointer", fontWeight: "bold" }}
				>
					({count})
				</span>
			</div>
			{showBreakdown && typeBreakdown && (
				<div style={styles.breakdown}>
					{typeBreakdown.creatures > 0 && (
						<div>Creatures: {typeBreakdown.creatures}</div>
					)}
					{typeBreakdown.instants > 0 && (
						<div>Instants: {typeBreakdown.instants}</div>
					)}
					{typeBreakdown.sorceries > 0 && (
						<div>Sorceries: {typeBreakdown.sorceries}</div>
					)}
					{typeBreakdown.lands > 0 && (
						<div>Lands: {typeBreakdown.lands}</div>
					)}
					{typeBreakdown.other > 0 && (
						<div>Other: {typeBreakdown.other}</div>
					)}
				</div>
			)}
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
	scale?: number;
}

const CardImage: React.FC<CardImageProps> = ({ card, isTapped, scale = 1 }) => {
	const imageUrl =
		(card && card.image_uris && card.image_uris.normal) ||
		(card && card.image_uris && card.image_uris.large) ||
		null;

	const cardWidth = 120 * scale;
	const cardHeight = 170 * scale;

	return (
		<div
			style={{
				...styles.cardImage,
				width: `${cardWidth}px`,
				height: `${cardHeight}px`,
				transform: isTapped ? "rotate(90deg)" : "rotate(0deg)",
			}}
		>
			{imageUrl ? (
				<img
					src={imageUrl}
					alt={card ? card.name : "Unknown Card"}
					style={{
						...styles.cardImageImg,
						width: "100%",
						height: "100%",
					}}
					onError={(e) => {
						(e.target as HTMLImageElement).style.display = "none";
					}}
				/>
			) : (
				<div style={styles.cardPlaceholder}>
					<div style={styles.cardCost}>
						{card ? card.mana_cost : ""}
					</div>
					<div style={styles.cardName}>
						{card ? card.name : "Unknown"}
					</div>
					<div style={styles.cardType}>
						{card ? card.type_line : ""}
					</div>
					<div style={styles.cardText}>
						{card ? card.oracle_text : ""}
					</div>
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

interface ContextMenuProps {
	x: number;
	y: number;
	type: "library" | "card";
	objectId?: string;
	onClose: () => void;
	executeAction: (action: string, metadata?: any) => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
	x,
	y,
	type,
	objectId,
	onClose,
	executeAction,
}) => {
	useEffect(() => {
		const handleClickOutside = () => onClose();
		window.addEventListener("click", handleClickOutside);
		return () => window.removeEventListener("click", handleClickOutside);
	}, [onClose]);

	const menuItems =
		type === "library"
			? [
					{ label: "Shuffle Library", action: "shuffle_library" },
					{ label: "Draw 1", action: "draw", metadata: { count: 1 } },
					{ label: "Draw 2", action: "draw", metadata: { count: 2 } },
					{ label: "Scry 1", action: "scry", metadata: { count: 1 } },
					{
						label: "Exile 1",
						action: "exile",
						metadata: { count: 1 },
					},
				]
			: [
					{ label: "Tap", action: "tap", metadata: { objectId } },
					{
						label: "Face Down",
						action: "face_down",
						metadata: { objectId },
					},
					{
						label: "Destroy",
						action: "destroy",
						metadata: { objectId },
					},
					{ label: "Exile", action: "exile", metadata: { objectId } },
				];

	return (
		<div
			style={{
				...styles.contextMenu,
				left: `${x}px`,
				top: `${y}px`,
			}}
		>
			{menuItems.map((item) => (
				<div
					key={item.label}
					style={styles.contextMenuItem}
					onClick={() => {
						executeAction(item.action, item.metadata);
						onClose();
					}}
				>
					{item.label}
				</div>
			))}
		</div>
	);
};

const styles = {
	container: {
		padding: "10px",
		height: "100vh",
		display: "flex" as const,
		flexDirection: "column" as const,
		backgroundColor: "#0a0a0a",
		color: "#fff",
		boxSizing: "border-box" as const,
		overflow: "hidden" as const,
	},
	header: {
		display: "flex" as const,
		justifyContent: "space-between" as const,
		alignItems: "center" as const,
		marginBottom: "8px",
		flex: "0 0 auto",
	},
	title: {
		margin: 0,
		fontSize: "18px",
		fontWeight: "bold" as const,
	},
	headerControls: {
		display: "flex" as const,
		gap: "10px",
	},
	switchButton: {
		padding: "6px 12px",
		backgroundColor: "#0066ff",
		color: "#fff",
		border: "none",
		borderRadius: "3px",
		cursor: "pointer",
		fontWeight: "bold" as const,
		fontSize: "12px",
	},
	settingsButton: {
		padding: "6px 12px",
		backgroundColor: "#444",
		color: "#fff",
		border: "none",
		borderRadius: "3px",
		cursor: "pointer",
		fontSize: "16px",
	},
	settingsMenu: {
		position: "fixed" as const,
		top: "50px",
		right: "10px",
		backgroundColor: "#2a2a2a",
		border: "1px solid #444",
		borderRadius: "6px",
		padding: "15px",
		zIndex: 1000,
		minWidth: "200px",
	},
	zoomControls: {
		display: "flex" as const,
		gap: "5px",
		alignItems: "center" as const,
		marginTop: "5px",
	},
	cardScaleControls: {
		display: "flex" as const,
		gap: "5px",
		marginTop: "5px",
	},
	scaleButton: {
		flex: 1,
		padding: "5px",
		border: "1px solid #555",
		borderRadius: "3px",
		backgroundColor: "#444",
		color: "#fff",
		cursor: "pointer",
	},
	closeSettingsButton: {
		width: "100%",
		marginTop: "15px",
		padding: "8px",
		backgroundColor: "#0066ff",
		color: "#fff",
		border: "none",
		borderRadius: "3px",
		cursor: "pointer",
	},
	board: {
		display: "flex" as const,
		flexDirection: "column" as const,
		flex: 1,
		gap: "8px",
		overflow: "hidden" as const,
	},
	opponentSection: {
		flex: "0 0 5%",
		backgroundColor: "#2a2a2a",
		padding: "8px",
		borderRadius: "6px",
		display: "flex" as const,
		flexDirection: "column" as const,
		overflow: "hidden" as const,
		minHeight: "40px",
	},
	battlefieldSection: {
		flex: "1 1 70%",
		backgroundColor: "#1a1a1a",
		padding: "8px",
		borderRadius: "6px",
		position: "relative" as const,
		overflow: "hidden" as const,
		display: "flex" as const,
		flexDirection: "column" as const,
		minHeight: "200px",
	},
	playerSection: {
		flex: "0 0 20%",
		backgroundColor: "#2a2a2a",
		padding: "8px",
		borderRadius: "6px",
		display: "flex" as const,
		flexDirection: "column" as const,
		overflow: "auto" as const,
		minHeight: "80px",
	},
	seatLabel: {
		fontSize: "12px",
		fontWeight: "bold" as const,
		marginBottom: "5px",
		color: "#aaa",
	},
	lifeCounter: {
		display: "flex" as const,
		alignItems: "center" as const,
		gap: "8px",
		marginBottom: "5px",
	},
	lifeValue: {
		fontSize: "24px",
		fontWeight: "bold" as const,
		minWidth: "50px",
	},
	lifeBars: {
		display: "flex" as const,
		gap: "4px",
	},
	lifeButton: {
		padding: "4px 8px",
		backgroundColor: "#444",
		color: "#fff",
		border: "none",
		borderRadius: "3px",
		cursor: "pointer",
		fontSize: "11px",
	},
	battlefieldGrid: {
		position: "relative" as const,
		width: "100%",
		height: "100%",
		padding: "8px",
		border: "1px dashed #444",
		borderRadius: "6px",
		backgroundColor: "#0d0d0d",
		overflow: "hidden" as const,
	},
	opponentPreview: {
		position: "absolute" as const,
		top: "8px",
		left: "8px",
		right: "8px",
		height: "100px",
		backgroundColor: "rgba(0, 0, 0, 0.8)",
		border: "1px solid #555",
		borderRadius: "4px",
		padding: "6px",
		zIndex: 10,
		display: "flex" as const,
		flexDirection: "column" as const,
	},
	opponentPreviewLabel: {
		fontSize: "10px",
		fontWeight: "bold" as const,
		color: "#888",
		marginBottom: "4px",
		textTransform: "uppercase" as const,
		letterSpacing: "1px",
	},
	opponentPreviewGrid: {
		display: "flex" as const,
		gap: "4px",
		flexWrap: "wrap" as const,
		overflow: "auto" as const,
		flex: 1,
	},
	opponentPreviewCard: {
		width: "50px",
		height: "68px",
		flexShrink: 0,
	},
	positionedCard: {
		position: "absolute" as const,
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
		borderRadius: "8px",
		boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
		userSelect: "none" as const,
	},
	cardPlaceholder: {
		width: "100%",
		height: "100%",
		backgroundColor: "#1a1a1a",
		border: "1px solid #444",
		borderRadius: "6px",
		padding: "6px",
		display: "flex" as const,
		flexDirection: "column" as const,
		justifyContent: "flex-start",
		alignItems: "stretch",
		textAlign: "left" as const,
		fontSize: "9px",
		boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
		position: "relative" as const,
		overflow: "hidden" as const,
	},
	cardCost: {
		position: "absolute" as const,
		top: "3px",
		right: "3px",
		fontSize: "7px",
		fontWeight: "bold" as const,
		color: "#ffd700",
		minWidth: "16px",
		textAlign: "center" as const,
	},
	cardName: {
		fontWeight: "bold" as const,
		fontSize: "7px",
		marginBottom: "1px",
		color: "#fff",
		lineHeight: "1.1",
		flex: "0 0 auto",
	},
	cardType: {
		fontSize: "6px",
		color: "#bbb",
		marginBottom: "2px",
		lineHeight: "1" as const,
		flex: "0 0 auto",
		borderTop: "1px solid #555",
		borderBottom: "1px solid #555",
		paddingTop: "1px",
		paddingBottom: "1px",
	},
	cardText: {
		fontSize: "6px",
		color: "#ddd",
		flex: "1 1 auto",
		overflowY: "auto" as const,
		marginBottom: "2px",
		lineHeight: "1.2",
	},
	cardPT: {
		position: "absolute" as const,
		bottom: "3px",
		right: "3px",
		fontSize: "6px",
		fontWeight: "bold" as const,
		color: "#fff",
		backgroundColor: "#000",
		padding: "1px 2px",
		borderRadius: "2px",
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
		gap: "5px",
		flex: 1,
		minHeight: 0,
	},
	zone: {
		backgroundColor: "#1a1a1a",
		padding: "6px",
		borderRadius: "3px",
		fontSize: "10px",
		border: "1px solid #333",
		display: "flex" as const,
		flexDirection: "column" as const,
		overflow: "hidden" as const,
	},
	zoneLabel: {
		fontSize: "10px",
		fontWeight: "bold" as const,
		color: "#aaa",
		marginBottom: "3px",
	},
	zoneContent: {
		maxHeight: "80px",
		overflowY: "auto" as const,
		fontSize: "9px",
	},
	breakdown: {
		fontSize: "8px",
		color: "#888",
		marginBottom: "3px",
		backgroundColor: "#0d0d0d",
		padding: "3px",
		borderRadius: "2px",
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
	footer: {
		display: "flex" as const,
		justifyContent: "space-between" as const,
		alignItems: "center" as const,
		marginTop: "8px",
		flex: "0 0 auto",
		height: "40px",
	},
	footerButton: {
		padding: "8px 16px",
		backgroundColor: "#444",
		color: "#fff",
		border: "none",
		borderRadius: "4px",
		cursor: "pointer",
		fontSize: "12px",
	},
	undoRedoButtons: {
		display: "flex" as const,
		gap: "8px",
	},
	endTurnButton: {
		padding: "8px 20px",
		backgroundColor: "#ff6600",
		color: "#fff",
		border: "none",
		borderRadius: "4px",
		cursor: "pointer",
		fontSize: "12px",
		fontWeight: "bold" as const,
	},
	contextMenu: {
		position: "fixed" as const,
		backgroundColor: "#2a2a2a",
		border: "1px solid #555",
		borderRadius: "4px",
		zIndex: 2000,
		minWidth: "150px",
	},
	contextMenuItem: {
		padding: "8px 12px",
		cursor: "pointer",
		borderBottom: "1px solid #444",
		fontSize: "12px",
		transition: "background-color 0.2s",
	},
	turnInfo: {
		marginTop: "8px",
		textAlign: "center" as const,
		color: "#999",
		fontSize: "12px",
		flex: "0 0 auto",
	},
	loading: {
		padding: "20px",
		textAlign: "center" as const,
		color: "#aaa",
	},
};
