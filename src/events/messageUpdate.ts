import ClientEvent from "../util/ClientEvent.js";
import { handleLinks } from "../util/handleLinks.js";
import config from "../config.js";
import { formatMessage, getMessage, saveMessage } from "../db.js";
import { EmbedBuilder } from "@oceanicjs/builders";

export default new ClientEvent("messageUpdate", async function(msg, oldMessage) {
    if (!msg.guildID || msg.author.id === this.user.id) {
        return;
    }

    let old: Awaited<ReturnType<typeof getMessage>> | null = null;
    if (oldMessage) {
        old = formatMessage(oldMessage);
    } else {
        old = await getMessage(msg.id);
    }

    if (old) {
        if (msg.content === old.content && JSON.stringify(msg.attachments.toArray()) === JSON.stringify(old.attachments)) {
            return;
        }

        await saveMessage(msg);
        if (msg.inCachedGuildChannel()) {
            await handleLinks(msg);
        }

        const embed = new EmbedBuilder()
            .setTitle("Edited Message")
            .setColor(0xFFFF00)
            .setTimestamp(msg.createdAt)
            .addField("Channel", `<#${msg.channelID}>`, true)
            .addField("User", `<@${msg.author.id}>`, true)
            .addField("Message", msg.jumpLink, true);

        if (msg.content !== old.content) {
            embed.addField("Before", old.content.slice(0, 2000));
            embed.addField("After", msg.content.slice(0, 2000));
        }

        const addedAttachments = msg.attachments.toArray().filter(a => !old.attachments.some(att => att.id === a.id));
        const removedAttachments = old.attachments.filter(att => !msg.attachments.toArray().some(a => a.id === att.id));

        if (addedAttachments.length !== 0) {
            embed.addField("Added Attachments", addedAttachments.map(a => a.url === "ignore" ? a.filename : `[${a.filename}](${a.url})`).join(", "));
        }

        if (removedAttachments.length !== 0) {
            embed.addField("Removed Attachments", removedAttachments.map(a => a.url === "ignore" ? a.filename : `[${a.filename}](${a.url})`).join(", "));
        }

        await this.rest.channels.createMessage(config.channels.event, {
            embeds: embed.toJSON(true)
        });
    } else {
        await saveMessage(msg);
    }
});
