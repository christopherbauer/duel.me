import { Request, Response, NextFunction } from "express";
import { CustomError } from "../errors";
import logger from "../logger";
export const errorHandler = (
	err: Error,
	_request: Request,
	response: Response,
	_next: NextFunction,
) => {
	logger.error(JSON.stringify(err.stack));
	if (err instanceof CustomError) {
		response.status(err.statusCode).send({ errors: err.serializeErrors() });
	} else {
		response.status(400).send({
			errors: [{ message: "Something went wrong" }],
		});
	}
};
