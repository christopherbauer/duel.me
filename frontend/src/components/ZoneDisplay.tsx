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
}) => {
	const count = objects.length;
	const typeBreakdown = getCardsByType(
		objects.filter((o) => o.zone === zone),
	);

	// Library zone shows a card back instead of individual cards
	const isLibrary = zone === "library";

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
				) : redacted ? (
					<div style={zoneStyles.redactedCount}>{count} card(s)</div>
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
};
