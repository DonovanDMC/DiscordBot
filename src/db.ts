import { AsyncDatabase } from "promised-sqlite3";
import {
    type StickerItem,
    type JSONAttachment,
    type Message,
    type JSONMessage,
    Attachment
} from "oceanic.js";
import { readFile } from "node:fs/promises";

export interface DBMessage {
    attachments: string;
    author_id: string;
    author_name: string;
    channel_id: string;
    content: string;
    id: string;
    stickers: string;
}
export interface FormattedMessage {
    attachments: Array<Pick<JSONAttachment, "url" | "filename" | "id">>;
    authorID: string;
    authorName: string;
    channelID: string;
    content: string;
    id: string;
    stickers: Array<Pick<StickerItem, "id" | "name">>;
}

const path = new URL("../../data", import.meta.url).pathname;
const db = await AsyncDatabase.open(`${path}/messages.db`);
export const conn = db;
const init = await readFile(`${path}/init.sql`, "utf8");
await db.run(init);

export function formatMessage(msg: Message | JSONMessage): FormattedMessage {
    return {
        attachments: msg.attachments.map(a => a instanceof Attachment ? a.toJSON() : a),
        authorID:    msg.author.id,
        authorName:  msg.author.username,
        channelID:   msg.channelID,
        content:     msg.content,
        id:          msg.id,
        stickers:    msg.stickerItems ?? []
    };
}

const upsertQuery = await db.prepare("INSERT INTO messages (id, author_id, author_name, channel_id, attachments, stickers, content) VALUES (?, ?, ?, ?, ?, ?, ?)");
export async function saveMessage(message: Message) {
    return upsertQuery.run([
        message.id,
        message.author.id,
        message.author.username,
        message.channelID,
        JSON.stringify(message.attachments.map(a => a.toJSON())),
        JSON.stringify(message.stickerItems ?? []),
        message.content
    ]);
}

export async function getMessage(id: string) {
    const msg = await db.get<DBMessage | undefined>("SELECT * FROM messages WHERE id = ?", id);
    if (!msg) {
        return null;
    }

    return {
        // for legacy we supply filename as the id for comparisons
        attachments: !msg.attachments.startsWith("[") ? msg.attachments.split("$").filter(Boolean).map(attachment => ({ url: "ignore", filename: attachment, id: attachment })) : JSON.parse(msg.attachments) as Array<JSONAttachment>,
        authorID:    msg.author_id,
        authorName:  msg.author_name,
        channelID:   msg.channel_id,
        content:     msg.content,
        id:          msg.id,
        stickers:    !msg.stickers.startsWith("[") ? msg.stickers.split("$").filter(Boolean).map(sticker => ({ id: sticker.split(":")[1] ?? "0", name: sticker.split(":")[0] })) : JSON.parse(msg.stickers) as Array<StickerItem>
    };
}

export default db;
