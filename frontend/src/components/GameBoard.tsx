import React, { useState, useEffect } from "react";
import { api } from "../api";
import { useGameStore } from "../store";
import { GameState } from "../store";

export const GameBoard: React.FC = () => {
	const {
		currentGameId,
		viewerSeat,
		setViewerSeat,
		gameState,
		setGameState,
	} = useGameStore();
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (currentGameId) {
			loadGameState();
			const interval = setInterval(loadGameState, 1000); // Poll every second
			return () => clearInterval(interval);
		}
	}, [currentGameId, viewerSeat]);

	const loadGameState = async () => {
		if (!currentGameId) return;
		try {
			const response = await api.getGame(currentGameId, viewerSeat);
			setGameState(response.data);
		} catch (err) {
			console.error("Failed to load game state:", err);
		}
	};

	if (!gameState) {
		return <div style={styles.loading}>Loading game...</div>;
	}

	const seat1Objects = gameState.objects.filter((obj) => obj.seat === 1);
	const seat2Objects = gameState.objects.filter((obj) => obj.seat === 2);

	const seat1Life = gameState.seat1_life;
	const seat2Life = gameState.seat2_life;

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
				{/* Opponent (top) */}
				<div style={styles.seatSection}>
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
							objects={
								viewerSeat === 1
									? seat2Objects.filter(
											(o) => o.zone === "hand"
									  ).length
									: seat1Objects.filter(
											(o) => o.zone === "hand"
									  ).length
							}
							redacted={true}
						/>
						<ZoneDisplay
							zone="library"
							label="Library"
							objects={
								viewerSeat === 1
									? seat2Objects.filter(
											(o) => o.zone === "library"
									  ).length
									: seat1Objects.filter(
											(o) => o.zone === "library"
									  ).length
							}
							redacted={true}
						/>
						<ZoneDisplay
							zone="graveyard"
							label="Graveyard"
							objects={
								viewerSeat === 1
									? seat2Objects.filter(
											(o) => o.zone === "graveyard"
									  )
									: seat1Objects.filter(
											(o) => o.zone === "graveyard"
									  )
							}
							redacted={false}
						/>
						<ZoneDisplay
							zone="exile"
							label="Exile"
							objects={
								viewerSeat === 1
									? seat2Objects.filter(
											(o) => o.zone === "exile"
									  )
									: seat1Objects.filter(
											(o) => o.zone === "exile"
									  )
							}
							redacted={false}
						/>
					</div>
				</div>

				{/* Battlefield (middle) */}
				<div style={styles.battlefieldSection}>
					<div style={styles.zoneLabel}>Battlefield</div>
					<div style={styles.battlefieldGrid}>
						{gameState.objects
							.filter((o) => o.zone === "battlefield")
							.map((obj) => (
								<div
									key={obj.id}
									style={styles.battlefieldCard}
								>
									<div style={styles.cardName}>
										{obj.card?.name || "Unknown Card"}
									</div>
									{obj.is_tapped && (
										<div style={styles.tappedOverlay}>
											TAPPED
										</div>
									)}
								</div>
							))}
					</div>
				</div>

				{/* Your side (bottom) */}
				<div style={styles.seatSection}>
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
							objects={
								viewerSeat === 1
									? seat1Objects.filter(
											(o) => o.zone === "hand"
									  )
									: seat2Objects.filter(
											(o) => o.zone === "hand"
									  )
							}
							redacted={false}
						/>
						<ZoneDisplay
							zone="library"
							label="Library"
							objects={
								viewerSeat === 1
									? seat1Objects.filter(
											(o) => o.zone === "library"
									  ).length
									: seat2Objects.filter(
											(o) => o.zone === "library"
									  ).length
							}
							redacted={false}
						/>
						<ZoneDisplay
							zone="graveyard"
							label="Graveyard"
							objects={
								viewerSeat === 1
									? seat1Objects.filter(
											(o) => o.zone === "graveyard"
									  )
									: seat2Objects.filter(
											(o) => o.zone === "graveyard"
									  )
							}
							redacted={false}
						/>
						<ZoneDisplay
							zone="exile"
							label="Exile"
							objects={
								viewerSeat === 1
									? seat1Objects.filter(
											(o) => o.zone === "exile"
									  )
									: seat2Objects.filter(
											(o) => o.zone === "exile"
									  )
							}
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

	async function executeAction(action: string, amount?: number) {
		if (!currentGameId) return;
		try {
			await api.executeAction(currentGameId, {
				seat: viewerSeat,
				action_type: action,
				metadata: { amount },
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
	objects: any[] | number;
	redacted: boolean;
}

const ZoneDisplay: React.FC<ZoneDisplayProps> = ({
	zone,
	label,
	objects,
	redacted,
}) => {
	const count = typeof objects === "number" ? objects : objects.length;

	return (
		<div style={styles.zone}>
			<div style={styles.zoneLabel}>{label}</div>
			<div style={styles.zoneContent}>
				{redacted ? (
					<div style={styles.redactedCount}>{count} card(s)</div>
				) : typeof objects === "number" ? (
					<div>{count} card(s)</div>
				) : (
					objects.map((obj) => (
						<div key={obj.id} style={styles.card}>
							{obj.card?.name}
						</div>
					))
				)}
			</div>
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
	seatSection: {
		flex: 1,
		backgroundColor: "#2a2a2a",
		padding: "15px",
		borderRadius: "8px",
		display: "flex",
		flexDirection: "column" as const,
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
		flex: 2,
		backgroundColor: "#1a1a1a",
		padding: "15px",
		borderRadius: "8px",
	},
	battlefieldGrid: {
		display: "grid",
		gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
		gap: "10px",
		marginTop: "10px",
	},
	battlefieldCard: {
		backgroundColor: "#333",
		padding: "10px",
		borderRadius: "4px",
		position: "relative" as const,
	},
	cardName: {
		fontSize: "12px",
		overflow: "hidden",
		textOverflow: "ellipsis",
	},
	tappedOverlay: {
		position: "absolute" as const,
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		fontSize: "10px",
		color: "#f00",
		fontWeight: "bold" as const,
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
	},
	zoneLabel: {
		fontSize: "12px",
		fontWeight: "bold" as const,
		color: "#aaa",
		marginBottom: "5px",
	},
	zoneContent: {
		maxHeight: "100px",
		overflow: "auto",
		fontSize: "11px",
	},
	redactedCount: {
		color: "#888",
		fontStyle: "italic" as const,
	},
	card: {
		padding: "3px 0",
		borderBottom: "1px solid #333",
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
