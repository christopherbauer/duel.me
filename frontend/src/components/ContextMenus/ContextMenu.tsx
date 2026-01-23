import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useGameStore, Card } from '../../store';
import { ActionMethod } from '../../types';
import { ContextMenuType, MenuItem } from './types';
import {
	libraryMenuItems,
	handMenuItems,
	exileMenuItems,
	commandZoneMenuItems,
	battlefieldMenuItems,
	graveyardMenuItems,
} from './MenuItems';

// Custom hook for managing submenu timeout behavior
const useSubmenuTimeout = () => {
	const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

	const set = useCallback((callback: () => void, delay: number = 150) => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}
		timeoutRef.current = setTimeout(callback, delay);
	}, []);

	const clear = useCallback(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
	}, []);

	return { set, clear };
};

const typeToMenuItemsMap: (
	objectId?: string,
	availableTokens?: Card[],
	availableComponents?: Card[],
	position?: { x: number; y: number }
) => Record<ContextMenuType, MenuItem[]> = (objectId, availableTokens = [], availableComponents = [], position) => ({
	[ContextMenuType.Library]: libraryMenuItems(),
	[ContextMenuType.Hand]: handMenuItems(objectId),
	[ContextMenuType.Graveyard]: graveyardMenuItems(objectId),
	[ContextMenuType.Exile]: exileMenuItems(objectId),
	[ContextMenuType.CommandZone]: commandZoneMenuItems(objectId),
	[ContextMenuType.Battlefield]: objectId
		? battlefieldMenuItems(objectId)
		: backgroundTokenMenuItems(availableTokens, availableComponents, position),
});
interface ContextMenuProps {
	x: number;
	y: number;
	type: 'library' | 'hand' | 'graveyard' | 'exile' | 'command_zone' | 'battlefield';
	objectId?: string;
	onClose: () => void;
	executeAction: ActionMethod;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, type, objectId, onClose, executeAction }) => {
	const [hoveredSubmenu, setHoveredSubmenu] = useState<string | null>(null);
	const [hoveredItem, setHoveredItem] = useState<string | null>(null);
	const { set: setMenuTimeout, clear: clearMenuTimeout } = useSubmenuTimeout();

	useEffect(() => {
		const handleClickOutside = () => onClose();
		window.addEventListener('click', handleClickOutside);
		return () => {
			window.removeEventListener('click', handleClickOutside);
			clearMenuTimeout();
		};
	}, [onClose, clearMenuTimeout]);

	const { availableTokens, availableComponents } = useGameStore();

	const menuItems = useMemo(() => {
		return typeToMenuItemsMap(objectId, availableTokens, availableComponents, { x, y })[type];
	}, [type, objectId, availableTokens, availableComponents, x, y]);

	const handleMenuItemClick = (item: MenuItem) => {
		if (item.action) {
			executeAction(item.action, undefined, item.metadata);
			onClose();
		}
	};

	const handleMouseEnter = (label: string, hasSubmenu: boolean) => {
		clearMenuTimeout();
		setHoveredItem(label);
		if (hasSubmenu) {
			setHoveredSubmenu(label);
		}
	};

	const handleMouseLeave = () => {
		setMenuTimeout(() => {
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
				clearMenuTimeout();
			}}
		>
			{menuItems.map((item, idx) => {
				if (item.isCounterSection && item.counterItems) {
					return (
						<div key={item.label}>
							<div style={styles.sectionHeader}>{item.label}</div>
							{item.counterItems.length === 0 || item.counterItems.every((c) => c.count === 0) ? (
								<div style={styles.counterItemEmpty}>No counters</div>
							) : (
								item.counterItems
									.filter((c) => c.count > 0)
									.map((counter) => (
										<div key={counter.type} style={styles.counterItem}>
											<span style={styles.counterLabel}>
												{counter.label}: {counter.count}
											</span>
											<div style={styles.counterButtons}>
												<button
													style={styles.counterButton}
													onClick={(e) => {
														e.stopPropagation();
														executeAction('add_counter', undefined, {
															objectId,
															counterType: counter.type,
														});
													}}
												>
													+
												</button>
												<button
													style={styles.counterButton}
													onClick={(e) => {
														e.stopPropagation();
														executeAction('remove_counter', undefined, {
															objectId,
															counterType: counter.type,
														});
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
						onMouseEnter={() => handleMouseEnter(item.label, !!item.submenu)}
						onMouseLeave={() => {
							if (!item.submenu) {
								handleMouseLeave();
							}
						}}
					>
						<div
							style={{
								...styles.contextMenuItem,
								backgroundColor: hoveredItem === item.label ? '#444' : 'transparent',
								paddingRight: item.submenu ? '20px' : '12px',
							}}
							onClick={() => handleMenuItemClick(item)}
						>
							{item.label}
							{item.submenu && <span style={styles.submenuArrow}>›</span>}
						</div>

						{item.submenu && hoveredSubmenu === item.label && (
							<Submenu item={item as RequiredProperties<MenuItem, 'submenu'>} type={type} onMenuItemClick={handleMenuItemClick} />
						)}
					</div>
				);
			})}
		</div>
	);
};
type RequiredProperties<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
type SubmenuProps = Omit<ContextMenuProps, 'onClose' | 'executeAction' | 'x' | 'y'> & {
	item: MenuItem;
	onMenuItemClick: (item: MenuItem) => void;
};
const Submenu = ({ item, type, onMenuItemClick }: SubmenuProps) => {
	const [submenuSearches, setSubmenuSearches] = useState<Record<string, string>>({});
	const { set: setSubmenuTimeout, clear: clearSubmenuTimeout } = useSubmenuTimeout();
	const [hoveredSubitem, setHoveredSubitem] = useState<MenuItem | null>(null);
	const [quantityInput, setQuantityInput] = useState<{
		value: string;
		action: string;
		metadata: any;
	} | null>(null);

	return (
		<div
			style={{ ...styles.submenu }}
			data-submenu="true"
			onMouseLeave={() => {
				setSubmenuTimeout(() => {
					setHoveredSubitem(null);
				});
			}}
			onMouseEnter={() => {
				clearSubmenuTimeout();
			}}
		>
			<input
				type="text"
				placeholder="Search..."
				value={submenuSearches[item.label] || ''}
				onChange={(e) => {
					setSubmenuSearches({
						...submenuSearches,
						[item.label]: e.target.value,
					});
				}}
				onClick={(e) => e.stopPropagation()}
				style={{
					width: '100%',
					padding: '6px 8px',
					borderBottom: '1px solid #555',
					backgroundColor: '#1a1a1a',
					color: '#fff',
					border: 'none',
					fontSize: '12px',
					boxSizing: 'border-box',
				}}
			/>
			<div style={styles.subMenuScrollContainer}>
				{item.submenu
					?.filter((subitem) => subitem.label.toLowerCase().includes((submenuSearches[item.label] || '').toLowerCase()))
					.map((subitem, idx, arr) => {
						// Check if this is a quantity-based submenu (items labeled 1, 2, 3, 4)
						const isQuantityMenu = ['1', '2', '3', '4'].includes(subitem.label);
						const isLastQuantityItem = isQuantityMenu && idx === arr.length - 1;
						const shouldAddCustom = isLastQuantityItem && subitem.action === 'create_token_copy';

						return (
							<div key={subitem.label}>
								{/* Regular submenu item or quantity input */}
								{quantityInput && quantityInput.action === subitem.action && quantityInput.metadata === subitem.metadata ? (
									<div
										style={{
											...styles.contextMenuItem,
											display: 'flex',
											alignItems: 'center',
											gap: '8px',
										}}
										onClick={(e) => e.stopPropagation()}
									>
										<span>+</span>
										<input
											type="number"
											min="1"
											value={quantityInput.value}
											onChange={(e) => {
												setQuantityInput({
													...quantityInput,
													value: e.target.value,
												});
											}}
											onKeyDown={(e) => {
												if (e.key === 'Enter') {
													const qty = parseInt(quantityInput.value) || 1;
													if (qty > 0) {
														onMenuItemClick({
															...subitem,
															metadata: {
																...quantityInput.metadata,
																quantity: qty,
															},
														});
														setQuantityInput(null);
													}
												} else if (e.key === 'Escape') {
													setQuantityInput(null);
												}
											}}
											autoFocus
											style={{
												width: '40px',
												padding: '4px 6px',
												backgroundColor: '#333',
												color: '#fff',
												border: '1px solid #666',
												borderRadius: '2px',
												fontSize: '12px',
											}}
										/>
									</div>
								) : (
									<div
										style={{
											position: 'relative' as const,
										}}
										onMouseEnter={() => {
											clearSubmenuTimeout();
											if (subitem.submenu) {
												setHoveredSubitem(subitem);
											}
										}}
										onMouseLeave={(e) => {
											const relatedTarget = e.relatedTarget as HTMLElement;
											if (relatedTarget && (relatedTarget.closest('[data-submenu]') || relatedTarget.closest('[data-submenu-item]'))) {
												return;
											}
											setSubmenuTimeout(() => {
												setHoveredSubitem(null);
											});
										}}
									>
										<div
											style={{
												...styles.contextMenuItem,
												borderBottom: idx === arr.length - 1 ? 'none' : '1px solid #444',
												paddingRight: subitem.submenu ? '20px' : '12px',
											}}
											data-submenu-item="true"
											onClick={(e) => {
												e.stopPropagation();
												if (shouldAddCustom && subitem.action) {
													setQuantityInput({
														value: '',
														action: subitem.action,
														metadata: subitem.metadata,
													});
												} else {
													onMenuItemClick(subitem);
												}
											}}
											onMouseEnter={(e) => {
												(e.currentTarget as HTMLElement).style.backgroundColor = '#444';
											}}
											onMouseLeave={(e) => {
												(e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
											}}
										>
											{subitem.label}
											{subitem.submenu && <span style={styles.submenuArrow}>›</span>}
										</div>
										{/* Third-level submenu */}
										{subitem.submenu && hoveredSubitem === subitem && (
											<Submenu item={subitem} type={type} onMenuItemClick={onMenuItemClick} />
										)}
									</div>
								)}

								{/* Add custom quantity option after last quantity item */}
								{shouldAddCustom && (
									<div
										style={{
											position: 'relative' as const,
										}}
									>
										<div
											style={{
												...styles.contextMenuItem,
												borderBottom: 'none',
											}}
											data-submenu-item="true"
											onClick={(e) => {
												e.stopPropagation();
												if (subitem.action) {
													setQuantityInput({
														value: '',
														action: subitem.action,
														metadata: subitem.metadata,
													});
												}
											}}
											onMouseEnter={(e) => {
												(e.currentTarget as HTMLElement).style.backgroundColor = '#444';
											}}
											onMouseLeave={(e) => {
												(e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
											}}
										>
											{subitem.action === 'create_token_copy' ? 'Create X' : 'Custom'}
										</div>
									</div>
								)}
							</div>
						);
					})}
			</div>
			{hoveredSubitem && hoveredSubitem.submenu && <Submenu item={hoveredSubitem} type={type} onMenuItemClick={onMenuItemClick} />}
		</div>
	);
};
const styles = {
	contextMenu: {
		position: 'fixed' as const,
		backgroundColor: '#2a2a2a',
		border: '1px solid #555',
		borderRadius: '4px',
		zIndex: 2000,
		minWidth: '200px',
		boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
	},
	contextMenuItems: {},
	contextMenuItem: {
		padding: '8px 12px',
		cursor: 'pointer',
		borderBottom: '1px solid #444',
		fontSize: '12px',
		transition: 'background-color 0.2s',
		position: 'relative' as const,
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',
		userSelect: 'none' as const,
	},
	submenu: {
		position: 'absolute' as const,
		left: '100%',
		height: '600px',
		top: 0,
		marginLeft: '0',
		backgroundColor: '#2a2a2a',
		border: '1px solid #555',
		borderRadius: '4px',
		minWidth: '400px',
		zIndex: 2001,
		boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
		overflow: 'visible' as const,
	},
	submenuArrow: {
		fontSize: '14px',
		color: '#888',
		marginLeft: '8px',
	},
	subMenuScrollContainer: {
		maxHeight: '600px',
		overflowY: 'scroll' as const,
	},
	sectionHeader: {
		padding: '6px 12px',
		fontSize: '11px',
		color: '#999',
		textTransform: 'uppercase' as const,
		fontWeight: 'bold' as const,
		letterSpacing: '0.5px',
		borderBottom: '1px solid #444',
	},
	counterItem: {
		display: 'flex' as const,
		justifyContent: 'space-between' as const,
		alignItems: 'center' as const,
		padding: '6px 12px',
		fontSize: '12px',
		borderBottom: '1px solid #444',
	},
	counterItemEmpty: {
		padding: '6px 12px',
		fontSize: '12px',
		color: '#666',
		fontStyle: 'italic' as const,
	},
	counterLabel: {
		color: '#fff',
	},
	counterButtons: {
		display: 'flex' as const,
		gap: '4px',
	},
	counterButton: {
		backgroundColor: '#0066ff',
		color: '#fff',
		border: 'none',
		borderRadius: '3px',
		padding: '2px 6px',
		cursor: 'pointer',
		fontSize: '10px',
		fontWeight: 'bold' as const,
		transition: 'background-color 0.2s',
	},
};

const backgroundTokenMenuItems = (
	availableTokens: Card[],
	availableComponents: Card[],
	position?: { x: number; y: number }
): MenuItem[] => {
	const items: MenuItem[] = [];

	items.push({
		label: 'Untap',
		action: 'untap_all',
	});

	items.push({
		label: 'Add Indicator',
		submenu: [
			{
				label: 'Red',
				action: 'create_indicator',
				metadata: { position: position || { x: 0, y: 0 }, color: 'red' },
			},
			{
				label: 'Blue',
				action: 'create_indicator',
				metadata: { position: position || { x: 0, y: 0 }, color: 'blue' },
			},
			{
				label: 'Green',
				action: 'create_indicator',
				metadata: { position: position || { x: 0, y: 0 }, color: 'green' },
			},
			{
				label: 'Yellow',
				action: 'create_indicator',
				metadata: { position: position || { x: 0, y: 0 }, color: 'yellow' },
			},
			{
				label: 'White',
				action: 'create_indicator',
				metadata: { position: position || { x: 0, y: 0 }, color: 'white' },
			},
			{
				label: 'Black',
				action: 'create_indicator',
				metadata: { position: position || { x: 0, y: 0 }, color: 'black' },
			},
		],
	});

	if (availableTokens && availableTokens.length > 0) {
		items.push({
			label: 'Create Token',
			submenu: availableTokens.map((token) => {
				const displayLabel =
					token.power && token.toughness
						? [`${token.name} - ${token.power}/${token.toughness}`, token.oracle_text.length > 0 ? token.oracle_text : undefined]
								.filter(Boolean)
								.join(' - ')
						: token.name;

				return {
					label: displayLabel,
					submenu: [
						{
							label: '1',
							action: 'create_token_copy',
							metadata: {
								tokenCardId: token.id,
								quantity: 1,
								position,
							},
						},
						{
							label: '2',
							action: 'create_token_copy',
							metadata: {
								tokenCardId: token.id,
								quantity: 2,
								position,
							},
						},
						{
							label: '3',
							action: 'create_token_copy',
							metadata: {
								tokenCardId: token.id,
								quantity: 3,
								position,
							},
						},
						{
							label: '4',
							action: 'create_token_copy',
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
			label: 'Create Component',
			submenu: availableComponents.map((component) => {
				const displayLabel =
					component.power && component.toughness ? `${component.name} - ${component.power}/${component.toughness}` : component.name;

				return {
					label: displayLabel,
					submenu: [
						{
							label: '1',
							action: 'create_token_copy',
							metadata: {
								tokenCardId: component.id,
								quantity: 1,
								position,
							},
						},
						{
							label: '2',
							action: 'create_token_copy',
							metadata: {
								tokenCardId: component.id,
								quantity: 2,
								position,
							},
						},
						{
							label: '3',
							action: 'create_token_copy',
							metadata: {
								tokenCardId: component.id,
								quantity: 3,
								position,
							},
						},
						{
							label: '4',
							action: 'create_token_copy',
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
				label: 'No tokens or components available',
			},
		];
	}

	return items;
};
export default ContextMenu;
