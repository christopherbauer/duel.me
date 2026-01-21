export type ActionMethod = (
	id: string,
	seat: number,
	metadata: any,
) => Promise<void>;
