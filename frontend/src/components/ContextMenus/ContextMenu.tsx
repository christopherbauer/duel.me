import React, { useEffect, useMemo, useState } from "react";
import { useGameStore, Card } from "../../store";
import { ActionMethod } from "../../types";
import { ContextMenuType, MenuItem } from "./types";
import {
	libraryMenuItems,
	handMenuItems,
	exileMenuItems,
	battlefieldMenuItems,
	graveyardMenuItems,
} from "./MenuItems";

const typeToMenuItemsMap: (
	objectId?: string,
	availableTokens?: Card[],
	availableComponents?: Card[],
	position?: { x: number; y: number },
) => Record<ContextMenuType, MenuItem[]> = (
	objectId,
	availableTokens = [],
	availableComponents = [],
	position,
) => ({
	[ContextMenuType.Library]: libraryMenuItems(),
	[ContextMenuType.Hand]: handMenuItems(objectId),
	[ContextMenuType.Graveyard]: graveyardMenuItems(objectId),
	[ContextMenuType.Exile]: exileMenuItems(objectId),
	[ContextMenuType.Battlefield]: objectId
		? battlefieldMenuItems(objectId)
		: backgroundTokenMenuItems(
				availableTokens,
				availableComponents,
				position,
			),
});
interface ContextMenuProps {
	x: number;
	y: number;
	type: "library" | "hand" | "graveyard" | "exile" | "battlefield";
	objectId?: string;
	onClose: () => void;
	executeAction: ActionMethod;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
	x,
	y,
	type,
	objectId,
	onClose,
	executeAction,
}) => {
	const [hoveredSubmenu, setHoveredSubmenu] = useState<string | null>(null);
	const [hoveredSubitem, setHoveredSubitem] = useState<string | null>(null);
	const [hoveredItem, setHoveredItem] = useState<string | null>(null);
	const submenuTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		const handleClickOutside = () => onClose();
		window.addEventListener("click", handleClickOutside);
		return () => {
			window.removeEventListener("click", handleClickOutside);
			if (submenuTimeoutRef.current) {
				clearTimeout(submenuTimeoutRef.current);
			}
		};
	}, [onClose]);

	const { availableTokens, availableComponents } = useGameStore();

	const menuItems = useMemo(() => {
		return typeToMenuItemsMap(
			objectId,
			availableTokens,
			availableComponents,
			{ x, y },
		)[type];
	}, [type, objectId, availableTokens, availableComponents, x, y]);

	const handleMenuItemClick = (item: MenuItem) => {
		if (item.action) {
			executeAction(item.action, undefined, item.metadata);
			onClose();
		}
	};

	const handleMouseEnter = (label: string, hasSubmenu: boolean) => {
		if (submenuTimeoutRef.current) {
			clearTimeout(submenuTimeoutRef.current);
			submenuTimeoutRef.current = null;
		}
		setHoveredItem(label);
		if (hasSubmenu) {
			setHoveredSubmenu(label);
		}
	};

	const handleMouseLeave = () => {
		submenuTimeoutRef.current = setTimeout(() => {
			setHoveredSubmenu(null);
			setHoveredItem(null);
		}, 500);
	};

	return (
		<div
			style={{
				...styles.contextMenu,
				left: `${x}px`,
				top: `${y}px`,
			}}
			onMouseLeave={handleMouseLeave}
			onMouseEnter={() => {
				if (submenuTimeoutRef.current) {
					clearTimeout(submenuTimeoutRef.current);
					submenuTimeoutRef.current = null;
				}
			}}
		>
			{menuItems.map((item, idx) => {
				if (item.isCounterSection && item.counterItems) {
					return (
						<div key={item.label}>
							<div style={styles.sectionHeader}>{item.label}</div>
							{item.counterItems.length === 0 ||
							item.counterItems.every((c) => c.count === 0) ? (
								<div style={styles.counterItemEmpty}>
									No counters
								</div>
							) : (
								item.counterItems
									.filter((c) => c.count > 0)
									.map((counter) => (
										<div
											key={counter.type}
											style={styles.counterItem}
										>
											<span style={styles.counterLabel}>
												{counter.label}: {counter.count}
											</span>
											<div style={styles.counterButtons}>
												<button
													style={styles.counterButton}
													onClick={(e) => {
														e.stopPropagation();
														executeAction(
															"add_counter",
															undefined,
															{
																objectId,
																counterType:
																	counter.type,
															},
														);
													}}
												>
													+
												</button>
												<button
													style={styles.counterButton}
													onClick={(e) => {
														e.stopPropagation();
														executeAction(
															"remove_counter",
															undefined,
															{
																objectId,
																counterType:
																	counter.type,
															},
														);
													}}
												>
													−
												</button>
											</div>
										</div>
									))
							)}
						</div>
					);
				}

				return (
					<div
						key={item.label}
						onMouseEnter={() =>
							handleMouseEnter(item.label, !!item.submenu)
						}
						onMouseLeave={() => {
							if (!item.submenu) {
								handleMouseLeave();
							}
						}}
					>
						<div
							style={{
								...styles.contextMenuItem,
								backgroundColor:
									hoveredItem === item.label
										? "#444"
										: "transparent",
								paddingRight: item.submenu ? "20px" : "12px",
							}}
							onClick={() => handleMenuItemClick(item)}
						>
							{item.label}
							{item.submenu && (
								<span style={styles.submenuArrow}>›</span>
							)}
						</div>

						{item.submenu && hoveredSubmenu === item.label && (
							<div
								style={styles.submenu}
								onMouseLeave={() => {
									submenuTimeoutRef.current = setTimeout(
										() => {
											setHoveredSubitem(null);
											setHoveredSubmenu(null);
										},
										150,
									);
								}}
								onMouseEnter={() => {
									if (submenuTimeoutRef.current) {
										clearTimeout(submenuTimeoutRef.current);
										submenuTimeoutRef.current = null;
									}
								}}
							>
								{item.submenu.map((subitem) => (
									<div
										key={subitem.label}
										style={{
											position: "relative" as const,
										}}
										onMouseEnter={() => {
											if (submenuTimeoutRef.current) {
												clearTimeout(
													submenuTimeoutRef.current,
												);
												submenuTimeoutRef.current =
													null;
											}
											if (subitem.submenu) {
												setHoveredSubitem(
													subitem.label,
												);
											}
										}}
										onMouseLeave={() => {
											submenuTimeoutRef.current =
												setTimeout(() => {
													setHoveredSubitem(null);
												}, 150);
										}}
									>
										<div
											style={{
												...styles.contextMenuItem,
												borderBottom:
													subitem ===
													item.submenu![
														item.submenu!.length - 1
													]
														? "none"
														: "1px solid #444",
												paddingRight: subitem.submenu
													? "20px"
													: "12px",
											}}
											onClick={() => {
												handleMenuItemClick(subitem);
											}}
											onMouseEnter={(e) => {
												(
													e.currentTarget as HTMLElement
												).style.backgroundColor =
													"#444";
											}}
											onMouseLeave={(e) => {
												(
													e.currentTarget as HTMLElement
												).style.backgroundColor =
													"transparent";
											}}
										>
											{subitem.label}
											{subitem.submenu && (
												<span
													style={styles.submenuArrow}
												>
													›
												</span>
											)}
										</div>
										{/* Third-level submenu */}
										{subitem.submenu &&
											hoveredSubitem ===
												subitem.label && (
												<div
													style={styles.submenu}
													onMouseEnter={() => {
														if (
															submenuTimeoutRef.current
														) {
															clearTimeout(
																submenuTimeoutRef.current,
															);
															submenuTimeoutRef.current =
																null;
														}
														setHoveredSubitem(
															subitem.label,
														);
													}}
													onMouseLeave={() => {
														submenuTimeoutRef.current =
															setTimeout(() => {
																setHoveredSubitem(
																	null,
																);
															}, 150);
													}}
												>
													{subitem.submenu.map(
														(subsubitem) => (
															<div
																key={
																	subsubitem.label
																}
																style={{
																	...styles.contextMenuItem,
																	borderBottom:
																		subsubitem ===
																		subitem
																			.submenu![
																			subitem
																				.submenu!
																				.length -
																				1
																		]
																			? "none"
																			: "1px solid #444",
																}}
																onClick={() => {
																	handleMenuItemClick(
																		subsubitem,
																	);
																}}
																onMouseEnter={(
																	e,
																) => {
																	(
																		e.currentTarget as HTMLElement
																	).style.backgroundColor =
																		"#444";
																}}
																onMouseLeave={(
																	e,
																) => {
																	(
																		e.currentTarget as HTMLElement
																	).style.backgroundColor =
																		"transparent";
																}}
															>
																{
																	subsubitem.label
																}
															</div>
														),
													)}
												</div>
											)}
									</div>
								))}
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
};

const styles = {
	contextMenu: {
		position: "fixed" as const,
		backgroundColor: "#2a2a2a",
		border: "1px solid #555",
		borderRadius: "4px",
		zIndex: 2000,
		minWidth: "200px",
		boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
	},
	contextMenuItems: {},
	contextMenuItem: {
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
	submenu: {
		position: "absolute" as const,
		left: "100%",
		top: 0,
		marginLeft: "0",
		backgroundColor: "#2a2a2a",
		border: "1px solid #555",
		borderRadius: "4px",
		minWidth: "400px",
		zIndex: 2001,
		boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
		overflow: "visible" as const,
	},
	submenuArrow: {
		fontSize: "14px",
		color: "#888",
		marginLeft: "8px",
	},
	sectionHeader: {
		padding: "6px 12px",
		fontSize: "11px",
		color: "#999",
		textTransform: "uppercase" as const,
		fontWeight: "bold" as const,
		letterSpacing: "0.5px",
		borderBottom: "1px solid #444",
	},
	counterItem: {
		display: "flex" as const,
		justifyContent: "space-between" as const,
		alignItems: "center" as const,
		padding: "6px 12px",
		fontSize: "12px",
		borderBottom: "1px solid #444",
	},
	counterItemEmpty: {
		padding: "6px 12px",
		fontSize: "12px",
		color: "#666",
		fontStyle: "italic" as const,
	},
	counterLabel: {
		color: "#fff",
	},
	counterButtons: {
		display: "flex" as const,
		gap: "4px",
	},
	counterButton: {
		backgroundColor: "#0066ff",
		color: "#fff",
		border: "none",
		borderRadius: "3px",
		padding: "2px 6px",
		cursor: "pointer",
		fontSize: "10px",
		fontWeight: "bold" as const,
		transition: "background-color 0.2s",
	},
};

const backgroundTokenMenuItems = (
	availableTokens: Card[],
	availableComponents: Card[],
	position?: { x: number; y: number },
): MenuItem[] => {
	const items: MenuItem[] = [];

	items.push({
		label: "Untap",
		action: "untap_all",
	});

	if (availableTokens && availableTokens.length > 0) {
		items.push({
			label: "Create Token",
			submenu: availableTokens.map((token) => {
				const displayLabel =
					token.power && token.toughness
						? `${token.name} - ${token.power}/${token.toughness}`
						: token.name;

				return {
					label: displayLabel,
					submenu: [
						{
							label: "1",
							action: "create_token_copy",
							metadata: {
								tokenCardId: token.id,
								quantity: 1,
								position,
							},
						},
						{
							label: "2",
							action: "create_token_copy",
							metadata: {
								tokenCardId: token.id,
								quantity: 2,
								position,
							},
						},
						{
							label: "3",
							action: "create_token_copy",
							metadata: {
								tokenCardId: token.id,
								quantity: 3,
								position,
							},
						},
						{
							label: "4",
							action: "create_token_copy",
							metadata: {
								tokenCardId: token.id,
								quantity: 4,
								position,
							},
						},
					],
				};
			}),
		});
	}

	if (availableComponents && availableComponents.length > 0) {
		items.push({
			label: "Create Component",
			submenu: availableComponents.map((component) => {
				const displayLabel =
					component.power && component.toughness
						? `${component.name} - ${component.power}/${component.toughness}`
						: component.name;

				return {
					label: displayLabel,
					submenu: [
						{
							label: "1",
							action: "create_token_copy",
							metadata: {
								tokenCardId: component.id,
								quantity: 1,
								position,
							},
						},
						{
							label: "2",
							action: "create_token_copy",
							metadata: {
								tokenCardId: component.id,
								quantity: 2,
								position,
							},
						},
						{
							label: "3",
							action: "create_token_copy",
							metadata: {
								tokenCardId: component.id,
								quantity: 3,
								position,
							},
						},
						{
							label: "4",
							action: "create_token_copy",
							metadata: {
								tokenCardId: component.id,
								quantity: 4,
								position,
							},
						},
					],
				};
			}),
		});
	}

	if (items.length === 1) {
		return [
			{
				label: "No tokens or components available",
			},
		];
	}

	return items;
};
export default ContextMenu;
