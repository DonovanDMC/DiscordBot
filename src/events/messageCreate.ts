import ClientEvent from "../util/ClientEvent.js";
import { handleLinks } from "../util/handleLinks.js";
import { saveMessage } from "../db.js";
import { formatTime } from "../util/util.js";
import config from "../config.js";
import Redis, { getKeys } from "../Redis.js";
import * as db from "../db.js";
import * as util from "../util/util.js";
import * as dtext from "../util/dtext.js";
import * as phrases from "../phrases.js";
import { ApplicationCommandOptionTypes, ApplicationCommandTypes, Constants } from "oceanic.js";
import { inspect } from "node:util";

const evalVariables: Record<string, unknown> = {
    config,
    Redis,
    Constants,
    db,
    util,
    dtext,
    phrases
};

async function format(obj: unknown): Promise<string> {
    if (obj instanceof Promise) {
        obj = await obj;
    }
    if (Array.isArray(obj)) {
        return JSON.stringify(obj, (_k, v: unknown) => typeof v === "bigint" ? `${v.toString()}n` : v);
    }
    return inspect(obj, { depth: 1, colors: false, showHidden: false });
}

export default new ClientEvent("messageCreate", async function(msg) {
    if (msg.author.id === this.user.id || msg.guildID !== config.guildID) {
        return;
    }

    if (msg.inCachedGuildChannel()) {
        await saveMessage(msg);
        await handleLinks(msg);

        if (util.isDev(msg)) {
            const [command, ...args] = msg.content.split(" ");
            switch (command) {
                case "!commands": {
                    const commands = await this.application.getGlobalCommands();
                    const chatInput: Array<string> = [], user: Array<string> = [], message: Array<string> = [], local: Array<string> = [];
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
                                    chatInput.push(`  * ${cmd.mention()}`);
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

                    local.push("* !commands", "* !reset-ticket-cooldowns [user]");

                    return msg.channel.createMessage({
                        messageReference: {
                            messageID: msg.id
                        },
                        content: `### Chat Input:\n${chatInput.join("\n")}\n### User:\n${user.join("\n")}\n### Message:\n${message.join("\n")}\n### Local:\n${local.join("\n")}`
                    });
                }

                case "!reset-ticket-cooldowns": {
                    const user = (args[0] || "*").replace(/<@!?(\d+)>/, "$1");
                    const keys = await getKeys(`ticket-timeout:${user}`);
                    if (keys.length === 0) {
                        return msg.channel.createMessage({ content: `No active cooldowns found for ${user}` });
                    } else {
                        await Redis.del(...keys);
                        return msg.channel.createMessage({ content: `Reset ${keys.length} cooldowns for ${user}` });
                    }
                }

                case "!eval": {
                    // prevent using eval command in production mode
                    if (!config.development) {
                        return;
                    }

                    // eslint-disable-next-line guard-for-in
                    for (const k in evalVariables) {
                        // eslint-disable-next-line guard-for-in, @typescript-eslint/no-implied-eval, no-new-func -- typescript messes with variable names so we have to remake them
                        new Function("value", `${k} = value`)(evalVariables[k]);
                    }
                    const input = args.join(" ");
                    const start = process.hrtime.bigint();
                    let res: unknown;
                    try {
                    // eslint-disable-next-line no-eval
                        res = await eval(`(async()=>{${input.includes("return") ? "" : "return "}${input}})()`);
                    } catch (err) {
                        res = err;
                    }
                    const end = process.hrtime.bigint();
                    const time = formatTime(end - start);
                    let formatted = await format(res), file: string | undefined;
                    if (formatted.length >= 750) {
                        try {
                            file = inspect(JSON.parse(formatted), { depth: 1, colors: false, showHidden: false });
                        } catch {
                            file = formatted;
                        }
                        formatted = "see attached file";
                    }

                    return msg.channel.createMessage({
                        embeds: [
                            {
                                title:  `Time Taken: ${time}`,
                                color:  res instanceof Error ? 0xDC143C : 0x008000,
                                fields: [
                                    {
                                        name:  ":inbox_tray: Input",
                                        value: `\`\`\`js\n${input.slice(0, 750)}\n\`\`\``
                                    },
                                    {
                                        name:  ":outbox_tray: Output",
                                        value: `\`\`\`js\n${formatted}\n\`\`\``
                                    }
                                ]
                            }
                        ],
                        files: file ? [
                            {
                                contents: Buffer.from(file),
                                name:     "output.txt"
                            }
                        ] : [
                        ]
                    });
                }

            }
        }
    }
});
