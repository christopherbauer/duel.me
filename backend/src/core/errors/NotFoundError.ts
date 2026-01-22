import { CustomError } from './CustomError';

/**
 * Intentionally generic
 */
export class NotFoundError extends CustomError {
	statusCode = 404;
	constructor() {
		super('Not found');

		Object.setPrototypeOf(this, NotFoundError.prototype);
	}
	serializeErrors(): { message: string; field?: string | undefined }[] {
		return [
			{
				message: this.message,
			},
		];
	}
}
