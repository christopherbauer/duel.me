import { useEffect, useMemo } from "react";

enum ContextMenuType {
	Library = "library",
	Hand = "hand",
	Graveyard = "graveyard",
	Exile = "exile",
	Battlefield = "battlefield",
}
const typeToMenuItemsMap: (
	objectId?: string,
) => Record<
	ContextMenuType,
	Array<{ label: string; action: string; metadata?: any }>
> = (objectId) => ({
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
	useEffect(() => {
		const handleClickOutside = () => onClose();
		window.addEventListener("click", handleClickOutside);
		return () => window.removeEventListener("click", handleClickOutside);
	}, [onClose]);

	const menuItems = useMemo(() => {
		return typeToMenuItemsMap(objectId)[type];
	}, [type, objectId]);

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
					style={styles.contextMenuItem}
					onClick={() => {
						executeAction(item.action, item.metadata);
						onClose();
					}}
				>
					{item.label}
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
	},
	contextMenuItem: {
		padding: "8px 12px",
		cursor: "pointer",
		borderBottom: "1px solid #444",
		fontSize: "12px",
		transition: "background-color 0.2s",
	},
};
const libraryMenuItems = () => [
	{ label: "Shuffle Library", action: "shuffle_library" },
	{ label: "Draw 1", action: "draw", metadata: { count: 1 } },
	{ label: "Draw 2", action: "draw", metadata: { count: 2 } },
	{ label: "Scry 1", action: "scry", metadata: { count: 1 } },
	{
		label: "Exile 1",
		action: "exile_from_top",
		metadata: { count: 1 },
	},
];
const handMenuItems = (objectId?: string) => [
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
const graveyardMenuItems = (objectId?: string) => [
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
const exileMenuItems = (objectId?: string) => [
	{
		label: "Return to Hand",
		action: "return_to_hand",
		metadata: { objectId },
	},
];
const battlefieldMenuItems = (objectId?: string) => [
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
