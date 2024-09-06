import Redis, { getKeys } from "./Redis.js";

const redisKey = "phrases";
export async function addPhrase(mention: string, phrase: string): Promise<void> {
    await Redis.sadd(`${redisKey}:${mention}`, phrase);
}
export async function removePhrase(mention: string, phrase: string): Promise<void> {
    await Redis.srem(`${redisKey}:${mention}`, phrase);
}
export async function getAllPhrases(): Promise<Record<string, Array<string>>> {
    const keys = await getKeys(`${redisKey}:*`);
    const phrases: Record<string, Array<string>> = {};
    for (const key of keys) {
        phrases[key.slice(redisKey.length + 1)] = await Redis.smembers(key);
    }
    return phrases;
}
export async function getPhrasesFor(target: string): Promise<Record<string, Array<string>>> {
    const keys = await getKeys(`${redisKey}:${target}`);
    const phrases: Record<string, Array<string>> = {};
    for (const key of keys) {
        phrases[key.slice(redisKey.length + 1)] = await Redis.smembers(key);
    }
    return phrases;
}
export async function getMentions(text: string): Promise<string> {
    const phrases = await getAllPhrases();
    const mentions: Array<string> = [];
    for (const [mention, members] of Object.entries(phrases)) {
        for (const phrase of members) {
            if (text.includes(phrase)) {
                mentions.push(`<@${mention}>: ${phrase}`);
            }
        }
    }
    return mentions.join("\n");
}
