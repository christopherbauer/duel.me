import { CardIntepretation, Ability } from './types';

const interpretOracleText = (oracleText: string): CardIntepretation => {
	if (!oracleText || oracleText.trim().length === 0) {
		// Default action for creatures with no oracle text
		return {
			cardName: '',
			abilities: [],
		};
	}

	const abilities: Ability[] = [];
	const lines = oracleText.split('\n').filter((line) => line.trim().length > 0);

	for (const line of lines) {
		const trimmedLine = line.trim();

		// Detect planeswalker abilities (e.g., "0:", "-2:", "+1:", "−9:" - handles both ASCII hyphen and Unicode minus)
		if (trimmedLine.match(/^[+\-−]?\d+:/i)) {
			const loyaltyMatch = trimmedLine.match(/^([+\-−]?\d+):/);
			const loyaltyValue = loyaltyMatch ? loyaltyMatch[1] : '0';
			const abilityText = trimmedLine.substring(trimmedLine.indexOf(':') + 1).trim();

			abilities.push({
				id: `planeswalker-${loyaltyValue}-${abilities.length}`,
				kind: 'activated',
				sourceText: trimmedLine,
				tags: ['planeswalker', `loyalty-${loyaltyValue}`, ...extractTags(abilityText)],
			});
		}
		// Detect triggered abilities (keywords can appear anywhere in the line)
		else if (trimmedLine.match(/(Whenever|At the beginning of|When|Each time)/i)) {
			abilities.push({
				id: `triggered-${abilities.length}`,
				kind: 'triggered',
				sourceText: trimmedLine,
				tags: extractTags(trimmedLine),
			});
		}
		// Detect activated abilities (starts with cost like {T}, {X}, "Pay", "Sacrifice", "Discard", or "Tap")
		else if (trimmedLine.match(/^(\{[^}]+\}|Pay |Sacrifice |Discard |Tap )/i)) {
			abilities.push({
				id: `activated-${abilities.length}`,
				kind: 'activated',
				sourceText: trimmedLine,
				tags: extractTags(trimmedLine),
			});
		}
		// Detect mana abilities (Add mana)
		else if (trimmedLine.match(/^Add /i)) {
			abilities.push({
				id: `mana-${abilities.length}`,
				kind: 'activated',
				sourceText: trimmedLine,
				tags: ['mana'],
			});
		}
		// Detect static abilities (keywords and other abilities)
		else if (
			trimmedLine.match(
				/^(Flying|Deathtouch|Lifelink|Haste|Vigilance|Trample|Indestructible|Hexproof|Protection|Shroud|Ward|Unblockable|Double strike|Menace|Compleated)/i
			)
		) {
			abilities.push({
				id: `static-${abilities.length}`,
				kind: 'static',
				sourceText: trimmedLine,
				tags: [trimmedLine.toLowerCase()],
			});
		}
		// Everything else is a static ability
		else if (trimmedLine.length > 0) {
			abilities.push({
				id: `static-${abilities.length}`,
				kind: 'static',
				sourceText: trimmedLine,
				tags: extractTags(trimmedLine),
			});
		}
	}

	return {
		cardName: '',
		abilities,
	};
};

const extractTags = (text: string): string[] => {
	const tags: string[] = [];

	// Extract mana-related tags
	if (text.match(/mana|add/i)) tags.push('mana');
	if (text.match(/damage/i)) tags.push('damage');
	if (text.match(/lose(\s\d+)*\slife/i)) tags.push('life-loss');
	if (text.match(/draw|search|tutor/i)) tags.push('draw');
	if (text.match(/create.*token/i)) tags.push('token-creation');
	if (text.match(/sacrifice/i)) tags.push('sacrifice');
	if (text.match(/discard/i)) tags.push('discard');
	if (text.match(/mill|graveyard/i)) tags.push('graveyard');
	if (text.match(/battlefield/i)) tags.push('battlefield');
	if (text.match(/return.*from|enter the battlefield/i)) tags.push('etb');
	if (text.match(/cast|spell/i)) tags.push('spell');
	if (text.match(/combat|attack|block/i)) tags.push('combat');
	if (text.match(/creature|creature card/i)) tags.push('creature');
	if (text.match(/pay/i)) tags.push('payment');
	if (text.match(/tap|untap/i)) tags.push('tap');
	if (text.match(/poison|counters?/i)) tags.push('poison');
	if (text.match(/proliferate/i)) tags.push('proliferate');
	if (text.match(/transform|enters? as/i)) tags.push('transform');
	if (text.match(/shuffle/i)) tags.push('shuffle');
	if (text.match(/exile/i)) tags.push('exile');

	return tags;
};

const getPossibleActions = (abilities: Ability[]): string[] => {
	const actions = new Set<string>();

	// Check if this is a planeswalker (has planeswalker abilities)
	const isPlaneswalker = abilities.some((a) => a.tags?.includes('planeswalker'));

	if (!isPlaneswalker) {
		// All creatures can attack
		actions.add('Attack');
	}

	for (const ability of abilities) {
		if (ability.kind === 'activated') {
			if (ability.tags?.includes('planeswalker')) {
				actions.add('Activate Loyalty Ability');
			} else {
				actions.add('Activate Ability');
				if (ability.tags?.includes('mana')) actions.add('Produce Mana');
				if (ability.tags?.includes('tap')) actions.add('Tap');
				if (ability.tags?.includes('shuffle')) actions.add('Shuffle Library');
				if (ability.tags?.includes('exile')) actions.add('Exile Cards');
			}
		}

		if (ability.kind === 'triggered') {
			if (ability.tags?.includes('token-creation')) actions.add('Create Token');
			if (ability.tags?.includes('damage')) actions.add('Deal Damage');
			if (ability.tags?.includes('draw')) actions.add('Draw Cards');
			if (ability.tags?.includes('graveyard')) actions.add('Interact with Graveyard');
			if (ability.tags?.includes('poison')) actions.add('Apply Poison Counters');
			if (ability.tags?.includes('proliferate')) actions.add('Proliferate');
		}

		if (ability.tags?.includes('lifelink')) actions.add('Gain Life');
		if (ability.tags?.includes('combat')) {
			if (ability.tags?.includes('unblockable')) actions.add('Unblock');
		}
		if (ability.tags?.includes('compleated')) actions.add('Pay Life Instead of Mana');
	}

	return Array.from(actions);
};

export { interpretOracleText, getPossibleActions };
