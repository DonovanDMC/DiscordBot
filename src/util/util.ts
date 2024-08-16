import config from "../config.js";
import { Message } from "oceanic.js";
import Logger from "@uwu-codes/logger";

export const ucwords = (str: string) => str.replaceAll(/\b\w/g, char => char.toUpperCase());
export const normalizeName = (str: string) => str.replaceAll("_", " ");

export async function idToName(...ids: Array<number>) {
    const data = await fetch(`${config.fetchURL}/users.json?search[id]=${ids.join(",")}`)
        .then(async r => r.json() as Promise<Array<{ id: number; name: string; }>>)
        .catch(err => {
            Logger.getLogger("idToName").error(err);
            return [];
        });

    const res: Record<number, string> = {};
    for (const id of ids) {
        res[id] = data.find(d => d.id === id)?.name ?? "unknown";
    }

    return res;
}

export const is = <T>(_input: unknown): _input is T => true;

export const formatJumpLink = (guildID: string, channelID: string, messageID: string) => (Object.getOwnPropertyDescriptor(Message.prototype, "jumpLink")!.get as () => string).call({ guildID, channelID, id: messageID });

const host = new URL(config.baseURL).host;
export const postRegex = new RegExp(`https?:\\/\\/(?:.*@)?${host.replaceAll(".", "\\.")}\\/+posts\\/+([0-9]+)`, "gi");
export const imageRegex = new RegExp(`https?:\\/\\/(?:.*@)?${host.replaceAll(".", "\\.")}\\/+data\\/+(?:sample/+|preview/+|)[\\da-f]{2}/+[\\da-f]{2}/+([\\da-f]{32})\\.[\\da-z]+`, "gi");
export const postIDRegex = /post #(\d+)/gi;
export const wikiLinkRegex = /\[\[([\S ]+?)]]/gi;
export const postSearchRegex = /{{([\S ]+?)}}/gi;

export async function getPost(id: number) {
    return fetch(`${config.fetchURL}/posts/${id}.json`)
        .then(r => r.json() as Promise<{ id: number; rating: "s" | "q" | "e"; tags: Record<string, Array<string>>; }>)
        .then(data => ({ rating: data.rating, tags: Object.entries(data.tags).flatMap(t => t[1]) }))
        .catch(err => {
            Logger.getLogger("getPost").error(err);
            return { id: null, rating: "s", tags: [] };
        });
}

export async function getPostByMD5(md5: string) {
    return fetch(`${config.fetchURL}/posts.json?md5=${md5}`)
        .then(r => r.json() as Promise<Array<{ id: number; rating: "s" | "q" | "e"; tags: Record<string, Array<string>>; }>>)
        .then(([data]) => ({ id: data.id, rating: data.rating, tags: Object.entries(data.tags).flatMap(t => t[1]) }))
        .catch(err => {
            Logger.getLogger("getPost").error(err);
            return { id: null, rating: "s", tags: [] };
        });
}
