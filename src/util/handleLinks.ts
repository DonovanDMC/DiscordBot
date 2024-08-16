import { formatDtext } from "./dtext.js";
import {
    getPost,
    getPostByMD5,
    imageRegex,
    postIDRegex,
    postRegex
} from "../util/util.js";
import config from "../config.js";
import { type AnyTextableGuildChannel, type Message, MessageFlags } from "oceanic.js";

export async function handleLinks(msg: Message<AnyTextableGuildChannel>) {
    let text = "";
    const idMatches = msg.content.matchAll(postIDRegex);
    for (const [,value] of idMatches) {
        const v = Number(value);
        if (!isNaN(v)) {
            if (!msg.channel.parentID || !config.staffCategories.includes(msg.channel.parentID)) {
                const { rating, tags } = await getPost(v);
                if (tags.some(t => config.blacklistedTags.includes(t))) {
                    await msg.delete();
                    await msg.channel.createMessage({
                        content: `Hey <@${msg.author.id}>! Please don't send links to posts like that..`
                    });
                    return;
                }
                if (rating !== "s" && config.safeChannels.includes(msg.channel.id)) {
                    text += `[NSFW] <${config.baseURL}/posts/${v}>\n`;
                } else {
                    text += `${config.baseURL}/posts/${v}\n`;
                }
            } else {
                text += `${config.baseURL}/posts/${v}\n`;
            }
        }
    }
    const postMatches = msg.content.matchAll(postRegex);
    for (const [,value] of postMatches) {
        const v = Number(value);
        if (!isNaN(v) && (!msg.channel.parentID || !config.staffCategories.includes(msg.channel.parentID))) {
            const { rating, tags } = await getPost(v);
            if (tags.some(t => config.blacklistedTags.includes(t)) || (rating !== "s" && tags.some(t => config.blacklistedNonSafeTags.includes(t)))) {
                await msg.delete();
                await msg.channel.createMessage({
                    content: `Hey <@${msg.author.id}>! Please don't send links to posts like that..`
                });
                return;
            }
            if (rating !== "s" && config.safeChannels.includes(msg.channel.id)) {
                await msg.edit({ flags: MessageFlags.SUPPRESS_EMBEDS });
            }
        }
    }
    const imageMatches = msg.content.matchAll(imageRegex);
    for (const [,value] of imageMatches) {
        const { id, rating, tags } = await getPostByMD5(value);
        if (id === null) {
            continue;
        }
        if (!msg.channel.parentID || !config.staffCategories.includes(msg.channel.parentID)) {
            if (tags.some(t => config.blacklistedTags.includes(t))) {
                await msg.delete();
                await msg.channel.createMessage({
                    content: `Hey <@${msg.author.id}>! Please don't send links to posts like that..`
                });
                return;
            }
            if (rating !== "s" && config.safeChannels.includes(msg.channel.id)) {
                await msg.edit({ flags: MessageFlags.SUPPRESS_EMBEDS });
                text += `[NSFW] <${config.baseURL}/posts/${id}>\n`;
            } else {
                text += `${config.baseURL}/posts/${id}\n`;
            }
        } else {
            text += `${config.baseURL}/posts/${id}\n`;
        }
    }
    text += formatDtext(msg.content);
    if (text !== "") {
        await msg.channel.createMessage({
            content:          text,
            messageReference: {
                messageID: msg.id
            }
        });
        text = "";
    }
}
