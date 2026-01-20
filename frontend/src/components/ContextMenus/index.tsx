import { useEffect, useMemo, useState } from "react";

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
}

const typeToMenuItemsMap: (
	objectId?: string,
) => Record<ContextMenuType, MenuItem[]> = (objectId) => ({
	[ContextMenuType.Library]: libraryMenuItems(),
	[ContextMenuType.Hand]: handMenuItems(objectId),
	[ContextMenuType.Graveyard]: graveyardMenuItems(objectId),
	[ContextMenuType.Exile]: exileMenuItems(objectId),
	[ContextMenuType.Battlefield]: battlefieldMenuItems(objectId),
});
interface ContextMenuProps {
	x: number;
	y: number;
	type: "library" | "hand" | "graveyard" | "exile" | "battlefield";
	objectId?: string;
	onClose: () => void;
	executeAction: (action: string, metadata?: any) => void;
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
	const [hoveredItem, setHoveredItem] = useState<string | null>(null);

	useEffect(() => {
		const handleClickOutside = () => onClose();
		window.addEventListener("click", handleClickOutside);
		return () => window.removeEventListener("click", handleClickOutside);
	}, [onClose]);

	const menuItems = useMemo(() => {
		return typeToMenuItemsMap(objectId)[type];
	}, [type, objectId]);

	const handleMenuItemClick = (item: MenuItem) => {
		if (item.action) {
			executeAction(item.action, item.metadata);
			onClose();
		}
	};

	return (
		<div
			style={{
				...styles.contextMenu,
				left: `${x}px`,
				top: `${y}px`,
			}}
		>
			{menuItems.map((item) => (
				<div
					key={item.label}
					onMouseEnter={() => {
						item.submenu && setHoveredSubmenu(item.label);
						setHoveredItem(item.label);
					}}
					onMouseLeave={() => {
						setHoveredSubmenu(null);
						setHoveredItem(null);
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
						<div style={styles.submenu}>
							{item.submenu.map((subitem) => (
								<div
									key={subitem.label}
									style={{
										...styles.contextMenuItem,
										borderBottom:
											subitem ===
											item.submenu![
												item.submenu!.length - 1
											]
												? "none"
												: "1px solid #444",
									}}
									onClick={() => {
										handleMenuItemClick(subitem);
									}}
									onMouseEnter={(e) => {
										(
											e.currentTarget as HTMLElement
										).style.backgroundColor = "#444";
									}}
									onMouseLeave={(e) => {
										(
											e.currentTarget as HTMLElement
										).style.backgroundColor = "transparent";
									}}
								>
									{subitem.label}
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
		":hover": {
			backgroundColor: "#444",
		},
	},
	submenu: {
		position: "absolute" as const,
		left: "100%",
		top: 0,
		marginLeft: "4px",
		backgroundColor: "#2a2a2a",
		border: "1px solid #555",
		borderRadius: "4px",
		minWidth: "120px",
		zIndex: 2001,
		boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
		overflow: "hidden" as const,
	},
	submenuArrow: {
		fontSize: "14px",
		color: "#888",
		marginLeft: "8px",
	},
};
const libraryMenuItems = (): MenuItem[] => [
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
		action: "return_to_hand",
		metadata: { objectId },
	},
	{
		label: "Return to Library",
		action: "return_to_library",
		metadata: { objectId },
	},
];
const exileMenuItems = (objectId?: string): MenuItem[] => [
	{
		label: "Return to Hand",
		action: "return_to_hand",
		metadata: { objectId },
	},
];
const battlefieldMenuItems = (objectId?: string): MenuItem[] => [
	{
		label: "Tap/Untap",
		action: "toggle_tap",
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
export default ContextMenu;
