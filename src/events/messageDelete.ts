import ClientEvent from "../util/ClientEvent.js";
import config from "../config.js";
import { formatJumpLink } from "../util/util.js";
import { formatMessage, type FormattedMessage, getMessage } from "../db.js";
import type DiscordBot from "../client.js";
import { Base, type EmbedOptions, Message, type PossiblyUncachedMessage } from "oceanic.js";

export default new ClientEvent("messageDelete", async function(msg) {
    if (msg.guildID !== config.guildID) {
        return;
    }

    const old = await getMessage(msg.id) ?? (msg instanceof Message && formatMessage(msg as Message));
    // if we both didn't have the message cached in memory or the database, we have no choice but to ignore it
    // since we only get id, channel_id, and guild_id
    if (old) {
        await logDeletedMessage.call(this, old, msg);
    }
});

export async function logDeletedMessage(this: DiscordBot, msg: FormattedMessage, partial: PossiblyUncachedMessage): Promise<void> {
    const embed: EmbedOptions = {
        title:     "Deleted Message",
        color:     0xFF0000,
        timestamp: Base.getCreatedAt(msg.id).toISOString(),
        fields:    [
            {
                name:   "Channel",
                value:  `<#${partial.channelID}>`,
                inline: true
            },
            {
                name:   "User",
                value:  `<@${msg.authorID}>`,
                inline: true
            },
            {
                name:   "Message",
                value:  formatJumpLink(partial.guildID!, partial.channelID, partial.id),
                inline: true
            }
        ]
    };

    if (msg.content) {
        embed.fields!.push({
            name:  "Content",
            value: msg.content.slice(0, 2000)
        });
    }

    if (msg.attachments.length !== 0) {
        // legacy attachments which didn't save their url will have the url set to "ignore"
        embed.fields!.push({
            name:  "Attachments",
            value: msg.attachments.map(a => a.url === "ignore" ? a.filename : `[${a.filename}](${a.url})`).join(", ")
        });
    }

    if (msg.stickers.length !== 0) {
        embed.fields!.push({
            name:  "Stickers",
            value: msg.stickers.map(s => `[${s.name}](https://cdn.discordapp.com/stickers/${s.id}.png)`).join(", ")
        });
    }

    await this.rest.channels.createMessage(config.channels.event, {
        embeds: [embed]
    });
}
