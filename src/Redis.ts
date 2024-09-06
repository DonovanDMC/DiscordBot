import config from "./config.js";
import { type TicketActionData, ticketUpdate } from "./pubsub.js";
import Logger from "./Logger.js";
import { Redis as IORedis } from "ioredis";

const Redis = new IORedis(config.redis);
export const SubRedis = new IORedis(config.redis);
Redis.on("ready", async() => {
    Logger.getLogger("Redis").debug("Ready");
});
SubRedis.on("ready", async() => {
    Logger.getLogger("SubRedis").debug("Ready");
    await SubRedis.subscribe(config.redisChannels.tickets);
});
SubRedis.on("message", async (channel, message) => {
    const data = JSON.parse(message) as unknown;
    switch (channel) {
        case config.redisChannels.tickets: return ticketUpdate(data as TicketActionData);
    }
});
// KEYS is very slow, being a blocking O(n) operation. In comparison, SCAN overall is also O(n),
// but each call is only O(1)
export async function getKeys(pattern: string, maxPerRun = 2500, cursorStart = "0", keys: Array<string> = []): Promise<Array<string>> {
    const [cursorEnd, k] = await Redis.scan(cursorStart, "MATCH", pattern, "COUNT", maxPerRun);
    keys.push(...k);
    return cursorEnd === "0" ? Array.from(new Set(keys)) : getKeys(pattern, maxPerRun, cursorEnd, keys);
}

export default Redis;
