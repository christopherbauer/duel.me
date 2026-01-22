import { AllPart } from '../seed/types';

export interface AllPartsQueryResult {
	all_parts: AllPart[];
}
export interface IndicatorQueryResult {
	id: string;
	game_session_id: string;
	seat: 1 | 2;
	position: { x: number; y: number };
	color: string;
}
