import React from 'react';
import { Card, Counters } from '../store';

interface CardDisplayProps {
	card?: Card | null;
	isTapped?: boolean;
	counters?: Counters;
	overlay?: React.ReactNode;
	highlight?: boolean;
	compact?: boolean;
	scale?: number;
	style?: React.CSSProperties;
	className?: string;
	onError?: (error: Error) => void;
}

export const CardDisplay: React.FC<CardDisplayProps> = ({
	card,
	isTapped = false,
	counters,
	overlay,
	highlight = false,
	compact = false,
	scale,
	style,
	className = '',
	onError,
}) => {
	if (!card) return null;

	// For dual-faced cards, use the first face's image if card_faces exists
	let imageUrl = (card.image_uris?.normal || card.image_uris?.large || card.image_uris?.small || '').trim();

	// If no image_uris (or it's null/empty) and card_faces exists, use first face's image

	// Fixed card dimensions only when scale > 1 (for precise battlefield positioning)
	const useFixedDimensions = scale != null;
	const cardWidth = useFixedDimensions ? 120 * scale : undefined;
	const cardHeight = useFixedDimensions ? 170 * scale : undefined;
	// Counter display configuration
	const counterDisplay = counters
		? [
				{ type: 'plus_one_plus_one', label: '+1/+1', color: '#00ff00' },
				{ type: 'minus_one_minus_one', label: '-1/-1', color: '#ff0000' },
				{ type: 'charge', label: '⚡', color: '#ffff00' },
				{ type: 'generic', label: '◆', color: '#cccccc' },
			]
				.filter((counter) => (counters[counter.type as keyof Counters] ?? 0) > 0)
				.map((counter) => ({
					...counter,
					count: counters[counter.type as keyof Counters]!,
				}))
		: [];

	const containerStyle: React.CSSProperties = {
		position: 'relative',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
		borderRadius: '8px',
		transform: isTapped ? 'rotate(90deg)' : 'rotate(0deg)',
		transition: 'transform 0.2s',
	};

	// Only add fixed dimensions if scale > 1, otherwise let style control
	if (useFixedDimensions) {
		containerStyle.width = `${cardWidth}px`;
		containerStyle.height = `${cardHeight}px`;
	} else {
		containerStyle.width = '100%';
		containerStyle.height = '100%';
	}

	return (
		<div
			className={`card-display${highlight ? ' highlight' : ''}${compact ? ' compact' : ''} ${className}`}
			style={{
				...containerStyle,
				...style,
			}}
		>
			{imageUrl ? (
				<img
					src={imageUrl}
					alt={card.name}
					style={{
						width: '100%',
						height: '100%',
						borderRadius: '8px',
						boxShadow: highlight ? '0 0 8px 2px #0066ff' : '0 2px 8px rgba(0,0,0,0.3)',
						objectFit: 'contain',
						transition: 'box-shadow 0.2s',
					}}
					onError={(e) => {
						(e.target as HTMLImageElement).style.display = 'none';
						const err = new Error(`Failed to load image for card: ${card.name}`);
						onError?.(err);
					}}
				/>
			) : (
				<div
					style={{
						height: '100%',
						width: '100%',
						background: '#1a1a1a',
						color: '#ccc',
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						justifyContent: 'flex-start',
						borderRadius: '8px',
						fontSize: compact ? '12px' : '16px',
						textAlign: 'center',
						padding: '8px',
						border: '1px solid #444',
						boxSizing: 'border-box',
						transform: isTapped ? 'rotate(90deg)' : 'rotate(0deg)',
					}}
				>
					<div style={{ fontSize: '11px', fontWeight: 'bold', color: '#ffd700', marginBottom: '4px' }}>{card.mana_cost}</div>
					<div style={{ fontWeight: 'bold', fontSize: '10px', marginBottom: '2px' }}>{card.name}</div>
					<div
						style={{ fontSize: '9px', color: '#bbb', marginBottom: '4px', borderTop: '1px solid #555', paddingTop: '2px', width: '100%' }}
					>
						{card.type_line}
					</div>
					<div style={{ fontSize: '8px', color: '#ddd', flex: '1', overflowY: 'auto', marginBottom: '4px' }}>{card.oracle_text}</div>
					{card.power && card.toughness && (
						<div style={{ fontSize: '10px', fontWeight: 'bold', marginTop: 'auto' }}>
							{card.power}/{card.toughness}
						</div>
					)}
				</div>
			)}

			{/* Tapped label overlay */}
			{isTapped && (
				<div
					style={{
						position: 'absolute',
						top: '50%',
						left: '50%',
						transform: 'translate(-50%, -50%) rotate(-90deg)',
						backgroundColor: 'rgba(255, 0, 0, 0.7)',
						color: '#fff',
						padding: '5px 10px',
						fontSize: '12px',
						fontWeight: 'bold',
						borderRadius: '4px',
						pointerEvents: 'none',
					}}
				>
					TAP
				</div>
			)}

			{/* Counter display */}
			{counterDisplay.length > 0 && (
				<div
					style={{
						position: 'absolute',
						bottom: '4px',
						left: '4px',
						display: 'flex',
						gap: '2px',
						flexWrap: 'wrap',
						maxWidth: '80px',
						pointerEvents: 'none',
					}}
				>
					{counterDisplay.map((counter, idx) => (
						<div
							key={idx}
							style={{
								padding: '2px 4px',
								borderRadius: '3px',
								fontSize: '9px',
								fontWeight: 'bold',
								color: '#000',
								display: 'flex',
								alignItems: 'center',
								gap: '2px',
								minWidth: '20px',
								justifyContent: 'center',
								backgroundColor: counter.color,
								textShadow: '0 0 2px rgba(255, 255, 255, 0.5)',
							}}
							title={`${counter.count} ${counter.label}`}
						>
							{counter.count > 1 ? counter.count : ''}
							{counter.label}
						</div>
					))}
				</div>
			)}

			{/* Custom overlay */}
			{overlay && (
				<div
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						width: '100%',
						height: '100%',
						pointerEvents: 'none',
					}}
				>
					{overlay}
				</div>
			)}
		</div>
	);
};
