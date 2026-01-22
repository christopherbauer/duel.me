import React, { useEffect, useMemo, useState } from "react";
import { useGameStore, Card } from "../../store";
import { ActionMethod } from "../../types";

enum ContextMenuType {
	Library = "library",
	Hand = "hand",
	Graveyard = "graveyard",
	Exile = "exile",
	Battlefield = "battlefield",
}

interface MenuItem {
	label: string;
	action?: string;
	metadata?: any;
	submenu?: MenuItem[];
	isCounterSection?: boolean;
	counterItems?: { type: string; label: string; count: number }[];
}

const typeToMenuItemsMap: (
	objectId?: string,
	availableTokens?: Card[],
	position?: { x: number; y: number },
) => Record<ContextMenuType, MenuItem[]> = (
	objectId,
	availableTokens = [],
	position,
) => ({
	[ContextMenuType.Library]: libraryMenuItems(),
	[ContextMenuType.Hand]: handMenuItems(objectId),
	[ContextMenuType.Graveyard]: graveyardMenuItems(objectId),
	[ContextMenuType.Exile]: exileMenuItems(objectId),
	[ContextMenuType.Battlefield]: objectId
		? battlefieldMenuItems(objectId)
		: backgroundTokenMenuItems(availableTokens, position),
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

	const { availableTokens } = useGameStore();

	const menuItems = useMemo(() => {
		return typeToMenuItemsMap(objectId, availableTokens, { x, y })[type];
	}, [type, objectId, availableTokens, x, y]);

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
		minWidth: "150px",
		boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
	},
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
		minWidth: "120px",
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
const libraryMenuItems = (): MenuItem[] => [
	{ label: "Search Library", action: "search_library" },
	{ label: "Shuffle Library", action: "shuffle_library" },
	{
		label: "Draw",
		submenu: [
			{ label: "1", action: "draw", metadata: { count: 1 } },
			{ label: "2", action: "draw", metadata: { count: 2 } },
			{ label: "3", action: "draw", metadata: { count: 3 } },
			{ label: "4", action: "draw", metadata: { count: 4 } },
		],
	},
	{
		label: "Scry",
		submenu: [
			{ label: "1", action: "scry", metadata: { count: 1 } },
			{ label: "2", action: "scry", metadata: { count: 2 } },
			{ label: "3", action: "scry", metadata: { count: 3 } },
			{ label: "4", action: "scry", metadata: { count: 4 } },
		],
	},
	{
		label: "Surveil",
		submenu: [
			{ label: "1", action: "surveil", metadata: { count: 1 } },
			{ label: "2", action: "surveil", metadata: { count: 2 } },
			{ label: "3", action: "surveil", metadata: { count: 3 } },
			{ label: "4", action: "surveil", metadata: { count: 4 } },
		],
	},
	{
		label: "Exile",
		submenu: [
			{ label: "1", action: "exile_from_top", metadata: { count: 1 } },
			{ label: "2", action: "exile_from_top", metadata: { count: 2 } },
			{ label: "3", action: "exile_from_top", metadata: { count: 3 } },
			{ label: "4", action: "exile_from_top", metadata: { count: 4 } },
		],
	},
];
const handMenuItems = (objectId?: string): MenuItem[] => [
	{
		label: "Cast",
		action: "cast",
		metadata: { objectId },
	},
	{
		label: "Move to Exile",
		action: "move_to_exile",
		metadata: { objectId },
	},
	{
		label: "Discard",
		action: "discard",
		metadata: { objectId },
	},
];
const graveyardMenuItems = (objectId?: string): MenuItem[] => [
	{
		label: "Return to Hand",
		action: "move_to_hand",
		metadata: { objectId },
	},
	{
		label: "Return to Library",
		action: "move_to_library",
		metadata: { objectId },
	},
];
const exileMenuItems = (objectId?: string): MenuItem[] => [
	{
		label: "Return to Hand",
		action: "move_to_hand",
		metadata: { objectId },
	},
];
const battlefieldMenuItems = (objectId?: string): MenuItem[] => {
	// Get counters for this object from the store
	const gameState = useGameStore.getState().gameState;
	if (!gameState) return [];
	const obj = gameState?.objects.find((o) => o.id === objectId);
	const counters = obj?.counters || {};
	const counterTypes = [
		{ type: "plus_one_plus_one", label: "+1/+1" },
		{ type: "minus_one_minus_one", label: "-1/-1" },
		{ type: "charge", label: "Charge" },
		{ type: "generic", label: "Generic" },
	];

	// Build counter items for the counters section
	const counterDisplayItems = counterTypes.map((ct) => ({
		type: ct.type,
		label: ct.label,
		count: (counters as any)[ct.type] || 0,
	}));

	return [
		{
			label: "Tap/Untap",
			action: "toggle_tap",
			metadata: { objectId },
		},
		{
			label: "Counters",
			isCounterSection: true,
			counterItems: counterDisplayItems,
		},
		{
			label: "Add Counter",
			submenu: counterTypes.map((ct) => ({
				label: ct.label,
				action: "add_counter",
				metadata: { objectId, counterType: ct.type },
			})),
		},
		{
			label: "Remove Counter",
			submenu: counterTypes.map((ct) => ({
				label: ct.label,
				action: "remove_counter",
				metadata: { objectId, counterType: ct.type },
			})),
		},
		{
			label: "Create Token Copy",
			submenu: [
				{
					label: "1",
					action: "create_token_copy",
					metadata: { sourceObjectId: objectId, quantity: 1 },
				},
				{
					label: "2",
					action: "create_token_copy",
					metadata: { sourceObjectId: objectId, quantity: 2 },
				},
				{
					label: "3",
					action: "create_token_copy",
					metadata: { sourceObjectId: objectId, quantity: 3 },
				},
				{
					label: "4",
					action: "create_token_copy",
					metadata: { sourceObjectId: objectId, quantity: 4 },
				},
			],
		},
		{
			label: "Move to Hand",
			action: "move_to_hand",
			metadata: { objectId },
		},
		{
			label: "Move to Graveyard",
			action: "move_to_graveyard",
			metadata: { objectId },
		},
		{
			label: "Exile",
			action: "move_to_exile",
			metadata: { objectId },
		},
	];
};

const backgroundTokenMenuItems = (
	availableTokens: Card[],
	position?: { x: number; y: number },
): MenuItem[] => {
	if (!availableTokens || availableTokens.length === 0) {
		return [
			{
				label: "No tokens available",
			},
		];
	}

	return [
		{
			label: "Untap",
			action: "untap_all",
		},
		{
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
		},
	];
};
export default ContextMenu;
