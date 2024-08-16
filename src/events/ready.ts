import ClientEvent from "../util/ClientEvent.js";
import Redis from "../Redis.js";
import registerCommands from "../commands.js";
import { type CreateApplicationCommandOptions } from "oceanic.js";
import Logger from "@uwu-codes/logger";

export default new ClientEvent("ready", async function() {
    Logger.info(`Ready as ${this.user.tag}`);

    const cachedCommands = JSON.parse((await Redis.get("bot-commands")) || "[]") as Array<CreateApplicationCommandOptions>;
    await registerCommands(this, cachedCommands);
});
