import "dotenv/config.js";
import "source-map-support/register.js";
import DiscordBot from "./client.js";
import Logger from "@uwu-codes/logger";

const bot = new DiscordBot();
await bot.connect();

process
    .on("SIGTERM", () => {
        bot.disconnect(false);
    })
    .on("SIGINT", () => {
        bot.disconnect(false);
    })
    .on("uncaughtException", err => {
        Logger.getLogger("uncaughtException").error(err);
    })
    .on("unhandledRejection", rej => {
        Logger.getLogger("unhandledRejection").error(rej);
    });
