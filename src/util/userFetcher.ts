import config from "../config.js";
import Logger from "../Logger.js";
import { createHash } from "node:crypto";

const e6ToDiscordURL = `${config.fetchURL}/e6ids`;
const discordToE6URL = `${config.fetchURL}/ids`;

function getFetchHMAC(contents: string): string {
    return createHash("sha256").update(`${contents} ${config.fetchSecret}`).digest("hex");
}

export async function discordToE6(id: string): Promise<Array<number>> {
    const res = await fetch(`${e6ToDiscordURL}?discord_id=${id}&hash=${getFetchHMAC(id)}`);
    if (!res.ok) {
        Logger.getLogger("discordToE6").error(`Failed to fetch ${id}: ${res.status} ${res.statusText}`);
        return [];
    }

    return (await res.json() as { ids: Array<number>; }).ids;
}

export async function e6ToDiscord(id: number): Promise<Array<string>> {
    const res = await fetch(`${discordToE6URL}?user_id=${id}&hash=${getFetchHMAC(id.toString())}`);
    if (!res.ok) {
        Logger.getLogger("e6ToDiscord").error(`Failed to fetch ${id}: ${res.status} ${res.statusText}`);
        return [];
    }

    return (await res.json() as { ids: Array<string>; }).ids;
}

export async function getAllFromDiscord(id: string): Promise<{ discord: Array<string>; e6: Array<number>; }> {
    const e6 = await discordToE6(id);
    // using a set for uniqueness
    const discord = new Set([id]);
    for (const e6id of e6) {
        const discordIDs = await e6ToDiscord(e6id);
        for (const discordID of discordIDs) {
            discord.add(discordID);
        }
    }
    return { discord: Array.from(discord), e6 };
}

export async function getAllFromE6(id: number): Promise<{ discord: Array<string>; e6: Array<number>; }> {
    const discord = await e6ToDiscord(id);
    // using a set for uniqueness
    const e6 = new Set([id]);
    for (const discordID of discord) {
        const e6IDs = await discordToE6(discordID);
        for (const e6ID of e6IDs) {
            e6.add(e6ID);
        }
    }
    return { discord, e6: Array.from(e6) };
}

export async function getAll(id: string | number): Promise<{ discord: Array<string>; e6: Array<number>; }> {
    if (typeof id === "number") {
        return getAllFromE6(id);
    } else {
        return getAllFromDiscord(id);
    }
}
