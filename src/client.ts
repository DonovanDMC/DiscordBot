
import config from "./config.js";
import ClientEvent from "./util/ClientEvent.js";
import { Client } from "oceanic.js";
import { readdir } from "node:fs/promises";

export default class DiscordBot extends Client {
    static INSTANCE: DiscordBot;
    constructor() {
        super({
            auth:    `Bot ${config.discordToken}`,
            gateway: {
                intents:                 ["ALL_NON_PRIVILEGED", "MESSAGE_CONTENT", "GUILD_MEMBERS"],
                lookupDisallowedIntents: true
            }
        });

        DiscordBot.INSTANCE = this;
    }

    static get(): DiscordBot {
        if (!this.INSTANCE) {
            throw new Error("Failed to get client");
        }

        return this.INSTANCE;
    }

    override async connect() {
        await this.registerEvents();
        await super.connect();
    }

    async registerEvents() {
        const dir = new URL("events", import.meta.url).pathname;
        const events = (await readdir(dir, { withFileTypes: true })).filter(ev => ev.isFile()).map(ev => `${dir}/${ev.name}`);
        for (const event of events) {
            const ev = (await import(event) as { default: ClientEvent; }).default;
            if (!(ev instanceof ClientEvent)) {
                throw new TypeError(`Export of event file "${event}" is not an instance of ClientEvent.`);
            }
            this.on(ev.name, ev.listener.bind(this));
        }
    }
}
