import {
    createLogger,
    format,
    type LeveledLogMethod,
    transports,
    type Logger as ILogger
} from "winston";
import type { Format } from "logform";
// eslint-disable-next-line unicorn/import-style
import chalk, { type ChalkInstance } from "chalk";

// extracted from @uwu-codes/logger
// https://github.com/UwUCode/Logger/tree/9f1c6573409844b77077eaf8a311a9bde6292a04

const DefaultColors = {
    error: chalk.redBright,
    warn:  chalk.yellowBright,
    info:  chalk.greenBright,
    debug: chalk.cyanBright
};
const noop = (str: string): string => str;

export default class Logger {
    private static _colors: Record<string, ChalkInstance> = DefaultColors;
    private static _log: ILogger;
    private static get log(): ILogger {
        return this._log ??= createLogger({
            level:  "debug",
            levels: {
                error: 0,
                warn:  1,
                info:  2,
                debug: 3
            },
            transports: [
                new transports.Console({
                    format: this._getFormat()
                })
            ]
        });
    }

    static get debug(): LeveledLogMethod {
        return this.log.debug.bind(this._log);
    }

    static get error(): LeveledLogMethod {
        return this.log.error.bind(this._log);
    }

    static get info(): LeveledLogMethod {
        return this.log.info.bind(this._log);
    }

    static get warn(): LeveledLogMethod {
        return this.log.warn.bind(this._log);
    }

    private static _getFormat(colors = true): Format {
        return format.combine(
            format.splat(),
            format.errors({ stack: true }),
            format.printf(({ level, message, name, stack }) => {
                if (stack){
                    message = String(stack).split("\n")[0].split(":")[1].trim() === message ? String(stack) : `${String(message)}\n${String(stack)}`;
                }

                return (colors ? this._colors[level] ?? noop : noop)?.(`${this._getTimestamp()} [${level.toUpperCase()}]${Array.isArray(name) ? name.map(val => `[${String(val)}]`).join(",") : ""} ${String(message)}`);
            })
        );
    }

    private static _getTimestamp(): string {
        const d = new Date();
        return `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}/${d.getFullYear()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}.${d.getMilliseconds().toString().padStart(3, "0")}`;
    }

    static getLogger(name: string, ...names: Array<string>): ILogger {
        return this._log.child({ name: [name, ...names] });
    }
}
