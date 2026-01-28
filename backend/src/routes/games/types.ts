export interface CardIntepretation {
	cardName: string;
	abilities: Ability[];
}

export interface Ability {
	id: string;
	kind: 'triggered' | 'activated' | 'static' | 'replacementLike';
	sourceText: string;
	modifier?: Modifier;
	subscription?: Subscription;
	choices?: Choice[];
	conditions?: Condition[];
	effects?: Effect[];
	notes?: string[];
	activation?: Activation;
	tags?: string[];
}

export interface Activation {
	timing: string;
	costs: CostElement[];
}

export interface CostElement {
	type: string;
	target: string;
}

export interface Choice {
	type: string;
	cost: ManaCost;
	ifPaidEffects: CostElement[];
}

export interface ManaCost {
	type: string;
	mana: string;
}

export interface Condition {
	type: string;
	object: string;
	predicate: string;
	equals: boolean;
}

export interface Effect {
	type: string;
	source?: string;
	to: string;
	amount?: number;
	mana?: string;
}

export interface Modifier {
	type: string;
	hook: Subscription;
	appliesTo: string;
	operation: Operation;
}

export interface Subscription {
	event: string;
	step: string;
	player: string;
}

export interface Operation {
	type: string;
	what: string;
}
