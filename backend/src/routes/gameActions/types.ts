export type ActionMethod<T = any> = (gameId: string, seat: number, metadata: T) => Promise<void>;
