import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { Card, GameStateObjects, useGameStore } from '../store';
import ContextMenu from './ContextMenus';
import { ZoneDisplay, zoneStyles } from './ZoneDisplay';
import { ScryModal } from './ScryModal';
import { ExileModal } from './ExileModal';
import { GraveyardModal } from './GraveyardModal';
import { LibrarySearchModal } from './LibrarySearchModal';
import { BattlefieldIndicators } from './BattlefieldIndicators';
import { GameAuditLog } from './GameAuditLog';
import { CardDisplay } from './CardDisplay';
import { ActionMethod, Zone, ZoneNames } from '../types';

export const GameBoard: React.FC = () => {
	const { gameId } = useParams<{ gameId: string }>();
	const { viewerSeat, setViewerSeat, gameState, setGameState } = useGameStore();
	const [draggedCard, setDraggedCard] = useState<string | null>(null);
	const [dragStart, setDragStart] = useState<{
		cardId: string;
		initialPos: { x: number; y: number };
		mousePos: { x: number; y: number };
	} | null>(null);
	const [cardScale, setCardScale] = useState(() => {
		const saved = localStorage.getItem('cardScale');
		return saved ? parseFloat(saved) : 1;
	});
	const [browserZoom, setBrowserZoom] = useState(() => {
		const saved = localStorage.getItem('browserZoom');
		return saved ? parseInt(saved, 10) : 100;
	});
	const [invertOpponent, setInvertOpponent] = useState(() => {
		const saved = localStorage.getItem('invertOpponent');
		return saved !== null ? JSON.parse(saved) : true;
	});
	const [showSettings, setShowSettings] = useState(false);
	const [showZoneBreakdown, setShowZoneBreakdown] = useState<string | null>(null);
	const [contextMenu, setContextMenu] = useState<{
		x: number;
		y: number;
		type: 'library' | 'hand' | 'graveyard' | 'exile' | 'battlefield';
		objectId?: string;
	} | null>(null);
	const [hoveredOpponentCard, setHoveredOpponentCard] = useState<string | null>(null);
	const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
	const [scryModal, setScryModal] = useState<{
		type: 'scry' | 'surveil';
		count: number;
		cards: any[];
	} | null>(null);
	const [exileModal, setExileModal] = useState<any[] | null>(null);
	const [graveyardModal, setGraveyardModal] = useState<any[] | null>(null);
	const [librarySearchModal, setLibrarySearchModal] = useState<GameStateObjects[] | null>(null);
	const [showAuditLog, setShowAuditLog] = useState(false);
	const [lastMovedCardId, setLastMovedCardId] = useState<string | null>(null);
	const [seat1Life, setSeat1Life] = useState<number>(0);
	const [seat2Life, setSeat2Life] = useState<number>(0);
	const [playerObjects, setPlayerObjects] = useState<GameStateObjects[]>([]);
	const [opponentObjects, setOpponentObjects] = useState<GameStateObjects[]>([]);
	const battlefieldRef = useRef<HTMLDivElement>(null);
	const flippedSeatsRef = useRef<Set<number>>(new Set());

	const loadGameState = useCallback(async () => {
		if (!gameId) return;
		try {
			const response = await api.getGame(gameId, viewerSeat);
			setGameState(response.data);
		} catch (err) {
			console.error('Failed to load game state:', err);
		}
	}, [gameId, viewerSeat, setGameState]);

	const loadAvailableTokens = useCallback(async () => {
		if (!gameId) return;
		try {
			const response = await api.getGameTokens(gameId);
			useGameStore.getState().setAvailableTokens(response.data);
		} catch (err) {
			console.error('Failed to load available tokens:', err);
		}
	}, [gameId]);

	const loadAvailableComponents = useCallback(async () => {
		if (!gameId) return;
		try {
			const response = await api.getGameComponents(gameId);
			useGameStore.getState().setAvailableComponents(response.data);
		} catch (err) {
			console.error('Failed to load available components:', err);
		}
	}, [gameId]);

	const handleGameAction: ActionMethod = useCallback(
		async (action: string, seat?: number, metadata?: any) => {
			if (!gameId || !gameState) return;

			// Handle counter actions specially - update local state
			if (action === 'add_counter' || action === 'remove_counter') {
				const objectId = metadata?.objectId;
				const counterType = metadata?.counterType;
				if (!objectId || !counterType) return;

				const updatedObjects = gameState.objects.map((obj) => {
					if (obj.id === objectId) {
						const currentCount = (obj.counters as any)[counterType] || 0;
						const newCount = action === 'add_counter' ? currentCount + 1 : Math.max(0, currentCount - 1);
						return {
							...obj,
							counters: {
								...obj.counters,
								[counterType]: newCount,
							},
						};
					}
					return obj;
				});

				setGameState({ ...gameState, objects: updatedObjects });

				// Also send to server
				try {
					await api.executeAction(gameId, {
						seat: seat || viewerSeat,
						action_type: action,
						metadata,
					});
				} catch (err) {
					console.error('Counter action failed:', err);
				}
				return;
			}

			// Handle create_indicator - add to local state
			if (action === 'create_indicator') {
				const position = metadata?.position || { x: 0, y: 0 };
				const color = metadata?.color || 'red';
				const newIndicator = {
					id: `indicator-${Date.now()}`,
					seat: viewerSeat,
					position,
					color,
				};

				const indicators = gameState.indicators || [];
				setGameState({ ...gameState, indicators: [...indicators, newIndicator] });

				// Send to server
				try {
					await api.executeAction(gameId, {
						seat: seat || viewerSeat,
						action_type: action,
						metadata: { position, color },
					});
				} catch (err) {
					console.error('Create indicator failed:', err);
				}
				return;
			}

			// Handle move_indicator - update local state
			if (action === 'move_indicator') {
				const indicatorId = metadata?.indicatorId;
				const position = metadata?.position;
				if (!indicatorId || !position) return;

				const indicators = (gameState.indicators || []).map((ind) => {
					if (ind.id === indicatorId) {
						return { ...ind, position };
					}
					return ind;
				});

				setGameState({ ...gameState, indicators });

				// Send to server
				try {
					await api.executeAction(gameId, {
						seat: seat || viewerSeat,
						action_type: action,
						metadata: { indicatorId, position },
					});
				} catch (err) {
					console.error('Move indicator failed:', err);
				}
				return;
			}

			// Handle Search Library specially - show modal first
			if (action === 'search_library') {
				const library = gameState.objects.filter((o) => o.zone === 'library' && o.seat === viewerSeat).sort((a, b) => a.order - b.order);
				setLibrarySearchModal(library);
				return;
			}

			// Handle Scry and Surveil specially - show modal first
			if (action === 'scry' || action === 'surveil') {
				const count = (metadata && metadata.count) || 1;
				const library = gameState.objects.filter((o) => o.zone === 'library' && o.seat === viewerSeat);
				// Get top X cards from library
				const topCards = library.slice(0, count);
				setScryModal({
					type: action as 'scry' | 'surveil',
					count,
					cards: topCards,
				});
				return;
			}

			try {
				await api.executeAction(gameId, {
					seat: seat || viewerSeat,
					action_type: action,
					metadata,
				});

				// Track card movements to battlefield
				if ((action === 'move_to_battlefield' || action === 'cast') && metadata?.objectId) {
					setLastMovedCardId(metadata.objectId);
				}

				await loadGameState();
			} catch (err) {
				console.error('Action failed:', err);
			}
		},
		[gameId, viewerSeat, loadGameState, gameState, setGameState]
	);

	const handleScryConfirm = useCallback(
		async (arrangement: { top: string[]; bottom: string[]; graveyard?: string[] }) => {
			if (!gameId || !scryModal) return;
			try {
				await api.executeAction(gameId, {
					seat: viewerSeat,
					action_type: scryModal.type,
					metadata: {
						count: scryModal.count,
						arrangement,
					},
				});
				setScryModal(null);
				await loadGameState();
			} catch (err) {
				console.error('Scry/Surveil failed:', err);
			}
		},
		[gameId, scryModal, viewerSeat, loadGameState]
	);

	const handleRestartGame = useCallback(async () => {
		if (!gameId) return;
		try {
			await api.restartGame(gameId);
			setShowAuditLog(false);
			await loadGameState();
		} catch (err) {
			console.error('Game restart failed:', err);
		}
	}, [gameId, loadGameState]);

	useEffect(() => {
		if (gameId) {
			loadGameState();
			loadAvailableTokens();
			loadAvailableComponents();
			flippedSeatsRef.current.clear(); // Reset flipped seats when loading new game
			const interval = setInterval(loadGameState, 5000);
			return () => clearInterval(interval);
		}
	}, [gameId, viewerSeat, loadGameState, loadAvailableTokens, loadAvailableComponents]);

	useEffect(() => {
		localStorage.setItem('cardScale', cardScale.toString());
	}, [cardScale]);

	useEffect(() => {
		localStorage.setItem('browserZoom', browserZoom.toString());
	}, [browserZoom]);

	useEffect(() => {
		localStorage.setItem('invertOpponent', JSON.stringify(invertOpponent));
	}, [invertOpponent]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.code === 'Space') {
				e.preventDefault();
				handleGameAction('end_turn');
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [handleGameAction]);

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
					if (obj.zone === 'battlefield' && obj.position) {
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

	useEffect(() => {
		if (gameState) {
			const seat1Objects = gameState.objects.filter((obj) => obj.seat === 1);
			const seat2Objects = gameState.objects.filter((obj) => obj.seat === 2);

			setSeat1Life(gameState.seat1_life);
			setSeat2Life(gameState.seat2_life);

			const playerObjects = viewerSeat === 1 ? seat1Objects : seat2Objects;
			setPlayerObjects(playerObjects);

			const opponentObjects = viewerSeat === 1 ? seat2Objects : seat1Objects;
			setOpponentObjects(opponentObjects);
		}
	}, [gameState, viewerSeat]);

	if (!gameState) {
		return <div style={styles.loading}>Loading game...</div>;
	}

	function handleCardDropOnBattlefield(e: React.DragEvent<HTMLDivElement>, cardId: string) {
		e.preventDefault();
		if (!gameState) return;

		if (dragStart && dragStart.cardId === cardId) {
			const deltaX = e.clientX - dragStart.mousePos.x;
			const deltaY = e.clientY - dragStart.mousePos.y;

			const newX = dragStart.initialPos.x + deltaX;
			const newY = dragStart.initialPos.y + deltaY;

			const existingCard = gameState.objects.find((o) => o.zone === 'battlefield' && o.id !== cardId && o.position);
			if (
				existingCard &&
				existingCard.position &&
				Math.abs(newX - existingCard.position.x) < 3 &&
				Math.abs(newY - existingCard.position.y) < 3
			) {
				handleGameAction('move_to_battlefield', undefined, {
					objectId: cardId,
					position: existingCard.position,
				});
			} else {
				handleGameAction('move_to_battlefield', undefined, {
					objectId: cardId,
					position: { x: newX, y: newY },
				});
			}
			setDragStart(null);
			setDraggedCard(null);
		} else {
			const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
			const x = e.clientX - rect.left - 75;
			const y = e.clientY - rect.top - 100;

			handleGameAction('cast', undefined, {
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
					<button onClick={() => setViewerSeat(viewerSeat === 1 ? 2 : 1)} style={styles.switchButton}>
						Seat {viewerSeat === 1 ? 2 : 1}
					</button>
					<button onClick={() => setShowSettings(!showSettings)} style={styles.settingsButton}>
						⋮
					</button>
				</div>
			</div>

			{showSettings && (
				<div style={styles.settingsMenu}>
					<div>Browser Zoom</div>
					<div style={styles.zoomControls}>
						<button onClick={() => setBrowserZoom(Math.max(50, browserZoom - 10))}>−</button>
						<span>{browserZoom}%</span>
						<button onClick={() => setBrowserZoom(Math.min(200, browserZoom + 10))}>+</button>
					</div>

					<div style={{ marginTop: '10px' }}>Card Size</div>
					<div style={styles.cardScaleControls}>
						{[1, 1.5, 2, 3, 4].map((scale) => (
							<button
								key={scale}
								onClick={() => setCardScale(scale)}
								style={{
									...styles.scaleButton,
									backgroundColor: cardScale === scale ? '#0066ff' : '#444',
								}}
							>
								{scale}×
							</button>
						))}
					</div>

					<div style={{ marginTop: '10px' }}>
						<label>
							<input type="checkbox" checked={invertOpponent} onChange={() => setInvertOpponent(!invertOpponent)} />
							Invert Opponent Cards
						</label>
					</div>

					<button onClick={() => setShowSettings(false)} style={styles.closeSettingsButton}>
						Close
					</button>
				</div>
			)}

			<div style={styles.board}>
				{/* Opponent Section (5%) */}
				<div style={styles.opponentSection}>
					<div style={styles.sectionHeader}>
						<div style={styles.seatLabel}>{viewerSeat === 1 ? 'Seat 2 (Opponent)' : 'Seat 1 (Opponent)'}</div>
						<div style={styles.lifeCounter}>
							<span style={styles.lifeValue}>{viewerSeat === 1 ? seat2Life : seat1Life}</span>
							<div style={styles.lifeBars}>
								<button
									style={styles.lifeButton}
									onClick={() =>
										handleGameAction('life_change', viewerSeat === 1 ? 2 : 1, {
											amount: -1,
										})
									}
								>
									−
								</button>
								<button
									style={styles.lifeButton}
									onClick={() =>
										handleGameAction('life_change', viewerSeat === 1 ? 2 : 1, {
											amount: 1,
										})
									}
								>
									+
								</button>
							</div>
						</div>
					</div>
					<div style={styles.zoneGrid}>
						{['hand', 'library', 'graveyard', 'command_zone', 'exile'].map((zone) => {
							const zoneLabel = zone === 'command_zone' ? 'Commander' : zone.charAt(0).toUpperCase() + zone.slice(1);
							return (
								<ZoneDisplay
									key={zone}
									zone={zone}
									label={zoneLabel}
									seat={viewerSeat === 1 ? 2 : 1}
									objects={opponentObjects.filter((o) => o.zone === zone)}
									redacted={zone === 'hand' || zone === 'library'}
									onCountClick={() => setShowZoneBreakdown(`opponent-${zone}`)}
									showBreakdown={false}
									onExileModalOpen={(cards) => setExileModal(cards)}
									onGraveyardModalOpen={(cards) => setGraveyardModal(cards)}
									onGameAction={handleGameAction}
								/>
							);
						})}
					</div>
				</div>

				{/* Battlefield (70%) */}
				<div ref={battlefieldRef} style={styles.battlefieldSection}>
					<div style={zoneStyles.zoneLabel}>Battlefield</div>

					{/* Opponent's cards mini preview */}
					{opponentObjects.filter((o) => o.zone === 'battlefield').length > 0 && (
						<div style={styles.opponentPreview}>
							<div style={styles.opponentPreviewLabel}>Opponent's Field</div>
							<div style={styles.opponentPreviewGrid}>
								{opponentObjects
									.filter((o) => o.zone === 'battlefield')
									.map((obj) => (
										<div
											key={obj.id}
											style={styles.opponentPreviewCard}
											onMouseEnter={(e) => {
												const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
												setHoveredOpponentCard(obj.id);
												setHoverPos({
													x: rect.left + rect.width / 2,
													y: rect.top - 10,
												});
											}}
											onMouseLeave={() => setHoveredOpponentCard(null)}
										>
											<CardDisplay card={obj.card} isTapped={obj.is_tapped} counters={obj.counters} scale={0.5} />
										</div>
									))}
							</div>
						</div>
					)}

					<div
						style={styles.battlefieldGrid}
						onDragOver={(e) => e.preventDefault()}
						onDrop={(e) => {
							const cardId = e.dataTransfer.getData('text/plain');
							if (cardId) handleCardDropOnBattlefield(e, cardId);
						}}
						onContextMenu={(e) => {
							// Only show token creation menu if clicking on empty space
							if (e.target === e.currentTarget) {
								e.preventDefault();
								setContextMenu({
									x: e.clientX,
									y: e.clientY,
									type: 'battlefield',
									// No objectId means we're clicking on empty space
								});
							}
						}}
					>
						{gameState.objects
							.filter((o) => o.zone === 'battlefield' && o.seat === viewerSeat)
							.map((obj) => (
								<div
									key={obj.id}
									draggable
									onDragStart={(e) => {
										e.dataTransfer.effectAllowed = 'move';
										e.dataTransfer.setData('text/plain', obj.id);
										setDraggedCard(obj.id);
										const posX = obj.position && obj.position.x ? obj.position.x : 0;
										const posY = obj.position && obj.position.y ? obj.position.y : 0;
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
											type: 'battlefield',
											objectId: obj.id,
										});
									}}
									onDoubleClick={() =>
										handleGameAction('tap', undefined, {
											objectId: obj.id,
										})
									}
									style={{
										...styles.positionedCard,
										left: `${obj.position ? obj.position.x : 0}px`,
										top: `${obj.position ? obj.position.y : 0}px`,
										opacity: draggedCard === obj.id ? 0.5 : 1,
										transform: invertOpponent && obj.seat !== viewerSeat ? 'rotate(180deg)' : undefined,
										zIndex:
											obj.id === lastMovedCardId
												? gameState.objects.filter((o) => o.zone === 'battlefield' && o.seat === viewerSeat).length
												: 1,
									}}
								>
									<CardDisplay card={obj.card} isTapped={obj.is_tapped} counters={obj.counters} scale={cardScale} />
								</div>
							))}
					</div>

					{/* Battlefield Indicators overlay */}
					<BattlefieldIndicators indicators={gameState?.indicators} seat={viewerSeat} executeAction={handleGameAction} />

					{/* Opponent card hover preview popup */}
					{hoveredOpponentCard &&
						(() => {
							const hoveredCard = opponentObjects.find((o) => o.id === hoveredOpponentCard);
							return (
								hoveredCard && (
									<div
										style={{
											...styles.cardPreviewPopup,
											left: `${hoverPos.x}px`,
											top: `${hoverPos.y}px`,
										}}
									>
										<CardDisplay card={hoveredCard.card} isTapped={hoveredCard.is_tapped} counters={hoveredCard.counters} scale={2} />
									</div>
								)
							);
						})()}
				</div>

				{/* Player Section (20%) */}
				<div style={styles.playerSection}>
					<div style={styles.sectionHeader}>
						<div style={styles.seatLabel}>Seat {viewerSeat} (You)</div>
						<div style={styles.lifeCounter}>
							<span style={styles.lifeValue}>{viewerSeat === 1 ? seat1Life : seat2Life}</span>
							<div style={styles.lifeBars}>
								<button
									style={styles.lifeButton}
									onClick={() =>
										handleGameAction('life_change', viewerSeat === 1 ? 1 : 2, {
											amount: -1,
										})
									}
								>
									−
								</button>
								<button
									style={styles.lifeButton}
									onClick={() =>
										handleGameAction('life_change', viewerSeat === 1 ? 1 : 2, {
											amount: 1,
										})
									}
								>
									+
								</button>
							</div>
						</div>
					</div>
					<div style={styles.zoneGrid}>
						{[Zone.hand, Zone.library, Zone.graveyard, Zone.command_zone, Zone.exile].map((zone) => {
							const zoneLabel = ZoneNames[zone];

							return (
								<ZoneDisplay
									key={zone}
									zone={zone}
									label={zoneLabel}
									seat={viewerSeat}
									objects={playerObjects.filter((o) => o.zone === zone)}
									redacted={false}
									onCardDragStart={(cardId) => setDraggedCard(cardId)}
									onCountClick={() => setShowZoneBreakdown(`player-${zone}`)}
									showBreakdown={showZoneBreakdown === `player-${zone}`}
									onContextMenu={(e, objectId) =>
										setContextMenu({
											x: e.clientX,
											y: e.clientY,
											type: zone,
											objectId,
										})
									}
									onExileModalOpen={(cards) => setExileModal(cards)}
									onGraveyardModalOpen={(cards) => setGraveyardModal(cards)}
									onGameAction={handleGameAction}
								/>
							);
						})}
					</div>
				</div>
			</div>

			{/* Footer */}
			<div style={styles.footer}>
				<button style={styles.footerButton} onClick={() => (window.location.href = '/')}>
					← Home
				</button>
				<div style={styles.undoRedoButtons}>
					<button style={styles.footerButton}>↶ Undo</button>
					<button style={styles.footerButton}>↷ Redo</button>
					<button style={styles.footerButton} onClick={() => setShowAuditLog(true)}>
						📋 Log
					</button>
					<button
						style={styles.footerButton}
						onClick={() => {
							if (window.confirm('Are you sure you want to restart the game?')) {
								handleRestartGame();
							}
						}}
					>
						🔄 Restart
					</button>
				</div>
				<button style={styles.endTurnButton} onClick={() => handleGameAction('end_turn')}>
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
					executeAction={handleGameAction}
				/>
			)}

			{scryModal && (
				<ScryModal cards={scryModal.cards} type={scryModal.type} onConfirm={handleScryConfirm} onCancel={() => setScryModal(null)} />
			)}

			{exileModal && (
				<ExileModal
					cards={exileModal}
					onMoveCard={(cardId, zone) => {
						handleGameAction(`move_to_${zone}`, undefined, {
							objectId: cardId,
						});
					}}
					onClose={() => setExileModal(null)}
				/>
			)}

			{graveyardModal && (
				<GraveyardModal
					cards={graveyardModal}
					onMoveCard={(cardId, zone) => {
						handleGameAction(`move_to_${zone}`, undefined, {
							objectId: cardId,
						});
					}}
					onClose={() => setGraveyardModal(null)}
				/>
			)}

			{librarySearchModal && (
				<LibrarySearchModal
					gameStateObjects={librarySearchModal}
					onClose={() => setLibrarySearchModal(null)}
					onCloseAndShuffle={() => {
						handleGameAction('shuffle_library');
						setLibrarySearchModal(null);
					}}
					onMoveCard={(cardId, zone) => {
						handleGameAction(`move_to_${zone}`, undefined, {
							objectId: cardId,
						});
						// Keep modal open after moving
					}}
				/>
			)}

			{gameId && <GameAuditLog gameId={gameId} isOpen={showAuditLog} onClose={() => setShowAuditLog(false)} />}

			<div style={styles.turnInfo}>
				Turn {gameState.turn_number} • Active: Seat {gameState.active_seat}
			</div>
		</div>
	);
};

const styles = {
	container: {
		padding: '10px',
		height: '100vh',
		display: 'flex' as const,
		flexDirection: 'column' as const,
		backgroundColor: '#0a0a0a',
		color: '#fff',
		boxSizing: 'border-box' as const,
		overflow: 'hidden' as const,
	},
	header: {
		display: 'flex' as const,
		justifyContent: 'space-between' as const,
		alignItems: 'center' as const,
		marginBottom: '8px',
		flex: '0 0 auto',
	},
	title: {
		margin: 0,
		fontSize: '18px',
		fontWeight: 'bold' as const,
	},
	headerControls: {
		display: 'flex' as const,
		gap: '10px',
	},
	switchButton: {
		padding: '6px 12px',
		backgroundColor: '#0066ff',
		color: '#fff',
		border: 'none',
		borderRadius: '3px',
		cursor: 'pointer',
		fontWeight: 'bold' as const,
		fontSize: '12px',
	},
	settingsButton: {
		padding: '6px 12px',
		backgroundColor: '#444',
		color: '#fff',
		border: 'none',
		borderRadius: '3px',
		cursor: 'pointer',
		fontSize: '16px',
	},
	settingsMenu: {
		position: 'fixed' as const,
		top: '50px',
		right: '10px',
		backgroundColor: '#2a2a2a',
		border: '1px solid #444',
		borderRadius: '6px',
		padding: '15px',
		zIndex: 1000,
		minWidth: '200px',
	},
	zoomControls: {
		display: 'flex' as const,
		gap: '5px',
		alignItems: 'center' as const,
		marginTop: '5px',
	},
	cardScaleControls: {
		display: 'flex' as const,
		gap: '5px',
		marginTop: '5px',
	},
	scaleButton: {
		flex: 1,
		padding: '5px',
		border: '1px solid #555',
		borderRadius: '3px',
		backgroundColor: '#444',
		color: '#fff',
		cursor: 'pointer',
	},
	closeSettingsButton: {
		width: '100%',
		marginTop: '15px',
		padding: '8px',
		backgroundColor: '#0066ff',
		color: '#fff',
		border: 'none',
		borderRadius: '3px',
		cursor: 'pointer',
	},
	board: {
		display: 'flex' as const,
		flexDirection: 'column' as const,
		flex: 1,
		gap: '8px',
		overflow: 'hidden' as const,
	},
	opponentSection: {
		flex: '0 0 5%',
		backgroundColor: '#2a2a2a',
		padding: '8px',
		borderRadius: '6px',
		display: 'flex' as const,
		flexDirection: 'column' as const,
		overflow: 'hidden' as const,
		minHeight: '40px',
	},
	battlefieldSection: {
		flex: '1 1 70%',
		backgroundColor: '#1a1a1a',
		padding: '8px',
		borderRadius: '6px',
		position: 'relative' as const,
		overflow: 'hidden' as const,
		display: 'flex' as const,
		flexDirection: 'column' as const,
		minHeight: '200px',
	},
	playerSection: {
		flex: '0 0 20%',
		backgroundColor: '#2a2a2a',
		padding: '8px',
		borderRadius: '6px',
		display: 'flex' as const,
		flexDirection: 'column' as const,
		overflow: 'visible' as const,
		minHeight: '80px',
	},
	sectionHeader: {
		display: 'flex' as const,
		flexDirection: 'row' as const,
		alignItems: 'center' as const,
		gap: '12px',
		marginBottom: '4px',
	},
	seatLabel: {
		fontSize: '11px',
		fontWeight: 'bold' as const,
		color: '#aaa',
	},
	lifeCounter: {
		display: 'flex' as const,
		alignItems: 'center' as const,
		gap: '4px',
	},
	lifeValue: {
		fontSize: '14px',
		fontWeight: 'bold' as const,
		minWidth: '24px',
	},
	lifeBars: {
		display: 'flex' as const,
		gap: '2px',
	},
	lifeButton: {
		padding: '2px 4px',
		backgroundColor: '#444',
		color: '#fff',
		border: 'none',
		borderRadius: '3px',
		cursor: 'pointer',
		fontSize: '10px',
	},
	battlefieldGrid: {
		position: 'relative' as const,
		width: '100%',
		height: '100%',
		padding: '8px',
		border: '1px dashed #444',
		borderRadius: '6px',
		backgroundColor: '#0d0d0d',
		overflow: 'hidden' as const,
	},
	opponentPreview: {
		position: 'absolute' as const,
		top: '8px',
		left: '8px',
		right: '8px',
		height: '100px',
		backgroundColor: 'rgba(0, 0, 0, 0.8)',
		border: '1px solid #555',
		borderRadius: '4px',
		padding: '6px',
		zIndex: 10,
		display: 'flex' as const,
		flexDirection: 'column' as const,
	},
	opponentPreviewLabel: {
		fontSize: '10px',
		fontWeight: 'bold' as const,
		color: '#888',
		marginBottom: '4px',
		textTransform: 'uppercase' as const,
		letterSpacing: '1px',
	},
	opponentPreviewGrid: {
		display: 'flex' as const,
		gap: '4px',
		flexWrap: 'wrap' as const,
		overflow: 'auto' as const,
		flex: 1,
	},
	opponentPreviewCard: {
		width: '50px',
		height: '68px',
		marginRight: '6px',
		flexShrink: 0,
	},
	positionedCard: {
		position: 'absolute' as const,
		cursor: 'move',
		userSelect: 'none' as const,
		transition: 'box-shadow 0.2s',
	},
	zoneGrid: {
		display: 'grid',
		gridTemplateColumns: '4fr 0.5fr 0.5fr 0.5fr 0.5fr',
		gap: '5px',
		flex: 1,
		minHeight: 0,
	},
	footer: {
		display: 'flex' as const,
		justifyContent: 'space-between' as const,
		alignItems: 'center' as const,
		marginTop: '8px',
		flex: '0 0 auto',
		height: '40px',
	},
	footerButton: {
		padding: '8px 16px',
		backgroundColor: '#444',
		color: '#fff',
		border: 'none',
		borderRadius: '4px',
		cursor: 'pointer',
		fontSize: '12px',
	},
	undoRedoButtons: {
		display: 'flex' as const,
		gap: '8px',
	},
	endTurnButton: {
		padding: '8px 20px',
		backgroundColor: '#ff6600',
		color: '#fff',
		border: 'none',
		borderRadius: '4px',
		cursor: 'pointer',
		fontSize: '12px',
		fontWeight: 'bold' as const,
	},
	turnInfo: {
		marginTop: '8px',
		textAlign: 'center' as const,
		color: '#999',
		fontSize: '12px',
		flex: '0 0 auto',
	},
	loading: {
		padding: '20px',
		textAlign: 'center' as const,
		color: '#aaa',
	},
	cardPreviewPopup: {
		position: 'fixed' as const,
		backgroundColor: 'rgba(0, 0, 0, 0.95)',
		border: '2px solid #555',
		borderRadius: '8px',
		padding: '8px',
		zIndex: 2001,
		boxShadow: '0 8px 16px rgba(0, 0, 0, 0.8)',
		pointerEvents: 'none' as const,
		transform: 'translate(0%, 20%)',
	},
};
