import config from "../config.js";
import pkg from "../../package.json" assert { type: "json" };
import Logger from "../Logger.js";
import { type AnyInteractionGateway, GuildChannel, Interaction, Message } from "oceanic.js";

export const ucwords = (str: string): string => str.replaceAll(/\b\w/g, char => char.toUpperCase());
export const normalizeName = (str: string): string => str.replaceAll("_", " ");

export async function idToName(...ids: Array<number>): Promise<Record<number, string>> {
    const data = await fetch(`${config.baseURL}/users.json?search[id]=${ids.join(",")}`)
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

export const formatJumpLink = (guildID: string, channelID: string, messageID: string): string => (Object.getOwnPropertyDescriptor(Message.prototype, "jumpLink")!.get as () => string).call({ guildID, channelID, id: messageID });

const host = new URL(config.baseURL).host;
export const postRegex = new RegExp(`https?:\\/\\/(?:.*@)?${host.replaceAll(".", String.raw`\.`)}\\/+posts\\/+([0-9]+)`, "gi");
export const imageRegex = new RegExp(`https?:\\/\\/(?:.*@)?${host.replaceAll(".", String.raw`\.`)}\\/+data\\/+(?:sample/+|preview/+|)[\\da-f]{2}/+[\\da-f]{2}/+(?:sample-)?([\\da-f]{32})\\.[\\da-z]+`, "gi");
export const postIDRegex = /post #(\d+)/gi;

interface BasicPost {
    id: number | null;
    rating: "s" | "q" | "e";
    tags: Array<string>;
}

export async function getPost(id: number): Promise<BasicPost> {
    const res = await fetch(`${config.baseURL}/posts/${id}.json`, {
        headers: {
            "User-Agent": `DiscordBot/${pkg.version} (${pkg.repository.url})`
        }
    });
    if (!res.ok) {
        Logger.getLogger("getPost").error(`Failed to fetch ${id}: ${res.status} ${res.statusText}`);
        return { id: null, rating: "s", tags: [] };
    }
    const data = await res.json() as { post: { id: number; rating: "s" | "q" | "e"; tags: Record<string, Array<string>>; }; };
    return { id: data.post.id, rating: data.post.rating, tags: Object.entries(data.post.tags).flatMap(t => t[1]) };
}

export async function getPostByMD5(md5: string): Promise<BasicPost> {
    const res = await fetch(`${config.baseURL}/posts.json?md5=${md5}`, {
        headers: {
            "User-Agent": `DiscordBot/${pkg.version} (${pkg.repository.url})`
        }
    });
    if (!res.ok) {
        Logger.getLogger("getPostByMD5").error(`Failed to fetch ${md5}: ${res.status} ${res.statusText}`);
        return { id: null, rating: "s", tags: [] };
    }
    const data = await res.json() as { post: { id: number; rating: "s" | "q" | "e"; tags: Record<string, Array<string>>; }; };
    return { id: data.post.id, rating: data.post.rating, tags: Object.entries(data.post.tags).flatMap(t => t[1]) };
}

export function checkStaff(input: AnyInteractionGateway | Message): boolean {
    if ("channel" in input && input.channel instanceof GuildChannel && (input.channel.parentID !== null && config.staffCategories.includes(input.channel.parentID))) {
        return true;
    }

    return (input.member && input.member.roles.includes(config.roles.staff)) ?? false;
}

export function isDev(input: AnyInteractionGateway | Message | string): boolean {
    if (input instanceof Interaction) {
        input = input.user.id;
    }

    if (input instanceof Message) {
        input = input.author.id;
    }

    return config.developerUserIDs.includes(input);
}

export function formatTime(ns: bigint): string {
    const res = {
        microseconds: [(ns / 1000n) % 1000n, "µs"],
        milliseconds: [(ns / 1_000_000n) % 1000n, "ms"],
        seconds:      [(ns / 1_000_000_000n) % 60n, "second"],
        minutes:      [(ns / 60_000_000_000n) % 60n, "minute"],
        hours:        [(ns / 3_600_000_000_000n) % 24n, "hour"],
        days:         [ns / 86_400_000_000_000n, "day"]
    } as const;

    return Object.entries(res)
        .filter(([, v]) => v[0] > 0n)
        .map(([, [v, k]]) => `${v} ${k}${v !== 1n && !["µs", "ms"].includes(k) ? "s" : ""}`)
        .join(", ");
}
