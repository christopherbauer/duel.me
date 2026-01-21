import React, { useEffect, useState } from "react";
import { useGameStore, Card } from "../store";
import { ActionMethod } from "../types";

interface TokenCreationMenuProps {
	x: number;
	y: number;
	onClose: () => void;
	executeAction: ActionMethod;
}

const TokenCreationMenu: React.FC<TokenCreationMenuProps> = ({
	x,
	y,
	onClose,
	executeAction,
}) => {
	const { availableTokens } = useGameStore();
	const [hoveredToken, setHoveredToken] = useState<string | null>(null);
	const [hoveredQuantity, setHoveredQuantity] = useState<string | null>(null);

	useEffect(() => {
		const handleClickOutside = () => onClose();
		window.addEventListener("click", handleClickOutside);
		return () => {
			window.removeEventListener("click", handleClickOutside);
		};
	}, [onClose]);

	const handleTokenCreation = (tokenCardId: string, quantity: number) => {
		executeAction("create_token_copy", undefined, {
			tokenCardId,
			quantity,
		});
		onClose();
	};

	if (!availableTokens || availableTokens.length === 0) {
		return (
			<div
				style={{
					...styles.menu,
					left: `${x}px`,
					top: `${y}px`,
				}}
				onClick={(e) => e.stopPropagation()}
			>
				<div style={styles.emptyState}>No tokens available</div>
			</div>
		);
	}

	return (
		<div
			style={{
				...styles.menu,
				left: `${x}px`,
				top: `${y}px`,
			}}
			onClick={(e) => e.stopPropagation()}
		>
			{availableTokens.map((token: Card) => (
				<div key={token.id}>
					<div
						style={{
							...styles.tokenMenuItem,
							backgroundColor:
								hoveredToken === token.id
									? "#444"
									: "transparent",
							paddingRight: "20px",
						}}
						onMouseEnter={() => setHoveredToken(token.id)}
						onMouseLeave={() => {
							setHoveredToken(null);
							setHoveredQuantity(null);
						}}
					>
						{token.name}
						{hoveredToken === token.id && (
							<span style={styles.submenuArrow}>›</span>
						)}
					</div>

					{hoveredToken === token.id && (
						<div style={styles.quantitySubmenu}>
							{[1, 2, 3, 4].map((qty) => (
								<div
									key={qty}
									style={{
										...styles.quantityItem,
										backgroundColor:
											hoveredQuantity ===
											`${token.id}-${qty}`
												? "#555"
												: "transparent",
									}}
									onClick={() =>
										handleTokenCreation(token.id, qty)
									}
									onMouseEnter={() =>
										setHoveredQuantity(`${token.id}-${qty}`)
									}
									onMouseLeave={() =>
										setHoveredQuantity(null)
									}
								>
									Create {qty}
								</div>
							))}
						</div>
					)}
				</div>
			))}
		</div>
	);
};

const styles = {
	menu: {
		position: "fixed" as const,
		backgroundColor: "#2a2a2a",
		border: "1px solid #555",
		borderRadius: "4px",
		zIndex: 2000,
		minWidth: "200px",
		boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
		maxHeight: "400px",
		overflowY: "auto" as const,
	},
	tokenMenuItem: {
		padding: "8px 12px",
		cursor: "pointer",
		borderBottom: "1px solid #444",
		fontSize: "12px",
		transition: "background-color 0.2s",
		position: "relative" as const,
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		userSelect: "none" as const,
	},
	quantitySubmenu: {
		position: "absolute" as const,
		left: "100%",
		top: 0,
		marginLeft: "0",
		backgroundColor: "#2a2a2a",
		border: "1px solid #555",
		borderRadius: "4px",
		minWidth: "100px",
		zIndex: 2001,
		boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
		overflow: "hidden" as const,
	},
	quantityItem: {
		padding: "8px 12px",
		cursor: "pointer",
		borderBottom: "1px solid #444",
		fontSize: "12px",
		transition: "background-color 0.2s",
		userSelect: "none" as const,
	},
	submenuArrow: {
		fontSize: "14px",
		color: "#888",
		marginLeft: "8px",
	},
	emptyState: {
		padding: "8px 12px",
		fontSize: "12px",
		color: "#666",
		fontStyle: "italic" as const,
	},
};

export default TokenCreationMenu;
