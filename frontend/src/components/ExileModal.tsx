import React, { useState } from 'react';
import { CardDisplay } from './CardDisplay';

interface ExileModalProps {
	cards: any[];
	onMoveCard: (cardId: string, zone: 'hand' | 'library' | 'graveyard' | 'exile') => void;
	onClose: () => void;
}

interface ContextMenu {
	x: number;
	y: number;
	cardId: string;
}
export const ExileModal: React.FC<ExileModalProps> = ({ cards, onMoveCard, onClose }) => {
	const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);

	const handleCardContextMenu = (e: React.MouseEvent, cardId: string) => {
		e.preventDefault();
		setContextMenu({ x: e.clientX, y: e.clientY, cardId });
	};

	const handleMoveCard = (zone: 'battlefield' | 'hand' | 'library' | 'graveyard' | 'exile') => {
		if (contextMenu) {
			onMoveCard(contextMenu.cardId, zone);
			setContextMenu(null);
		}
	};
	React.useEffect(() => {
		const handleClickOutside = () => {
			setContextMenu(null);
		};
		window.addEventListener('click', handleClickOutside);
		return () => window.removeEventListener('click', handleClickOutside);
	}, []);

	return (
		<div style={styles.overlay} onClick={onClose}>
			<div style={styles.modal} onClick={(e) => e.stopPropagation()}>
				<div style={styles.header}>
					<h2 style={styles.title}>Exile Zone ({cards.length} cards)</h2>
				</div>
				<div style={styles.cardsGrid}>
					{cards.length > 0 ? (
						cards.map((card) => (
							<div
								key={card.id}
								style={styles.cardWrapper}
								onContextMenu={(e) => handleCardContextMenu(e, card.id)}
								title={card.card?.name || 'Unknown'}
							>
								<CardDisplay card={card.card} style={{ height: '500px', width: '100%' }} />
							</div>
						))
					) : (
						<div style={styles.noResults}>No cards in exile</div>
					)}
				</div>
				<div style={styles.footer}>
					<button onClick={onClose} style={styles.closeButton}>
						Close
					</button>
				</div>

				{contextMenu && (
					<div
						style={{
							...styles.contextMenu,
							left: `${contextMenu.x}px`,
							top: `${contextMenu.y}px`,
						}}
					>
						<div
							style={styles.contextMenuItem}
							onClick={() => handleMoveCard('battlefield')}
							onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#444')}
							onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
						>
							Cast{' '}
						</div>
						<div
							style={styles.contextMenuItem}
							onClick={() => handleMoveCard('hand')}
							onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#444')}
							onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
						>
							Move to Hand
						</div>
						<div
							style={styles.contextMenuItem}
							onClick={() => handleMoveCard('library')}
							onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#444')}
							onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
						>
							Keep in Library
						</div>
						<div
							style={styles.contextMenuItem}
							onClick={() => handleMoveCard('graveyard')}
							onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#444')}
							onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
						>
							Move to Graveyard
						</div>
						<div
							style={styles.contextMenuItem}
							onClick={() => handleMoveCard('exile')}
							onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#444')}
							onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
						>
							Move to Exile
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

const styles: Record<string, React.CSSProperties> = {
	overlay: {
		position: 'fixed' as const,
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: 'rgba(0, 0, 0, 0.8)',
		display: 'flex' as const,
		alignItems: 'center' as const,
		justifyContent: 'center' as const,
		zIndex: 3000,
	},
	modal: {
		backgroundColor: '#1a1a1a',
		border: '2px solid #0066ff',
		borderRadius: '8px',
		padding: '20px',
		width: '90vw',
		maxHeight: '90vh',
		display: 'flex' as const,
		flexDirection: 'column' as const,
		boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
	},
	header: {
		marginBottom: '20px',
	},
	title: {
		margin: '0 0 12px 0',
		fontSize: '18px',
		fontWeight: 'bold' as const,
		color: '#fff',
	},
	cardsGrid: {
		display: 'grid' as const,
		gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
		gap: '12px',
		flex: 1,
		overflowY: 'auto' as const,
		marginBottom: '15px',
		padding: '12px',
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		borderRadius: '4px',
	},
	cardWrapper: {
		cursor: 'pointer',
		borderRadius: '4px',
		border: '1px solid transparent',
		transition: 'border-color 0.2s',
	},
	noResults: {
		gridColumn: '1 / -1',
		textAlign: 'center' as const,
		color: '#aaa',
		padding: '20px',
	},
	footer: {
		display: 'flex' as const,
		gap: '10px',
		justifyContent: 'flex-end' as const,
	},
	closeButton: {
		padding: '8px 16px',
		backgroundColor: '#444',
		color: '#fff',
		border: 'none',
		borderRadius: '4px',
		cursor: 'pointer',
		fontSize: '12px',
	},
	contextMenu: {
		position: 'fixed' as const,
		backgroundColor: '#2a2a2a',
		border: '1px solid #555',
		borderRadius: '4px',
		zIndex: 3001,
		minWidth: '150px',
		boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
		overflow: 'hidden' as const,
	},
	contextMenuItem: {
		padding: '8px 12px',
		cursor: 'pointer',
		borderBottom: '1px solid #444',
		fontSize: '12px',
		transition: 'background-color 0.2s',
		userSelect: 'none',
	},
};
