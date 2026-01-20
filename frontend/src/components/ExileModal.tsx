import React from "react";

interface ExileModalProps {
	cards: any[];
	onClose: () => void;
}

export const ExileModal: React.FC<ExileModalProps> = ({ cards, onClose }) => {
	return (
		<div style={styles.overlay} onClick={onClose}>
			<div style={styles.modal} onClick={(e) => e.stopPropagation()}>
				<div style={styles.header}>
					<h2 style={styles.title}>
						Exile Zone ({cards.length} cards)
					</h2>
					<button onClick={onClose} style={styles.closeButton}>
						✕
					</button>
				</div>
				<div style={styles.cardGrid}>
					{cards.map((card) => {
						const imageUrl =
							card.card &&
							card.card.image_uris &&
							card.card.image_uris.normal
								? card.card.image_uris.normal
								: null;
						return (
							<div key={card.id} style={styles.cardContainer}>
								{imageUrl ? (
									<img
										src={imageUrl}
										alt={
											card.card
												? card.card.name
												: "Unknown"
										}
										style={styles.cardImage}
									/>
								) : (
									<div style={styles.cardPlaceholder}>
										{card.card ? card.card.name : "Unknown"}
									</div>
								)}
								<div style={styles.cardName}>
									{card.card ? card.card.name : "Unknown"}
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};

const styles = {
	overlay: {
		position: "fixed" as const,
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: "rgba(0, 0, 0, 0.8)",
		display: "flex" as const,
		alignItems: "center" as const,
		justifyContent: "center" as const,
		zIndex: 2000,
	},
	modal: {
		backgroundColor: "#2a2a2a",
		border: "2px solid #555",
		borderRadius: "8px",
		padding: "20px",
		maxWidth: "90vw",
		maxHeight: "90vh",
		display: "flex" as const,
		flexDirection: "column" as const,
		overflow: "hidden" as const,
		boxShadow: "0 8px 32px rgba(0, 0, 0, 0.8)",
	},
	header: {
		display: "flex" as const,
		justifyContent: "space-between" as const,
		alignItems: "center" as const,
		marginBottom: "15px",
		paddingBottom: "10px",
		borderBottom: "1px solid #444",
	},
	title: {
		margin: 0,
		color: "#fff",
		fontSize: "16px",
	},
	closeButton: {
		backgroundColor: "#444",
		color: "#fff",
		border: "none",
		borderRadius: "4px",
		width: "32px",
		height: "32px",
		fontSize: "18px",
		cursor: "pointer",
		display: "flex" as const,
		alignItems: "center" as const,
		justifyContent: "center" as const,
		transition: "background-color 0.2s",
	},
	cardGrid: {
		display: "grid" as const,
		gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
		gap: "12px",
		overflowY: "auto" as const,
		flex: 1,
		padding: "10px 0",
	},
	cardContainer: {
		display: "flex" as const,
		flexDirection: "column" as const,
		alignItems: "center" as const,
		gap: "6px",
	},
	cardImage: {
		width: "100%",
		aspectRatio: "5 / 7",
		borderRadius: "6px",
		boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
		objectFit: "cover" as const,
	},
	cardPlaceholder: {
		width: "100%",
		aspectRatio: "5 / 7",
		backgroundColor: "#1a1a1a",
		border: "1px solid #444",
		borderRadius: "6px",
		display: "flex" as const,
		alignItems: "center" as const,
		justifyContent: "center" as const,
		padding: "8px",
		textAlign: "center" as const,
		fontSize: "11px",
		color: "#bbb",
	},
	cardName: {
		fontSize: "10px",
		color: "#aaa",
		textAlign: "center" as const,
		maxWidth: "100%",
		overflow: "hidden" as const,
		textOverflow: "ellipsis" as const,
		whiteSpace: "nowrap" as const,
	},
};
