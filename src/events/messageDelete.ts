import ClientEvent from "../util/ClientEvent.js";
import config from "../config.js";
import { formatJumpLink } from "../util/util.js";
import { formatMessage, type FormattedMessage, getMessage } from "../db.js";
import type DiscordBot from "../client.js";
import { EmbedBuilder } from "@oceanicjs/builders";
import { Base, Message, type PossiblyUncachedMessage } from "oceanic.js";

export default new ClientEvent("messageDelete", async function(msg) {
    if (msg.guildID !== config.guildID) {
        return;
    }

    const old = await getMessage(msg.id) ?? (msg instanceof Message && formatMessage(msg as Message));
    if (old) {
        await logDeletedMessage.call(this, old, msg);
    }
});

export async function logDeletedMessage(this: DiscordBot, msg: FormattedMessage, partial: PossiblyUncachedMessage) {
    const embed = new EmbedBuilder()
        .setTitle("Deleted Message")
        .setColor(0xFF0000)
        .setTimestamp(Base.getCreatedAt(msg.id))
        .addField("Channel", `<#${partial.channelID}>`, true)
        .addField("User", `<@${msg.authorID}>`, true)
        .addField("Message", formatJumpLink(partial.guildID!, partial.channelID, partial.id), true);

    if (msg.content) {
        embed.addField("Content", msg.content.slice(0, 2000));
    }

    if (msg.attachments.length !== 0) {
        embed.addField("Attachments", msg.attachments.map(a => a.url === "ignore" ? a.filename : `[${a.filename}](${a.url})`).join(", "));
    }

    if (msg.stickers.length !== 0) {
        embed.addField("Stickers", msg.stickers.map(s => `[${s.name}](https://cdn.discordapp.com/stickers/${s.id}.png)`).join(", "));
    }

    await this.rest.channels.createMessage(config.channels.event, {
        embeds: embed.toJSON(true)
    });
}
