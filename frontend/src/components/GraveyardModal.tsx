import React, { useState } from 'react';

interface GraveyardModalProps {
	cards: any[];
	onMoveCard: (cardId: string, zone: 'hand' | 'library' | 'graveyard' | 'exile') => void;
	onClose: () => void;
}

interface ContextMenu {
	x: number;
	y: number;
	cardId: string;
}
export const GraveyardModal: React.FC<GraveyardModalProps> = ({ cards, onMoveCard, onClose }) => {
	const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);

	const handleCardContextMenu = (e: React.MouseEvent, cardId: string) => {
		e.preventDefault();
		setContextMenu({ x: e.clientX, y: e.clientY, cardId });
	};

	const handleMoveCard = (zone: 'hand' | 'library' | 'graveyard' | 'exile') => {
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
					<h2 style={styles.title}>Graveyard ({cards.length} cards)</h2>
					<button onClick={onClose} style={styles.closeButton}>
						✕
					</button>
				</div>
				<div style={styles.cardGrid}>
					{cards.map((card) => {
						const imageUrl = card.card && card.card.image_uris && card.card.image_uris.normal ? card.card.image_uris.normal : null;
						return (
							<div key={card.id} style={styles.cardContainer} onContextMenu={(e) => handleCardContextMenu(e, card.id)}>
								{imageUrl ? (
									<img src={imageUrl} alt={card.card ? card.card.name : 'Unknown'} style={styles.cardImage} />
								) : (
									<div style={styles.cardPlaceholder}>{card.card ? card.card.name : 'Unknown'}</div>
								)}
								<div style={styles.cardName}>{card.card ? card.card.name : 'Unknown'}</div>
							</div>
						);
					})}
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
							Move to Library
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
		zIndex: 2000,
	},
	modal: {
		backgroundColor: '#2a2a2a',
		border: '2px solid #555',
		borderRadius: '8px',
		padding: '20px',
		maxWidth: '90vw',
		maxHeight: '90vh',
		display: 'flex' as const,
		flexDirection: 'column' as const,
		overflow: 'hidden' as const,
		boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
	},
	header: {
		display: 'flex' as const,
		justifyContent: 'space-between' as const,
		alignItems: 'center' as const,
		marginBottom: '15px',
		paddingBottom: '10px',
		borderBottom: '1px solid #444',
	},
	title: {
		margin: 0,
		color: '#fff',
		fontSize: '16px',
	},
	closeButton: {
		backgroundColor: '#444',
		color: '#fff',
		border: 'none',
		borderRadius: '4px',
		width: '32px',
		height: '32px',
		fontSize: '18px',
		cursor: 'pointer',
		display: 'flex' as const,
		alignItems: 'center' as const,
		justifyContent: 'center' as const,
		transition: 'background-color 0.2s',
	},
	cardGrid: {
		display: 'grid' as const,
		gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
		gap: '12px',
		overflowY: 'auto' as const,
		flex: 1,
		padding: '10px 0',
	},
	cardContainer: {
		display: 'flex' as const,
		flexDirection: 'column' as const,
		alignItems: 'center' as const,
		gap: '6px',
	},
	cardImage: {
		width: '100%',
		aspectRatio: '5 / 7',
		borderRadius: '6px',
		boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
		objectFit: 'cover' as const,
	},
	cardPlaceholder: {
		width: '100%',
		aspectRatio: '5 / 7',
		backgroundColor: '#1a1a1a',
		border: '1px solid #444',
		borderRadius: '6px',
		display: 'flex' as const,
		alignItems: 'center' as const,
		justifyContent: 'center' as const,
		padding: '8px',
		textAlign: 'center' as const,
		fontSize: '11px',
		color: '#bbb',
	},
	cardName: {
		fontSize: '10px',
		color: '#aaa',
		textAlign: 'center' as const,
		maxWidth: '100%',
		overflow: 'hidden' as const,
		textOverflow: 'ellipsis' as const,
		whiteSpace: 'nowrap' as const,
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
