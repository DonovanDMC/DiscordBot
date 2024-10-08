import DiscordBot from "./client.js";
import config from "./config.js";
import { getMentions } from "./phrases.js";
import Redis from "./Redis.js";
import { type EmbedOptions } from "oceanic.js";

export interface TicketActionData {
    action: string;
    ticket: TicketData;
}
export interface TicketData {
    category: string;
    claimant: string | null;
    id: number;
    reason: string;
    status: string;
    target: string;
    user: string;
    user_id: number;
}
export async function ticketUpdate(data: TicketActionData): Promise<void> {
    const color = data.ticket.claimant === null ? 0xFF0000 : 0x00FFFF;
    const claimant = data.ticket.claimant || "<Unclaimed>";
    const offender = ({
        Artist:    (): string => `Artist ${data.ticket.target}`,
        Comment:   (): string => `Comment by ${data.ticket.target}`,
        Dmail:     (): string => `DMail sent by ${data.ticket.target}`,
        Forum:     (): string => `Forum post by ${data.ticket.target}`,
        ForumPost: (): string => `Forum post by ${data.ticket.target}`,
        Pool:      (): string => `Pool ${data.ticket.target}`,
        Post:      (): string => `Post uploaded by ${data.ticket.target}`,
        Set:       (): string => `Set ${data.ticket.target}`,
        PostSet:   (): string => `Set ${data.ticket.target}`,
        Tag:       (): string => `Tag ${data.ticket.target}`,
        User:      (): string => `User ${data.ticket.target}`,
        Wiki:      (): string => `Wiki page ${data.ticket.target}`,
        WikiPage:  (): string => `Wiki page ${data.ticket.target}`
    }[data.ticket.category] || ((): string => `${data.ticket.category} report by ${data.ticket.user}`))();
    const embed = {
        url:         `${config.baseURL}/tickets/${data.ticket.id}`,
        title:       offender,
        description: data.ticket.reason.slice(0, 1000),
        author:      {
            url:  `${config.baseURL}/users/${data.ticket.user_id}`,
            name: data.ticket.user
        },
        color,
        fields: [
            {
                name:   "Type",
                value:  data.ticket.category,
                inline: true
            },
            {
                name:   "Status",
                value:  data.ticket.status,
                inline: true
            },
            {
                name:   "Claimed By",
                value:  claimant,
                inline: true
            }
        ]
    } satisfies EmbedOptions;

    switch (data.action) {
        case "create": {
            const { id } = await DiscordBot.get().rest.channels.createMessage(config.channels.ticket, { embeds: [embed] });
            await Redis.set(`ticket-messages:${data.ticket.id}`, id);
            const mentions = await getMentions(data.ticket.reason);
            if (mentions.trim().length !== 0) {
                await DiscordBot.get().rest.channels.createMessage(config.channels.ticket, { content: mentions, allowedMentions: { everyone: false, users: true, roles: Object.values(config.roles) } });
            }
            break;
        }

        default: {
            const id = await Redis.get(`ticket-messages:${data.ticket.id}`);
            if (id) {
                await DiscordBot.get().rest.channels.editMessage(config.channels.ticket, id, { embeds: [embed] });
            }
            break;
        }
    }
}
