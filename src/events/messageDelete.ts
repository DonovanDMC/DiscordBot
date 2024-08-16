import ClientEvent from "../util/ClientEvent.js";
import config from "../config.js";
import { formatJumpLink } from "../util/util.js";
import { formatMessage, getMessage } from "../db.js";
import { EmbedBuilder } from "@oceanicjs/builders";
import { Base, Message } from "oceanic.js";

export default new ClientEvent("messageDelete", async function(msg) {
    if (msg.guildID !== config.guildID) {
        return;
    }
    const old = await getMessage(msg.id);

    if (old || msg instanceof Message) {
        const message = old ?? formatMessage(msg as Message);
        const embed = new EmbedBuilder()
            .setTitle("Deleted Message")
            .setColor(0xFF0000)
            .setTimestamp(Base.getCreatedAt(msg.id))
            .addField("Channel", `<#${message.channelID}>`, true)
            .addField("User", `<@${message.authorID}>`, true)
            .addField("Message", formatJumpLink(msg.guildID, message.channelID, message.id), true);

        if (message.content) {
            embed.addField("Content", message.content.slice(0, 2000));
        }

        if (message.attachments.length !== 0) {
            embed.addField("Attachments", message.attachments.map(a => `[${a.filename}](${a.url})`).join(", "));
        }

        await this.rest.channels.createMessage(config.channels.event, {
            embeds: embed.toJSON(true)
        });
    }
});
