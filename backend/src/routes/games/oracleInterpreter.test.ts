import { interpretOracleText } from './oracleInterpreter';

describe('Oracle Text Interpreter', () => {
	describe('Basic Creatures', () => {
		test('1/1 creature with no oracle text should have Attack action', () => {
			const result = interpretOracleText('');
			expect(result.abilities.length).toBe(0);
		});

		test('Creature with flying should detect static ability', () => {
			const result = interpretOracleText('Flying');
			expect(result.abilities.length).toBe(1);
			expect(result.abilities[0].kind).toBe('static');
			expect(result.abilities[0].tags).toContain('flying');
		});
	});

	describe('Mana Vault', () => {
		test('Mana Vault abilities should be correctly identified', () => {
			const oracleText = `This artifact doesn't untap during your untap step.
At the beginning of your upkeep, you may pay {4}. If you do, untap this artifact.
At the beginning of your draw step, if this artifact is tapped, it deals 1 damage to you.
{T}: Add {C}{C}{C}.`;

			const result = interpretOracleText(oracleText);

			expect(result.abilities.length).toBe(4);

			// First ability: static
			expect(result.abilities[0].kind).toBe('static');
			expect(result.abilities[0].tags).toContain('tap');

			// Second ability: triggered
			expect(result.abilities[1].kind).toBe('triggered');
			expect(result.abilities[1].tags).toContain('payment');

			// Third ability: triggered
			expect(result.abilities[2].kind).toBe('triggered');
			expect(result.abilities[2].tags).toContain('damage');
			expect(result.abilities[2].tags).toContain('tap');

			// Fourth ability: activated (mana)
			expect(result.abilities[3].kind).toBe('activated');
			expect(result.abilities[3].tags).toContain('mana');
		});
	});

	describe('Third-Path Iconoclast', () => {
		test('Third-Path Iconoclast should detect token creation trigger', () => {
			const oracleText = 'Whenever you cast a noncreature spell, create a 1/1 colorless Soldier artifact creature token.';

			const result = interpretOracleText(oracleText);

			expect(result.abilities.length).toBe(1);
			expect(result.abilities[0].kind).toBe('triggered');
			expect(result.abilities[0].tags).toContain('spell');
			expect(result.abilities[0].tags).toContain('token-creation');
		});
	});

	describe('Sefris of the Hidden Ways', () => {
		test('Sefris should detect multiple triggered abilities', () => {
			const oracleText = `Whenever one or more creature cards are put into your graveyard from anywhere, venture into the dungeon. This ability triggers only once each turn.
Create Undead — Whenever you complete a dungeon, return target creature card from your graveyard to the battlefield.`;

			const result = interpretOracleText(oracleText);

			expect(result.abilities.length).toBe(2);

			// First ability: graveyard trigger
			expect(result.abilities[0].kind).toBe('triggered');
			expect(result.abilities[0].tags).toContain('graveyard');
			expect(result.abilities[0].tags).toContain('creature');

			// Second ability: dungeon trigger
			expect(result.abilities[1].kind).toBe('triggered');
			expect(result.abilities[1].tags).toContain('graveyard');
		});
	});

	describe("Hashaton, Scarab's Fist", () => {
		test('Hashaton should detect discard trigger and conditional token creation', () => {
			const oracleText = `Whenever you discard a creature card, you may pay {2}{U}. If you do, create a tapped token that's a copy of that card, except it's a 4/4 black Zombie.`;

			const result = interpretOracleText(oracleText);

			expect(result.abilities.length).toBe(1);
			expect(result.abilities[0].kind).toBe('triggered');
			expect(result.abilities[0].tags).toContain('discard');
			expect(result.abilities[0].tags).toContain('creature');
			expect(result.abilities[0].tags).toContain('token-creation');
			expect(result.abilities[0].tags).toContain('payment');
		});
	});

	describe('Jodah, Archmage Eternal', () => {
		test('Jodah should detect flying and casting ability', () => {
			const oracleText = `Flying
You may pay {W}{U}{B}{R}{G} rather than pay the mana cost for spells you cast.`;

			const result = interpretOracleText(oracleText);

			expect(result.abilities.length).toBe(2);

			// Flying
			expect(result.abilities[0].kind).toBe('static');
			expect(result.abilities[0].tags).toContain('flying');

			// Casting alternative cost
			expect(result.abilities[1].kind).toBe('static');
			expect(result.abilities[1].tags).toContain('spell');
			expect(result.abilities[1].tags).toContain('payment');
		});
	});

	describe("Vraska, Betrayer's Sting (Planeswalker)", () => {
		test('Vraska should detect planeswalker abilities with loyalty costs', () => {
			const oracleText = `Compleated ({B/P} can be paid with {B} or 2 life. If life was paid, this planeswalker enters with two fewer loyalty counters.)
0: You draw a card and lose 1 life. Proliferate.
−2: Target creature becomes a Treasure artifact with "{T}, Sacrifice this artifact: Add one mana of any color" and loses all other card types and abilities.
−9: If target player has fewer than nine poison counters, they get a number of poison counters equal to the difference.`;

			const result = interpretOracleText(oracleText);

			expect(result.abilities.length).toBe(4);

			// Compleated ability
			expect(result.abilities[0].kind).toBe('static');
			expect(result.abilities[0].tags?.[0]).toContain('compleated');

			// 0 loyalty ability
			expect(result.abilities[1].kind).toBe('activated');
			expect(result.abilities[1].tags).toContain('planeswalker');
			expect(result.abilities[1].tags).toContain('loyalty-0');
			expect(result.abilities[1].tags).toContain('draw');
			expect(result.abilities[1].tags).toContain('life-loss');
			expect(result.abilities[1].tags).toContain('proliferate');

			// -2 loyalty ability
			expect(result.abilities[2].kind).toBe('activated');
			expect(result.abilities[2].tags).toContain('planeswalker');
			expect(result.abilities[2].tags).toContain('loyalty-−2');

			// -9 loyalty ability
			expect(result.abilities[3].kind).toBe('activated');
			expect(result.abilities[3].tags).toContain('planeswalker');
			expect(result.abilities[3].tags).toContain('loyalty-−9');
			expect(result.abilities[3].tags).toContain('poison');
		});
	});

	describe('Urza, High Lord Artificer', () => {
		test('Urza should detect ETB token creation, tap ability, and shuffle/exile', () => {
			const oracleText = `When Urza enters, create a 0/0 colorless Construct artifact creature token with "This token gets +1/+1 for each artifact you control."
Tap an untapped artifact you control: Add {U}.
{5}: Shuffle your library, then exile the top card. Until end of turn, you may play that card without paying its mana cost.`;

			const result = interpretOracleText(oracleText);

			expect(result.abilities.length).toBe(3);

			// ETB ability
			expect(result.abilities[0].kind).toBe('triggered');
			expect(result.abilities[0].tags).toContain('token-creation');

			// Tap ability
			expect(result.abilities[1].kind).toBe('activated');
			expect(result.abilities[1].tags).toContain('tap');
			expect(result.abilities[1].tags).toContain('mana');

			// Shuffle/exile ability
			expect(result.abilities[2].kind).toBe('activated');
			expect(result.abilities[2].tags).toContain('shuffle');
			expect(result.abilities[2].tags).toContain('exile');
			expect(result.abilities[2].tags).toContain('payment');
		});
	});

	describe('Action Generation', () => {
		test('Creature with no abilities should only have Attack action', () => {
			const result = interpretOracleText('');
			const actions = getActionsFromAbilities(result.abilities);

			expect(actions).toContain('Attack');
			expect(actions.length).toBe(1);
		});

		test('Creature with activated mana ability should have Produce Mana action', () => {
			const oracleText = '{T}: Add {U}.';
			const result = interpretOracleText(oracleText);
			const actions = getActionsFromAbilities(result.abilities);

			expect(actions).toContain('Attack');
			expect(actions).toContain('Activate Ability');
			expect(actions).toContain('Produce Mana');
		});

		test('Planeswalker should have Activate Loyalty Ability instead of Attack', () => {
			const oracleText = '+1: Draw a card.';
			const result = interpretOracleText(oracleText);
			const actions = getActionsFromAbilities(result.abilities);

			expect(actions).toContain('Activate Loyalty Ability');
			expect(actions).not.toContain('Attack');
		});

		test('Card with token creation trigger should have Create Token action', () => {
			const oracleText = 'Whenever you cast a spell, create a 1/1 token.';
			const result = interpretOracleText(oracleText);
			const actions = getActionsFromAbilities(result.abilities);

			expect(actions).toContain('Create Token');
		});

		test('Card with shuffle and exile should have appropriate actions', () => {
			const oracleText = '{3}: Shuffle your library, then exile the top card.';
			const result = interpretOracleText(oracleText);
			const actions = getActionsFromAbilities(result.abilities);

			expect(actions).toContain('Shuffle Library');
			expect(actions).toContain('Exile Cards');
		});
	});
});

// Helper function to get actions from abilities
const getActionsFromAbilities = (abilities: any[]): string[] => {
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
