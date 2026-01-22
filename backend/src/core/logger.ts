import winston, { format } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const winstonLogger = winston.createLogger({
	format: winston.format.combine(
		format.errors({ stack: true }),
		format.timestamp({
			format: 'YYYY-MM-DD HH:mm:ss+ms',
		}),
		format.json()
	),
});
/**
 * This sets up a logger that automatically rotates based on the date, a max size, and has max of 30d of files
 */
const fileLog = new DailyRotateFile({
	createSymlink: true,
	filename: 'log-%DATE%.log',
	dirname: 'logs',
	datePattern: 'YYYY-MM-DD',
	zippedArchive: true,
	maxSize: '20m',
	maxFiles: '30d',
});
winstonLogger.add(fileLog);

const errorLog = new DailyRotateFile({
	createSymlink: true,
	frequency: '1h',
	filename: 'error-%DATE%.log',
	dirname: 'logs',
	zippedArchive: true,
	datePattern: 'YYYY-MM-DD-HH',
	maxSize: '20m',
	maxFiles: '30d',
	level: 'error',
});
winstonLogger.add(errorLog);

const consoleLog = new winston.transports.Console({
	level: process.env.LOG_LEVEL || 'debug',
});
winstonLogger.add(consoleLog);

type LogOptions = string | JSON | Object | Error;
type LogMessage = (message: LogOptions) => void;
/**
 * Winston does not nicely log Error objects (the resulting entry is empty). This method handles that translation
 * @param message Error or regular LogMessage
 */
const winstonDecorator = (log: winston.LeveledLogMethod) => (msg: LogOptions) => {
	if (typeof msg === 'string') {
		log(msg);
	} else if (msg instanceof Error) {
		const { message, stack, name } = msg;
		log({ message, stack, name });
	} else {
		log(JSON.stringify(msg));
	}
};
/**
 * This is a defined interface for logging that closely resembles the winston logging methods. It is unlikely we will want the
 * interface itself to change (ie calling static logger.info/error/debug/etc methods) but we may want to be able
 * to swap out winston should we decide we want a different framework. With this we will
 * not depend on exposed details of the winston interface when using our logger elsewhere in the application,
 * and if we swap it out in the future it will be as simple as calling the underlying logger via the static method
 * declarations
 */
class logger {
	static info: LogMessage = winstonDecorator(winstonLogger.info);
	static error: LogMessage = winstonDecorator(winstonLogger.error);
	static debug: LogMessage = winstonDecorator(winstonLogger.debug);
	static warn: LogMessage = winstonDecorator(winstonLogger.warn);
	static catchError: (error: unknown) => void = (error) => {
		if (error instanceof Error) {
			logger.error(error);
		} else {
			logger.error(JSON.stringify(error));
		}
	};
}
export default logger;
