import ClientEvent from "../util/ClientEvent.js";
import { handleLinks } from "../util/handleLinks.js";
import config from "../config.js";
import { formatMessage, getMessage, saveMessage } from "../db.js";
import { type EmbedOptions } from "oceanic.js";

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
        // ensure we only log changes if the content or attachments changed (stickers/poll/etc should be uneditable)
        // we're aviding phantom edits from rich embeds loading
        if (msg.content === old.content && JSON.stringify(msg.attachments.toArray()) === JSON.stringify(old.attachments)) {
            return;
        }

        await saveMessage(msg);
        if (msg.inCachedGuildChannel()) {
            await handleLinks(msg);
        }

        const embed: EmbedOptions = {
            title:     "Edited Message",
            color:     0xFFFF00,
            timestamp: msg.createdAt.toISOString(),
            fields:    [
                {
                    name:   "Channel",
                    value:  `<#${msg.channelID}>`,
                    inline: true
                },
                {
                    name:   "User",
                    value:  `<@${msg.author.id}>`,
                    inline: true
                },
                {
                    name:   "Message",
                    value:  msg.jumpLink,
                    inline: true
                }
            ]
        };

        if (msg.content !== old.content) {
            embed.fields!.push({
                name:  "Before",
                value: old.content.slice(0, 2000)
            }, {
                name:  "After",
                value: msg.content.slice(0, 2000)
            });
        }

        const addedAttachments = msg.attachments.toArray().filter(a => !old.attachments.some(att => att.id === a.id));
        const removedAttachments = old.attachments.filter(att => !msg.attachments.toArray().some(a => a.id === att.id));

        if (addedAttachments.length !== 0) {
        // legacy attachments which didn't save their url will have the url set to "ignore"
            embed.fields!.push({
                name:  "Added Attachments",
                value: addedAttachments.map(a => a.url === "ignore" ? a.filename : `[${a.filename}](${a.url})`).join(", ")
            });
        }

        if (removedAttachments.length !== 0) {
        // legacy attachments which didn't save their url will have the url set to "ignore"
            embed.fields!.push({
                name:  "Removed Attachments",
                value: removedAttachments.map(a => a.url === "ignore" ? a.filename : `[${a.filename}](${a.url})`).join(", ")
            });
        }

        await this.rest.channels.createMessage(config.channels.event, {
            embeds: [embed]
        });
    } else {
        await saveMessage(msg);
    }
});
