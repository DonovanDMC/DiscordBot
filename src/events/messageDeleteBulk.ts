import { logDeletedMessage } from "./messageDelete.js";
import ClientEvent from "../util/ClientEvent.js";
import config from "../config.js";
import { formatMessage, getMessage } from "../db.js";
import { Message } from "oceanic.js";

export default new ClientEvent("messageDeleteBulk", async function(messages) {
    if (messages[0].guildID !== config.guildID) {
        return;
    }

    for (const msg of messages) {
        const old = await getMessage(msg.id) ?? (msg instanceof Message && formatMessage(msg as Message));
        if (old) {
            await logDeletedMessage.call(this, old, msg);
        }
    }
});
