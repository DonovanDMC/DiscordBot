import ClientEvent from "../util/ClientEvent.js";
import { handleLinks } from "../util/handleLinks.js";
import { saveMessage } from "../db.js";
import config from "../config.js";
import { ApplicationCommandOptionTypes, ApplicationCommandTypes } from "oceanic.js";
import Redis, { getKeys } from "../Redis.js";
import { checkStaff } from "../util/util.js";

export default new ClientEvent("messageCreate", async function(msg) {
    if (msg.author.id === this.user.id || msg.guildID !== config.guildID) {
        return;
    }

    await saveMessage(msg);
    if (msg.inCachedGuildChannel()) {
        await handleLinks(msg);

        if (checkStaff(msg)) {
            const [command, ...args] = msg.content.split(" ");
            switch (command) {
                case "!commands": {
                    const commands = await this.application.getGlobalCommands();
                    const chatInput: string[] = [], user: string[] = [], message: string[] = [], local: string[] = [];
                    for (const cmd of commands) {
                        switch (cmd.type) {
                            case ApplicationCommandTypes.CHAT_INPUT: {
                                chatInput.push(`* ${cmd.name} (${cmd.id})`);
                                const options = cmd.options ?? [];
                                const hasSubCommands = options.some(o => [ApplicationCommandOptionTypes.SUB_COMMAND, ApplicationCommandOptionTypes.SUB_COMMAND_GROUP].includes(o.type));
                                if (hasSubCommands) {
                                    for (const option of options) {
                                        if (option.type === ApplicationCommandOptionTypes.SUB_COMMAND) {
                                            chatInput.push(`  * ${cmd.mention([option.name])}`);
                                        } else if (option.type === ApplicationCommandOptionTypes.SUB_COMMAND_GROUP && option.options) {
                                            for (const subOption of option.options) {
                                                chatInput.push(`  * ${cmd.mention([option.name, subOption.name])}`);
                                            }
                                        }
                                    }
                                } else {
                                    chatInput.push(`  * ${cmd.mention()}`)
                                }
                                break;
                            }
                            case ApplicationCommandTypes.USER: {
                                user.push(`* ${cmd.name} (${cmd.id})`);
                                break;
                            }
                            case ApplicationCommandTypes.MESSAGE: {
                                message.push(`* ${cmd.name} (${cmd.id})`);
                                break;
                            }
                        }
                    }

                    local.push(`* !commands\n !reset-ticket-cooldowns [user]`);

                    return msg.channel.createMessage({
                        messageReference: {
                            messageID: msg.id
                        },
                        content: `### Chat Input:\n${chatInput.join("\n")}\n### User:\n${user.join("\n")}\n### Message:\n${message.join("\n")}\n### Local:\n${local.join("\n")}`
                    });
                }

                case "!reset-ticket-cooldowns": {
                    const user = args[0] || "*";
                    const keys = await getKeys(`ticket-cooldown:${user}`);
                    if (keys.length > 0) {
                        await Redis.del(...keys);
                        return msg.createReaction("✅");
                    } else {
                        return msg.createReaction("❌");
                    }
                }
            }
        }
    }
});
