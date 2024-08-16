import ClientEvent from "../util/ClientEvent.js";
import { handleLinks } from "../util/handleLinks.js";
import { saveMessage } from "../db.js";
import config from "../config.js";

export default new ClientEvent("messageCreate", async function(msg) {
    if (msg.author.id === this.user.id || msg.guildID !== config.guildID) {
        return;
    }

    await saveMessage(msg);
    if (msg.inCachedGuildChannel()) {
        await handleLinks(msg);
    }

});
