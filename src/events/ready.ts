import ClientEvent from "../util/ClientEvent.js";
import registerCommands from "../commands.js";
import Logger from "@uwu-codes/logger";

export default new ClientEvent("ready", async function() {
    Logger.info(`Ready as ${this.user.tag}`);
    await registerCommands(this);
});
