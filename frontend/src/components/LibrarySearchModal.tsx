import React, { useState } from 'react';

interface Card {
	id: string;
	cmc: string | null;
	color_identity: string[] | null;
	colors: string[] | null;
	keywords: string[] | null;
	layout: string | null;
	mana_cost: string | null;
	oracle_text: string | null;
	power: string | null;
	toughness: string | null;
	type_line: string;
	card?: {
		name: string;
		image_uris?: {
			normal: string;
		};
	};
}

interface LibrarySearchModalProps {
	cards: Card[];
	onClose: () => void;
	onCloseAndShuffle: () => void;
	onMoveCard: (cardId: string, zone: 'hand' | 'library' | 'graveyard' | 'exile') => void;
	onContextMenu?: (e: React.MouseEvent, cardId: string) => void;
}

interface ContextMenu {
	x: number;
	y: number;
	cardId: string;
}

export const LibrarySearchModal: React.FC<LibrarySearchModalProps> = ({ cards, onClose, onCloseAndShuffle, onMoveCard, onContextMenu }) => {
	const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
	const [searchTerm, setSearchTerm] = useState('');
	console.log(cards);

	const filteredCards = cards.filter((card) => {
		if (!searchTerm) return true;
		const cardName = card.card?.name || '';
		return (cardName + card.type_line).toLowerCase().includes(searchTerm.toLowerCase());
	});

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
		<div style={styles.overlay}>
			<div style={styles.modal}>
				<div style={styles.header}>
					<h2 style={styles.title}>Library Search</h2>
					<input
						type="text"
						placeholder="Search cards..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						style={styles.searchInput}
					/>
				</div>

				<div style={styles.cardsGrid}>
					{filteredCards.length > 0 ? (
						filteredCards.map((card) => (
							<div
								key={card.id}
								style={styles.cardWrapper}
								onContextMenu={(e) => handleCardContextMenu(e, card.id)}
								title={card.card?.name || 'Unknown'}
							>
								{card.card?.image_uris?.normal ? (
									<img src={card.card.image_uris.normal} style={styles.cardImage} alt={card.card.name || 'Card'} />
								) : (
									<div style={styles.cardPlaceholder}>{card.card?.name || 'Unknown'}</div>
								)}
							</div>
						))
					) : (
						<div style={styles.noResults}>No cards found</div>
					)}
				</div>

				<div style={styles.footer}>
					<button onClick={onClose} style={styles.closeButton}>
						Close
					</button>
					<button onClick={onCloseAndShuffle} style={styles.shuffleButton}>
						Close and Shuffle
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
	searchInput: {
		width: '100%',
		padding: '8px 12px',
		backgroundColor: '#0d0d0d',
		border: '1px solid #444',
		borderRadius: '4px',
		color: '#fff',
		fontSize: '12px',
		boxSizing: 'border-box' as const,
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
	cardImage: {
		width: '100%',
		height: 'auto',
		borderRadius: '4px',
		display: 'block',
	},
	cardPlaceholder: {
		width: '100%',
		height: '195px',
		backgroundColor: '#2a2a2a',
		border: '1px solid #555',
		borderRadius: '4px',
		display: 'flex' as const,
		alignItems: 'center' as const,
		justifyContent: 'center' as const,
		fontSize: '10px',
		color: '#aaa',
		textAlign: 'center' as const,
		padding: '8px',
		boxSizing: 'border-box' as const,
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
	shuffleButton: {
		padding: '8px 20px',
		backgroundColor: '#0066ff',
		color: '#fff',
		border: 'none',
		borderRadius: '4px',
		fontWeight: 'bold' as const,
		fontSize: '12px',
		cursor: 'pointer',
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
