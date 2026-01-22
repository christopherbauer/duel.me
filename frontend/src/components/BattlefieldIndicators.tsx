import React, { useState } from 'react';
import { Indicator, Position } from '../store';
import { ActionMethod } from '../types';

interface BattlefieldIndicatorsProps {
	indicators: Indicator[] | undefined;
	seat: number;
	executeAction: ActionMethod;
}

interface DragState {
	indicatorId: string;
	initialPos: Position;
	currentPos: Position;
	mousePos: { x: number; y: number };
}

interface ContextMenuState {
	indicatorId: string;
	x: number;
	y: number;
}

export const BattlefieldIndicators: React.FC<BattlefieldIndicatorsProps> = ({ indicators, seat, executeAction }) => {
	const [dragState, setDragState] = useState<DragState | null>(null);
	const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

	const handleMouseDown = (e: React.MouseEvent, indicatorId: string, currentPos: Position) => {
		e.preventDefault();
		setDragState({
			indicatorId,
			initialPos: currentPos,
			currentPos,
			mousePos: {
				x: e.clientX,
				y: e.clientY,
			},
		});
	};

	const handleMouseMove = (e: React.MouseEvent) => {
		if (!dragState) return;

		const deltaX = e.clientX - dragState.mousePos.x;
		const deltaY = e.clientY - dragState.mousePos.y;

		const newX = Math.max(0, dragState.initialPos.x + deltaX);
		const newY = Math.max(0, dragState.initialPos.y + deltaY);

		setDragState((prev) => {
			if (!prev) return null;
			return {
				...prev,
				currentPos: { x: newX, y: newY },
			};
		});
	};

	const handleMouseUp = () => {
		if (!dragState) return;

		// Only send to backend if position actually changed
		if (dragState.currentPos.x !== dragState.initialPos.x || dragState.currentPos.y !== dragState.initialPos.y) {
			executeAction('move_indicator', undefined, {
				indicatorId: dragState.indicatorId,
				position: dragState.currentPos,
			});
		}

		setDragState(null);
	};

	const handleContextMenu = (e: React.MouseEvent, indicatorId: string) => {
		e.preventDefault();
		e.stopPropagation();
		setContextMenu({
			indicatorId,
			x: e.clientX,
			y: e.clientY,
		});
	};

	const handleRemoveIndicator = (indicatorId: string) => {
		executeAction('delete_indicator', undefined, {
			indicatorId,
		});
		setContextMenu(null);
	};

	const handleCloseContextMenu = () => {
		setContextMenu(null);
	};

	if (!indicators || indicators.length === 0) {
		return null;
	}

	return (
		<div
			style={{
				position: 'absolute',
				top: 0,
				left: 0,
				width: '100%',
				height: '100%',
				zIndex: 1000,
				pointerEvents: 'none',
			}}
			onMouseMove={handleMouseMove}
			onMouseUp={handleMouseUp}
			onMouseLeave={handleMouseUp}
			onClick={handleCloseContextMenu}
		>
			{indicators
				.filter((indicator) => indicator.seat === seat)
				.map((indicator) => {
					// Use dragged position if currently being dragged, otherwise use server position
					const displayPos = dragState?.indicatorId === indicator.id ? dragState.currentPos : indicator.position;
					const isDragging = dragState?.indicatorId === indicator.id;

					return (
						<div
							style={{
								...styles.dragger,
								left: `${displayPos.x}px`,
								top: `${displayPos.y}px`,
								cursor: isDragging ? 'grabbing' : 'grab',
								transition: isDragging ? 'none' : 'all 0.1s ease-out',
							}}
							key={indicator.id}
							onMouseDown={(e) => handleMouseDown(e, indicator.id, indicator.position)}
							onContextMenu={(e) => handleContextMenu(e, indicator.id)}
						>
							<div
								style={{
									...styles.indicator,
									backgroundColor: indicator.color,
									border: '2px solid rgba(255, 255, 255, 0.5)',
								}}
							/>
						</div>
					);
				})}
			{contextMenu && (
				<div
					style={{
						position: 'fixed',
						left: `${contextMenu.x}px`,
						top: `${contextMenu.y}px`,
						backgroundColor: '#2a2a2a',
						border: '1px solid #555',
						borderRadius: '4px',
						boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
						zIndex: 10001,
						pointerEvents: 'auto',
						minWidth: '120px',
					}}
					onClick={(e) => e.stopPropagation()}
				>
					<div
						style={{
							padding: '8px 12px',
							cursor: 'pointer',
							fontSize: '12px',
							color: '#ccc',
							hover: {
								backgroundColor: '#444',
							},
						}}
						onMouseEnter={(e) => {
							(e.currentTarget as HTMLElement).style.backgroundColor = '#444';
						}}
						onMouseLeave={(e) => {
							(e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
						}}
						onClick={() => handleRemoveIndicator(contextMenu.indicatorId)}
					>
						Remove
					</div>
				</div>
			)}
		</div>
	);
};
const styles: Record<string, React.CSSProperties> = {
	dragger: {
		position: 'absolute',
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
		width: '70px',
		height: '70px',
		pointerEvents: 'auto',
	},
	indicator: {
		width: '20px',
		height: '20px',
		borderRadius: '50%',
		zIndex: 1000,
		transform: 'translate(-50%, -50%)',
		boxShadow: '0 0 8px rgba(0, 0, 0, 0.5)',
	},
};
