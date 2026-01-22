export interface BulkDataResponse {
	object: string;
	has_more: boolean;
	data: Datum[];
}

export interface Datum {
	object: string;
	id: string;
	type: BulkDataResponseType;
	updated_at: Date;
	uri: string;
	name: string;
	description: string;
	size: number;
	download_uri: string;
	content_type: string;
	content_encoding: string;
}
export type BulkDataResponseType = 'oracle_cards' | 'unique_artwork' | 'default_cards' | 'all_cards' | 'rulings';
export interface ScryfallCard {
	object: string;
	id: string;
	oracle_id: string;
	multiverse_ids: number[];
	mtgo_id: number;
	tcgplayer_id: number;
	cardmarket_id: number;
	name: string;
	lang: string;
	released_at: Date;
	uri: string;
	scryfall_uri: string;
	layout: string;
	highres_image: boolean;
	image_status: string;
	image_uris: ImageUris;
	mana_cost: string;
	cmc: number;
	type_line: string;
	oracle_text: string;
	power: string;
	toughness: string;
	colors: string[];
	color_identity: string[];
	keywords: string[];
	all_parts: AllPart[];
	legalities: Legalities;
	games: string[];
	reserved: boolean;
	game_changer: boolean;
	foil: boolean;
	nonfoil: boolean;
	finishes: string[];
	oversized: boolean;
	promo: boolean;
	reprint: boolean;
	variation: boolean;
	set_id: string;
	set: string;
	set_name: string;
	set_type: string;
	set_uri: string;
	set_search_uri: string;
	scryfall_set_uri: string;
	rulings_uri: string;
	prints_search_uri: string;
	collector_number: string;
	digital: boolean;
	rarity: string;
	watermark: string;
	flavor_text: string;
	card_back_id: string;
	artist: string;
	artist_ids: string[];
	illustration_id: string;
	border_color: string;
	frame: string;
	frame_effects: string[];
	security_stamp: string;
	full_art: boolean;
	textless: boolean;
	booster: boolean;
	story_spotlight: boolean;
	edhrec_rank: number;
	preview: Preview;
	prices: Prices;
	related_uris: RelatedUris;
	purchase_uris: PurchaseUris;
}
export interface BulkCardResponse extends Array<ScryfallCard> {}

export interface AllPart {
	object: string;
	id: string;
	component: string;
	name: string;
	type_line: string;
	uri: string;
}

export interface ImageUris {
	small: string;
	normal: string;
	large: string;
	png: string;
	art_crop: string;
	border_crop: string;
}

export interface Legalities {
	standard: string;
	future: string;
	historic: string;
	timeless: string;
	gladiator: string;
	pioneer: string;
	modern: string;
	legacy: string;
	pauper: string;
	vintage: string;
	penny: string;
	commander: string;
	oathbreaker: string;
	standardbrawl: string;
	brawl: string;
	alchemy: string;
	paupercommander: string;
	duel: string;
	oldschool: string;
	premodern: string;
	predh: string;
}

export interface Preview {
	source: string;
	source_uri: string;
	previewed_at: Date;
}

export interface Prices {
	usd: string;
	usd_foil: null;
	usd_etched: null;
	eur: string;
	eur_foil: null;
	tix: string;
}

export interface PurchaseUris {
	tcgplayer: string;
	cardmarket: string;
	cardhoarder: string;
}

export interface RelatedUris {
	gatherer: string;
	tcgplayer_infinite_articles: string;
	tcgplayer_infinite_decks: string;
	edhrec: string;
}

export interface AppCard extends ScryfallCard {}
