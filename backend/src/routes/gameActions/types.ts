export type ActionMethod = (
	id: string, // Object Id
	seat: number,
	metadata: any,
) => Promise<void>;
