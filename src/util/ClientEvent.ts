import type DiscordBot from "../client.js";
import type { ClientEvents } from "oceanic.js";

export default class ClientEvent<K extends keyof ClientEvents = keyof ClientEvents> {
    listener: (this: DiscordBot, ...args: ClientEvents[K]) => void;
    name: K;
    constructor(event: K, listener: (this: DiscordBot, ...args: ClientEvents[K]) => void) {
        this.name = event;
        this.listener = listener;
    }
}
