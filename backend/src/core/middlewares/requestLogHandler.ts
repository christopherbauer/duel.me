import { NextFunction, Request, RequestHandler, Response } from "express";
import * as core from "express-serve-static-core";
import logger from "../logger";
import { obfuscatePassword } from "../helpers";

export const requestLogHandler: RequestHandler<
	core.ParamsDictionary,
	any,
	any,
	core.Query
> = (request: Request, response: Response, next: NextFunction) => {
	let { method, path } = request;

	logger.info(`BEGIN REQUEST: ${method} ${path}`);
	var loggerData = JSON.parse(
		JSON.stringify({
			method: request.method,
			path: request.path,
			body: request.body,
			headers: request.headers,
			ip: request.connection.remoteAddress,
		}),
	);
	var obfuscated = obfuscatePassword(loggerData);
	logger.debug(JSON.stringify(obfuscated));

	next();
};
