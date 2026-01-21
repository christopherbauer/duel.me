import { useState } from "react";

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
	onContextMenu?: (e: React.MouseEvent, objectId?: string) => void;
	onExileModalOpen?: (cards: any[]) => void;
}

const getCardsByType: (objects: any[]) => {
	creatures: number;
	instants: number;
	sorceries: number;
	lands: number;
	other: number;
} = (objects) => {
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
};
export const ZoneDisplay: React.FC<ZoneDisplayProps> = ({
	zone,
	label,
	objects,
	redacted,
	onCardDragStart,
	onCountClick,
	showBreakdown,
	onContextMenu,
	onExileModalOpen,
}) => {
	const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
	const count = objects.length;
	const typeBreakdown = getCardsByType(
		objects.filter((o) => o.zone === zone),
	);

	// Library zone shows a card back instead of individual cards
	const isLibrary = zone === "library";
	const isGraveyard = zone === "graveyard";
	const isExile = zone === "exile";
	const isHand = zone === "hand";

	return (
		<div style={zoneStyles.zone}>
			<div style={zoneStyles.zoneLabel}>
				{label}{" "}
				<span
					onClick={onCountClick}
					style={{ cursor: "pointer", fontWeight: "bold" }}
					onContextMenu={(e) => {
						e.preventDefault();
						if (onContextMenu) onContextMenu(e);
					}}
				>
					({count})
				</span>
			</div>
			{showBreakdown && typeBreakdown && (
				<div style={zoneStyles.breakdown}>
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
			<div style={zoneStyles.zoneContent}>
				{isLibrary ? (
					// Library displays as a single card back
					count > 0 ? (
						<div
							style={{
								...zoneStyles.libraryCardBack,
								cursor: "pointer",
								backgroundImage: "url(/Magic_card_back.png)",
								backgroundSize: "cover",
								backgroundPosition: "center",
							}}
							onContextMenu={(e) => {
								e.preventDefault();
								if (onContextMenu) onContextMenu(e);
							}}
							onClick={onCountClick}
						>
							<div style={zoneStyles.libraryCardLabel}>
								{count} cards
							</div>
						</div>
					) : (
						<div style={zoneStyles.emptyZone}>Empty</div>
					)
				) : isGraveyard ? (
					// Graveyard displays card fronts with offset stacking
					count > 0 ? (
						<div style={zoneStyles.stackContainer}>
							{objects.map((obj, idx) => {
								const imageUrl =
									obj.card &&
									obj.card.image_uris &&
									obj.card.image_uris.normal
										? obj.card.image_uris.normal
										: null;
								return (
									<div
										key={obj.id}
										style={{
											...zoneStyles.stackedCard,
											zIndex: idx,
											transform: `translate(${idx * 2}px, ${idx * 7}px)`,
										}}
										onContextMenu={(e) => {
											e.preventDefault();
											if (onContextMenu)
												onContextMenu(e, obj.id);
										}}
										title={
											obj.card ? obj.card.name : "Unknown"
										}
									>
										{imageUrl ? (
											<img
												src={imageUrl}
												alt={
													obj.card
														? obj.card.name
														: "Unknown"
												}
												style={{
													width: "100%",
													height: "100%",
													borderRadius: "4px",
												}}
											/>
										) : (
											<div
												style={
													zoneStyles.cardPlaceholder
												}
											>
												{obj.card
													? obj.card.name
													: "Unknown"}
											</div>
										)}
									</div>
								);
							})}
						</div>
					) : (
						<div style={zoneStyles.emptyZone}>Empty</div>
					)
				) : isExile ? (
					// Exile displays card backs with offset stacking, clickable
					count > 0 ? (
						<div
							style={zoneStyles.stackContainer}
							onClick={() => {
								if (onExileModalOpen) onExileModalOpen(objects);
							}}
						>
							{objects.slice(0, 5).map((obj, idx) => (
								<div
									key={obj.id}
									style={{
										...zoneStyles.stackedCardBack,
										zIndex: idx,
										transform: `translate(${Math.min(idx * 5, 25)}px, ${Math.min(idx * 5, 25)}px)`,
										cursor: "pointer",
									}}
									title={obj.card ? obj.card.name : "Unknown"}
								>
									<div
										style={{
											width: "100%",
											height: "100%",
											backgroundImage:
												"url(/Magic_card_back.png)",
											backgroundSize: "cover",
											backgroundPosition: "center",
											borderRadius: "4px",
										}}
									/>
								</div>
							))}
							{count > 3 && (
								<div
									style={{
										...zoneStyles.stackCount,
										zIndex: 999,
									}}
								>
									+{count - 3}
								</div>
							)}
						</div>
					) : (
						<div style={zoneStyles.emptyZone}>Empty</div>
					)
				) : redacted ? (
					<div style={zoneStyles.redactedCount}>{count} card(s)</div>
				) : isHand ? (
					// Hand displays cards horizontally with hover enlargement
					count > 0 ? (
						<div style={zoneStyles.handContainer}>
							{objects.map((obj, idx) => {
								const imageUrl =
									obj.card &&
									obj.card.image_uris &&
									obj.card.image_uris.normal
										? obj.card.image_uris.normal
										: null;

								// Bell curve scale calculation
								let scale = 1;
								if (hoveredCardId === obj.id) {
									scale = 1.4; // Hovered card
								} else if (hoveredCardId) {
									const hoveredIdx = objects.findIndex(
										(o) => o.id === hoveredCardId,
									);
									const distance = Math.abs(idx - hoveredIdx);
									// Bell curve: scale decreases with distance
									scale =
										1 +
										0.4 *
											Math.exp(
												-((distance * distance) / 3),
											);
								}

								return (
									<div
										key={obj.id}
										draggable
										onDragStart={(e) => {
											e.dataTransfer.effectAllowed =
												"move";
											e.dataTransfer.setData(
												"text/plain",
												obj.id,
											);
											if (onCardDragStart)
												onCardDragStart(obj.id);
										}}
										onContextMenu={(e) => {
											e.preventDefault();
											if (onContextMenu)
												onContextMenu(e, obj.id);
										}}
										onMouseEnter={() =>
											setHoveredCardId(obj.id)
										}
										onMouseLeave={() =>
											setHoveredCardId(null)
										}
										style={{
											...zoneStyles.handCard,
											transform: `scale(${scale})`,
											transformOrigin: "bottom center",
											transition:
												"transform 0.15s ease-out",
											zIndex:
												hoveredCardId === obj.id
													? 10
													: idx,
										}}
										title={
											obj.card ? obj.card.name : "Unknown"
										}
									>
										{imageUrl ? (
											<img
												src={imageUrl}
												alt={
													obj.card
														? obj.card.name
														: "Unknown"
												}
												style={{
													width: "100%",
													height: "100%",
													borderRadius: "6px",
													boxShadow:
														"0 2px 8px rgba(0, 0, 0, 0.4)",
													display: "block",
												}}
											/>
										) : (
											<div
												style={
													zoneStyles.cardPlaceholder
												}
											>
												{obj.card
													? obj.card.name
													: "Unknown"}
											</div>
										)}
									</div>
								);
							})}
						</div>
					) : (
						<div style={zoneStyles.emptyZone}>Empty</div>
					)
				) : objects.length === 0 ? (
					<div style={zoneStyles.emptyZone}>Empty</div>
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
							onContextMenu={(e) => {
								e.preventDefault();
								if (onContextMenu) onContextMenu(e, obj.id);
							}}
							style={zoneStyles.cardItem}
						>
							{obj.card ? obj.card.name : "Unknown"}
						</div>
					))
				)}
			</div>
		</div>
	);
};

export const zoneStyles = {
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
		flex: 1,
		display: "flex" as const,
		flexDirection: "column" as const,
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
	libraryCardBack: {
		width: "100%",
		aspectRatio: "60 / 85",
		maxWidth: "80px",
		border: "2px solid #0d1f2d",
		borderRadius: "4px",
		display: "flex" as const,
		flexDirection: "column" as const,
		alignItems: "center" as const,
		justifyContent: "center" as const,
		position: "relative" as const,
		overflow: "hidden" as const,
		cursor: "pointer" as const,
		transition: "transform 0.2s, box-shadow 0.2s",
		boxShadow:
			"inset 0 1px 3px rgba(255,255,255,0.1), 0 4px 6px rgba(0,0,0,0.3)",
	},
	libraryCardLabel: {
		position: "relative" as const,
		fontSize: "8px" as const,
		fontWeight: "bold" as const,
		color: "#fff",
		textAlign: "center" as const,
		textShadow: "0 1px 2px rgba(0,0,0,0.5)",
	},
	stackContainer: {
		position: "relative" as const,
		width: "72px",
		height: "100px",
		minHeight: "100px",
	},
	stackedCard: {
		position: "absolute" as const,
		width: "60px",
		height: "85px",
		top: 0,
		left: 0,
		border: "1px solid #444",
		borderRadius: "4px",
		overflow: "hidden" as const,
	},
	stackedCardBack: {
		position: "absolute" as const,
		width: "50px",
		height: "70px",
		top: 0,
		left: 0,
		border: "2px solid #0d1f2d",
		borderRadius: "4px",
		overflow: "hidden" as const,
	},
	stackCount: {
		position: "absolute" as const,
		bottom: "5px",
		right: "5px",
		backgroundColor: "rgba(0, 0, 0, 0.8)",
		color: "#fff",
		padding: "2px 6px",
		borderRadius: "3px",
		fontSize: "9px" as const,
		fontWeight: "bold" as const,
	},
	cardPlaceholder: {
		width: "100%",
		height: "100%",
		backgroundColor: "#1a1a1a",
		border: "1px solid #444",
		borderRadius: "4px",
		padding: "4px",
		display: "flex" as const,
		alignItems: "center" as const,
		justifyContent: "center" as const,
		fontSize: "7px",
		textAlign: "center" as const,
		color: "#bbb",
	},
	handContainer: {
		flex: 1,
		display: "flex" as const,
		alignItems: "flex-end" as const,
		justifyContent: "center" as const,
		gap: "8px",
		padding: "8px 4px",
		overflow: "hidden" as const,
	},
	handCard: {
		width: "80px",
		height: "112px",
		flexShrink: 0,
		cursor: "move" as const,
		userSelect: "none" as const,
		border: "1px solid #555",
		borderRadius: "6px",
		overflow: "hidden" as const,
		backgroundColor: "#0a0a0a",
	},
};
