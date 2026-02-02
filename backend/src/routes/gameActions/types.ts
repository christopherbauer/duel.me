export type ActionSideEffect = Promise<void | Function>;
export type ActionMethod<T = any> = (gameId: string, seat: number, metadata: T) => ActionSideEffect;
