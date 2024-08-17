import type DiscordBot from "./client.js";
import config from "./config.js";
import Redis from "./Redis.js";
import { ApplicationCommandOptionTypes, ApplicationCommandTypes, type CreateGuildApplicationCommandOptions } from "oceanic.js";

export default async function registerCommands(client: DiscordBot, cachedCommands: Array<CreateGuildApplicationCommandOptions>) {
    if (JSON.stringify(cachedCommands) === JSON.stringify(commands)) {
        return;
    }
    const registered = await client.application.bulkEditGuildCommands(config.guildID, commands);
    await Redis.set("bot-commands", JSON.stringify(commands));
    for (const cmd of registered) {
        console.log(`Registered command ${cmd.name}: ${cmd.id}`);
    }
}

const phraseMinLength = 2, phraseMaxLength = 32;
const commands: Array<CreateGuildApplicationCommandOptions> = [
    {
        type:        ApplicationCommandTypes.CHAT_INPUT,
        name:        "phrases",
        description: "Manage notified phrases.",
        options:     [
            {
                type:        ApplicationCommandOptionTypes.SUB_COMMAND_GROUP,
                name:        "role",
                description: "Manage role notified phrases.",
                options:     [
                    {
                        type:        ApplicationCommandOptionTypes.SUB_COMMAND,
                        name:        "add",
                        description: "Add a role notification phrase.",
                        options:     [
                            {
                                type:         ApplicationCommandOptionTypes.STRING,
                                name:         "role",
                                description:  "The role to add the phrase to.",
                                required:     true,
                                autocomplete: true
                            },
                            {
                                type:        ApplicationCommandOptionTypes.STRING,
                                name:        "phrase",
                                description: "The phrase to add.",
                                required:    true,
                                minLength:   phraseMinLength,
                                maxLength:   phraseMaxLength
                            }
                        ]
                    },
                    {
                        type:        ApplicationCommandOptionTypes.SUB_COMMAND,
                        name:        "remove",
                        description: "Remove a role notification phrase.",
                        options:     [
                            {
                                type:         ApplicationCommandOptionTypes.STRING,
                                name:         "role",
                                description:  "The role to remove the phrase from.",
                                required:     true,
                                autocomplete: true
                            },
                            {
                                type:        ApplicationCommandOptionTypes.STRING,
                                name:        "phrase",
                                description: "The phrase to remove.",
                                required:    true,
                                minLength:   phraseMinLength,
                                maxLength:   phraseMaxLength
                            }
                        ]
                    },
                    {
                        type:        ApplicationCommandOptionTypes.SUB_COMMAND,
                        name:        "list",
                        description: "Get a list of the currently registered role phrases.",
                        options:     [
                            {
                                type:         ApplicationCommandOptionTypes.STRING,
                                name:         "role",
                                description:  "The role to remove the phrase from. Select none to list all.",
                                required:     false,
                                autocomplete: true
                            }
                        ]
                    }
                ]
            },
            {
                type:        ApplicationCommandOptionTypes.SUB_COMMAND_GROUP,
                name:        "personal",
                description: "Manage personal notified phrases.",
                options:     [
                    {
                        type:        ApplicationCommandOptionTypes.SUB_COMMAND,
                        name:        "add",
                        description: "Add a personal notification phrase.",
                        options:     [
                            {
                                type:        ApplicationCommandOptionTypes.STRING,
                                name:        "phrase",
                                description: "The phrase to add.",
                                required:    true,
                                minLength:   phraseMinLength,
                                maxLength:   phraseMaxLength
                            }
                        ]
                    },
                    {
                        type:        ApplicationCommandOptionTypes.SUB_COMMAND,
                        name:        "remove",
                        description: "Remove a personal notification phrase.",
                        options:     [
                            {
                                type:        ApplicationCommandOptionTypes.STRING,
                                name:        "phrase",
                                description: "The phrase to remove.",
                                required:    true,
                                minLength:   phraseMinLength,
                                maxLength:   phraseMaxLength
                            }
                        ]
                    },
                    {
                        type:        ApplicationCommandOptionTypes.SUB_COMMAND,
                        name:        "list",
                        description: "Get a list of your currently registered phrases."
                    }
                ]
            },
            {
                type:        ApplicationCommandOptionTypes.SUB_COMMAND,
                name:        "dump",
                description: "List all registered phrases."
            }
        ]
    },
    {
        type:        ApplicationCommandTypes.CHAT_INPUT,
        name:        "whois",
        description: "Get the related site & discord accounts for a user.",
        options:     [
            {
                type:        ApplicationCommandOptionTypes.STRING,
                name:        "user",
                description: "The user. Their site id, discord id, or a mention.",
                required:    true
            }
        ]
    },
    {
        type: ApplicationCommandTypes.USER,
        name: "Whois"
    },
    {
        type:        ApplicationCommandTypes.CHAT_INPUT,
        name:        "sync",
        description: "Sync your nickname with your site username.",
        options:     [
            {
                type:        ApplicationCommandOptionTypes.NUMBER,
                name:        "user_id",
                description: "If omitted, the first linked account will be used."
            }
        ]
    }
];
