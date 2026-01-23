import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../api';
import { Card, GameStateObjects, useGameStore } from '../store';

interface GameAction {
	id: string;
	seat: number;
	action_type: string;
	metadata?: Record<string, any>;
	created_at: string;
}

const actionTypeLabels: Record<string, string> = {
	draw: 'Draw',
	shuffle_library: 'Shuffle Library',
	scry: 'Scry',
	surveil: 'Surveil',
	tap: 'Tap',
	untap: 'Untap',
	toggle_tap: 'Toggle Tap',
	untap_all: 'Untap All',
	life_change: 'Life Change',
	exile_from_top: 'Exile from Top',
	move_to_exile: 'Move to Exile',
	move_to_library: 'Move to Library',
	move_to_hand: 'Move to Hand',
	move_to_battlefield: 'Move to Battlefield',
	move_to_graveyard: 'Move to Graveyard',
	discard: 'Discard',
	add_counter: 'Add Counter',
	remove_counter: 'Remove Counter',
	create_token_copy: 'Create Token',
	remove_token: 'Remove Token',
	create_indicator: 'Create Indicator',
	move_indicator: 'Move Indicator',
	delete_indicator: 'Delete Indicator',
	cast: 'Cast',
	search_library: 'Search Library',
	end_turn: 'Ended Turn',
};

const formatActionSummary = (action: GameAction): string => {
	const label = actionTypeLabels[action.action_type] || action.action_type;
	const metadata = action.metadata || {};

	let details = '';
	if (action.action_type === 'draw' && metadata.count) {
		details = ` ${metadata.count}`;
	} else if (action.action_type === 'scry' || action.action_type === 'surveil') {
		details = ` ${metadata.count || 1}`;
	} else if (action.action_type === 'life_change' && metadata.amount) {
		details = ` ${metadata.amount > 0 ? '+' : ''}${metadata.amount}`;
	} else if (action.action_type === 'exile_from_top' && metadata.count) {
		details = ` ${metadata.count}`;
	} else if (action.action_type === 'add_counter' && metadata.counterType) {
		details = ` (${metadata.counterType})`;
	} else if (action.action_type === 'remove_counter' && metadata.counterType) {
		details = ` (${metadata.counterType})`;
	} else if (action.action_type === 'create_token_copy' && metadata.quantity) {
		details = ` x${metadata.quantity}`;
	} else if (action.action_type === 'create_indicator' && metadata.color) {
		details = ` (${metadata.color})`;
	}

	return `${label} ${details}`;
};

interface GameAuditLogProps {
	gameId: string;
	isOpen: boolean;
	onClose: () => void;
}
export const GameAuditLog: React.FC<GameAuditLogProps> = ({ gameId, isOpen, onClose }) => {
	const [actions, setActions] = useState<GameAction[]>([]);
	const [loading, setLoading] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [error, setError] = useState('');
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const [limit] = useState(50);
	const { gameState } = useGameStore();
	const logContainerRef = React.useRef<HTMLDivElement>(null);

	const gameObjects = useMemo(() => {
		return gameState?.objects || [];
	}, [gameState]);
	const loadAuditLog = useCallback(
		async (pageNum: number, reset: boolean = false) => {
			setLoading(true);
			setError('');
			try {
				const response = await api.getGameActions(gameId, pageNum, limit);
				const newActions = response.data.actions;

				if (reset) {
					setActions(newActions);
				} else {
					setActions((prev) => [...prev, ...newActions]);
				}

				setTotal(response.data.total);
				setPage(pageNum);

				// Check if there are more items to load
				const totalLoaded = reset ? newActions.length : actions.length + newActions.length;
				setHasMore(totalLoaded < response.data.total);
			} catch (err: any) {
				setError('Failed to load audit log');
				console.error(err);
			} finally {
				setLoading(false);
			}
		},
		[actions.length, gameId, limit]
	);

	useEffect(() => {
		if (isOpen && page === 1) {
			loadAuditLog(1, true);
		}
	}, [isOpen, gameId, page, loadAuditLog]);
	const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
		const container = e.currentTarget;
		const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;

		if (isAtBottom && hasMore && !loading) {
			loadAuditLog(page + 1);
		}
	};

	const cardRecords: Record<string, GameStateObjects> = useMemo(() => {
		const records: Record<string, GameStateObjects> = {};
		const filteredGameObjects = gameObjects.filter((obj) => obj.card);
		for (const gameObject of filteredGameObjects) {
			records[gameObject.id] = gameObject;
		}
		return records;
	}, [gameObjects]);
	if (!isOpen) {
		return null;
	}

	return (
		<div style={styles.overlay} onClick={onClose}>
			<div style={styles.modal} onClick={(e) => e.stopPropagation()}>
				<div style={styles.header}>
					<h3 style={{ margin: 0 }}>Game Audit Log</h3>
					<button
						onClick={onClose}
						style={{
							background: 'none',
							border: 'none',
							color: '#999',
							fontSize: '20px',
							cursor: 'pointer',
							padding: 0,
						}}
					>
						✕
					</button>
				</div>

				{error && <div style={styles.error}>{error}</div>}

				<div style={styles.logContainer} ref={logContainerRef} onScroll={handleScroll}>
					{actions.length === 0 && !loading ? (
						<div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No actions recorded yet</div>
					) : (
						<div style={styles.actionsList}>
							{actions.map((action) => (
								<div key={action.id} style={styles.actionItem}>
									<div style={styles.actionTime}>{new Date(action.created_at).toLocaleTimeString()}</div>
									<div style={styles.actionContent}>
										<span style={styles.actionSeat}>Seat {action.seat}</span>
										<span style={styles.actionSummary}>
											<span style={{ fontWeight: 'bold' }}>
												{[formatActionSummary(action), action?.metadata?.objectId && cardRecords[action?.metadata?.objectId]?.card?.name]
													.filter(Boolean)
													.join(' ')}
											</span>
										</span>
									</div>
								</div>
							))}
							{loading && <div style={{ textAlign: 'center', padding: '15px', color: '#999' }}>Loading more...</div>}
						</div>
					)}
				</div>

				<div style={styles.footer}>
					<small style={{ color: '#666' }}>Total actions: {total}</small>
				</div>
			</div>
		</div>
	);
};

const styles: Record<string, React.CSSProperties> = {
	overlay: {
		position: 'fixed',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: 'rgba(0, 0, 0, 0.7)',
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 2000,
	},
	modal: {
		backgroundColor: '#2a2a2a',
		border: '1px solid #555',
		borderRadius: '8px',
		width: '90%',
		maxWidth: '600px',
		maxHeight: '80vh',
		display: 'flex',
		flexDirection: 'column',
		boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
	},
	header: {
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: '15px 20px',
		borderBottom: '1px solid #444',
		color: '#ccc',
	},
	error: {
		color: '#ff4444',
		padding: '10px 20px',
		backgroundColor: '#330000',
		borderRadius: '4px',
		margin: '10px 20px 0 20px',
	},
	logContainer: {
		flex: 1,
		overflow: 'auto',
		padding: '10px 0',
	},
	actionsList: {
		display: 'flex',
		flexDirection: 'column',
		gap: '1px',
	},
	actionItem: {
		display: 'flex',
		gap: '15px',
		padding: '10px 20px',
		borderBottom: '1px solid #333',
		backgroundColor: '#262626',
		transition: 'backgroundColor 0.2s',
	},
	actionTime: {
		minWidth: '80px',
		fontSize: '12px',
		color: '#999',
		fontFamily: 'monospace',
	},
	actionContent: {
		display: 'flex',
		gap: '10px',
		flex: 1,
		alignItems: 'center',
	},
	actionSeat: {
		fontSize: '12px',
		color: '#0088ff',
		fontWeight: 'bold',
		minWidth: '50px',
	},
	actionSummary: {
		fontSize: '14px',
		color: '#ddd',
		flex: 1,
	},
	pagination: {
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
		gap: '15px',
		padding: '15px 20px',
		borderTop: '1px solid #444',
		backgroundColor: '#262626',
	},
	pageButton: {
		padding: '6px 12px',
		backgroundColor: '#0066ff',
		color: '#fff',
		border: 'none',
		borderRadius: '4px',
		cursor: 'pointer',
		fontSize: '12px',
	},
	pageInfo: {
		fontSize: '12px',
		color: '#999',
	},
	footer: {
		padding: '10px 20px',
		borderTop: '1px solid #444',
		backgroundColor: '#1a1a1a',
	},
};
