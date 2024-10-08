import ClientEvent from "../util/ClientEvent.js";
import config from "../config.js";
import { addPhrase, getAllPhrases, getPhrasesFor, removePhrase } from "../phrases.js";
import { checkStaff, idToName, normalizeName } from "../util/util.js";
import { getAll } from "../util/userFetcher.js";
import Redis from "../Redis.js";
import Logger from "../Logger.js";
import { channelsToRename } from "../commands.js";
import {
    ComponentTypes,
    type AutocompleteInteraction,
    MessageFlags,
    User,
    type AllowedMentions,
    type AnyInteractionChannel,
    type ApplicationCommandTypes,
    type CommandInteraction,
    type Uncached,
    type AnyTextableGuildChannel,
    type ComponentInteraction,
    TextInputStyles,
    ChannelTypes,
    type ModalSubmitInteraction,
    type PrivateThreadChannel,
    ButtonStyles,
    RateLimitedError
} from "oceanic.js";

export default new ClientEvent("interactionCreate", async function(interaction) {
    if (interaction.isCommandInteraction() && interaction.isChatInputCommand() && interaction.inPrivateChannel()) {
        switch (interaction.data.name) {
            case "sync": return syncCommand(interaction);
        }
    }

    if (interaction.inCachedGuildChannel()) {
        if (interaction.isCommandInteraction()) {
            if (interaction.isChatInputCommand()) {
                switch (interaction.data.name) {
                    case "phrases": return phrasesCommand(interaction);
                    case "whois": return whoisCommand(interaction);
                    case "rename": return renameCommand(interaction);
                    case "sync": return syncCommand(interaction);
                }
            } else {
                switch (interaction.data.name) {
                    case "Whois": return whoisCommand(interaction);
                }
            }
        }

        if (interaction.isAutocompleteInteraction()) {
            const [subcommand] = interaction.data.options.getSubCommand() ?? [];
            if (interaction.data.name === "phrases" && subcommand === "role") {
                return roleAutocomplete(interaction);
            }
        }

        if (interaction.isComponentInteraction() && interaction.isButtonComponentInteraction()) {
            switch (interaction.data.customID) {
                case "open-ticket": return openTicketComponent(interaction);
                case "close-ticket": return closeTicketComponent(interaction);
            }
        }

        if (interaction.isModalSubmitInteraction()) {
            switch (interaction.data.customID) {
                case "open-ticket-modal": return submitTicketModal(interaction);
            }
        }
    }
});

type ChatInputApplicationCommandInteraction<T extends AnyInteractionChannel | Uncached = AnyInteractionChannel | Uncached> =  CommandInteraction<T, ApplicationCommandTypes.CHAT_INPUT>;

async function phrasesCommand(interaction: ChatInputApplicationCommandInteraction<AnyTextableGuildChannel>): Promise<void> {
    if (!checkStaff(interaction)) {
        await interaction.reply({ content: "You don't have permission to use that.", flags: MessageFlags.EPHEMERAL });
        return;
    }

    const [subcommand, subcommandGroup] = interaction.data.options.getSubCommand(true);

    switch (subcommand) {
        case "role": {
            const role = interaction.data.options.getString("role", true);
            if (!config.phraseRoles.includes(role)) {
                await interaction.reply({ content: "I couldn't find that role." });
                return;
            }
            switch (subcommandGroup) {
                case "add": {
                    const phrase = interaction.data.options.getString("phrase", true);
                    return addPhraseCommand(interaction, `&${role}`, phrase);
                }

                case "remove": {
                    const phrase = interaction.data.options.getString("phrase", true);
                    return removePhraseCommand(interaction, `&${role}`, phrase);
                }

                case "list": {
                    return dumpPhrasesCommand(interaction, `&${role}`);
                }
            }
            break;
        }

        case "personal": {
            switch (subcommandGroup) {
                case "add": {
                    const phrase = interaction.data.options.getString("phrase", true);
                    return addPhraseCommand(interaction, interaction.user.id, phrase);
                }

                case "remove": {
                    const phrase = interaction.data.options.getString("phrase", true);
                    return removePhraseCommand(interaction, interaction.user.id, phrase);
                }

                case "list": {
                    return dumpPhrasesCommand(interaction, interaction.user.id);
                }
            }
            break;
        }

        case "dump": {
            return dumpPhrasesCommand(interaction);
        }
    }
}

async function addPhraseCommand(interaction: ChatInputApplicationCommandInteraction<AnyTextableGuildChannel>, mention: string, phrase: string): Promise<void> {
    await addPhrase(mention, phrase);
    const role = (mention.startsWith("&") && config.phraseRoles.find(id => id === mention.slice(1))) || null;
    if (role) {
        await interaction.reply({
            content:         `The phrase "${phrase}" has been added to the <@&${role}> notification list.`,
            allowedMentions: {
                roles: false
            }
        });
    } else {
        await interaction.reply({ content: `The phrase "${phrase}" has been added to your notification list.` });
    }
}

async function removePhraseCommand(interaction: ChatInputApplicationCommandInteraction<AnyTextableGuildChannel>, mention: string, phrase: string): Promise<void> {
    await removePhrase(mention, phrase);
    const role = (mention.startsWith("&") && config.phraseRoles.find(id => id === mention.slice(1))) || null;
    if (role) {
        await interaction.reply({
            content:         `The phrase "${phrase}" has been removed from the <@&${role}> notification list.`,
            allowedMentions: {
                roles: false
            }
        });
    } else {
        await interaction.reply({ content: `The phrase "${phrase}" has been removed from your notification list.` });
    }
}

async function dumpPhrasesCommand(interaction: ChatInputApplicationCommandInteraction<AnyTextableGuildChannel>, target?: string): Promise<void> {
    const phrases = target === undefined ? await getAllPhrases() : await getPhrasesFor(target);
    const texts: Array<string> = [];
    let text = "";
    for (const [mention, values] of Object.entries(phrases)) {
        for (const value of values) {
            const t = `<@${mention}>: ${value}`;
            if (t.length + text.length < 1950) {
                text += `${t}\n`;
            } else {
                texts.push(text);
                text = `${t}\n`;
            }
        }
    }

    if (text.length !== 0) {
        texts.push(text);
    }

    const first = texts.shift();
    if (first === undefined) {
        await interaction.reply({ content: "No phrases are registered." });
        return;
    }
    const allowedMentions: AllowedMentions = { users: [], roles: [] };
    await interaction.reply({ content: `The following phrases are registered:\n${first}`, allowedMentions });
    for (const content of texts) {
        await interaction.reply({ content, allowedMentions });
    }
}

async function whoisCommand(interaction: CommandInteraction<AnyTextableGuildChannel>): Promise<void> {
    if (!checkStaff(interaction)) {
        await interaction.reply({ content: "You don't have permission to use that.", flags: MessageFlags.EPHEMERAL });
        return;
    }

    const flags = interaction.channel.parentID === null || !config.staffCategories.includes(interaction.channel.parentID) ? MessageFlags.EPHEMERAL : 0;
    await interaction.defer(flags);
    let id: string | number;
    // the getAll function expects a number if we're starting from a user id, and a string if we're starting
    // from a Discord id. There aren't any Discord accounts with an id shorter than 17 characters
    if (interaction.isChatInputCommand()) {
        id = interaction.data.options.getString("user", true).replace(/<@!?/, "").replace(">", "");
    } else {
        if (!(interaction.data.target instanceof User)) {
            await interaction.reply({
                content: "Invalid user.",
                flags
            });
            return;
        }
        id = interaction.data.target.id;
    }

    if (!/^\d+$/.test(id)) {
        const members = await interaction.guild.searchMembers({ query: id });
        if (members.length === 0) {
            await interaction.reply({
                content: "I couldn't find that user.",
                flags
            });
            return;
        }
        id = members[0].id;
    }

    if (id.length < 17) {
        id =  Number(id);
        if (isNaN(id)) {
            await interaction.reply({
                content: "Invalid user.",
                flags
            });
            return;
        }
    }

    const { discord, e6 } = await getAll(id);
    const userNames = await idToName(...e6);

    if (discord.length === 0 && e6.length === 0) {
        await interaction.reply({
            content: "I couldn't find anyone with that ID.",
            flags
        });
        return;
    }

    let text: string;
    if (typeof id === "number") {
        text = `[${userNames[id]}](${config.baseURL}/users/${id})<${id}>'s site and discord accounts:\n`;
    } else {
        text = `<@${id}>'s site and discord accounts:\n`;
    }

    for (const uid of e6) {
        text += `• ${config.baseURL}/users/${uid} (\`${userNames[uid]}\`)\n`;
    }

    for (const did of discord) {
        text += `•• <@${did}>\n`;
    }

    await interaction.reply({
        content:         text,
        allowedMentions: {
            everyone:    false,
            repliedUser: false,
            roles:       false,
            users:       false
        },
        flags
    });
}

async function renameCommand(interaction: CommandInteraction<AnyTextableGuildChannel>): Promise<void> {
    if (!checkStaff(interaction)) {
        await interaction.reply({ content: "You don't have permission to use that.", flags: MessageFlags.EPHEMERAL });
        return;
    }

    const flags = interaction.channel.parentID === null || !config.staffCategories.includes(interaction.channel.parentID) ? MessageFlags.EPHEMERAL : 0;
    await interaction.defer(flags);
    const channelID = interaction.data.options.getString("channel", true);
    const name = interaction.data.options.getString("name", true);
    if (!channelsToRename.map(ch => ch[1]).includes(channelID)) {
        await interaction.reply({
            content: "I couldn't find that channel.",
            flags
        });
        return;
    }

    try {
        await interaction.client.rest.channels.edit(channelID, { name, reason: `Command (${interaction.user.tag})` });

        await interaction.reply({
            content: `Renamed <#${channelID}> to ${name}.`,
            flags
        });
    } catch (err) {
        if (err instanceof RateLimitedError) {
            const retryAt = Math.floor((Date.now() + err.delay) / 1000);
            await interaction.reply({
                content: `You're doing that too fast. Retry <t:${retryAt}:R>.`,
                flags
            });
            return;
        }
        await interaction.reply({
            content: `Something went wrong when renaming <#${channelID}>:\n\`\`\`\n${String(err)}\n\`\`\``,
            flags
        });
    }
}

async function syncCommand(interaction: CommandInteraction): Promise<void> {
    let user_id = interaction.data.options.getNumber("user_id");

    const { e6 } = await getAll(interaction.user.id);
    const names = await idToName(...e6);
    user_id ??= e6[0];

    if (!user_id || !e6.includes(user_id)) {
        await interaction.reply({
            content: "I couldn't find that user.",
            flags:   MessageFlags.EPHEMERAL
        });
        return;
    }

    await interaction.client.rest.guilds.editMember(config.guildID, interaction.user.id, { nick: normalizeName(names[user_id]) })
        .then(() => interaction.reply({
            content: "Your name has been synced.",
            flags:   MessageFlags.EPHEMERAL
        })).catch(err => {
            Logger.getLogger("SyncCommand").error(err);
            return interaction.reply({
                content: "There was an error syncing your name.",
                flags:   MessageFlags.EPHEMERAL
            });
        });
}

async function roleAutocomplete(interaction: AutocompleteInteraction<AnyTextableGuildChannel>): Promise<void>{
    const roles = config.phraseRoles.map(id => interaction.guild.roles.get(id) ?? { id, name: id });
    return interaction.result(roles.map (r => ({
        name:  r.name,
        value: r.id
    })));
}

// To create initial thread creation message:
// curl -X POST -H "Authorization: Bot [TOKEN]" -H "Content-Type: application/json" --data-raw '{"content":"[MESSAGE CONTENT]","components":[{"type":1,"components":[{"type":2,"style":1,"label":"[BUTTON TEXT]","custom_id":"open-ticket"}]}]}' https://discord.com/api/v10/channels/[CHANNEL]/messages
// Replace:
// * [TOKEN] - The bot client's token
// * [MESSAGE CONTENT] - The content to be shown with the message. This can be removed entirely
// * [BUTTON TEXT] - The text to show on the button
// * [CHANNEL] - The id of the channel to send the message to
// You can also change the color of the button by changing `style` to 2, 3, or 4.
// See: https://discord.com/developers/docs/interactions/message-components#button-object-button-styles
async function openTicketComponent(interaction: ComponentInteraction<ComponentTypes.BUTTON, AnyTextableGuildChannel>): Promise<void> {
    const timeout = await Redis.get(`ticket-timeout:${interaction.user.id}`);
    if (timeout) {
        await interaction.reply({ content: "You can only create one ticket per day.", flags: MessageFlags.EPHEMERAL });
        return;
    }

    return interaction.createModal({
        customID:   "open-ticket-modal",
        title:      "Get in contact",
        components: [
            {
                type:       ComponentTypes.ACTION_ROW,
                components: [
                    {
                        type:        ComponentTypes.TEXT_INPUT,
                        customID:    "ticket-message",
                        label:       "What is the subject of your ticket?",
                        style:       TextInputStyles.PARAGRAPH,
                        placeholder: "Please be as thorough as possible.",
                        required:    true,
                        maxLength:   1500,
                        minLength:   10
                    }
                ]
            }
        ]
    });
}

async function closeTicketComponent(interaction: ComponentInteraction<ComponentTypes.BUTTON, AnyTextableGuildChannel>): Promise<void> {
    if (interaction.channel.type !== ChannelTypes.PRIVATE_THREAD) {
        Logger.getLogger("CloseTicket").warn("Attempted to close a ticket in a non-thread channel.");
        await interaction.reply({ content: "Whoops. Something went wrong. Please report this to a staff member.", flags: MessageFlags.EPHEMERAL });
        return;
    }

    await interaction.defer(MessageFlags.EPHEMERAL);
    try {
        await interaction.channel.createMessage({
            content:         `This ticket has been closed by ${interaction.user.mention}`,
            allowedMentions: { users: false }
        });
    } catch (err) {
        Logger.getLogger("CloseTicket").error("Failed to create closing message for ticket:");
        Logger.getLogger("CloseTicket").error(err);
        await interaction.reply({ content: "Something went wrong. Please report this to a staff member.", flags: MessageFlags.EPHEMERAL });
        return;
    }

    await interaction.reply({ content: "Ticket closed.", flags: MessageFlags.EPHEMERAL });
    try {
        await interaction.channel.edit({ archived: true, locked: true });
    } catch (err) {
        Logger.getLogger("CloseTicket").error("Failed to close ticket:");
        Logger.getLogger("CloseTicket").error(err);
        await interaction.reply({ content: "Something failed. Please report this to a staff member.", flags: MessageFlags.EPHEMERAL });
    }
}


async function submitTicketModal(interaction: ModalSubmitInteraction<AnyTextableGuildChannel>): Promise<void> {
    await Redis.setex(`ticket-timeout:${interaction.user.id}`, 60 * 60 * 24, "1");
    await interaction.defer(MessageFlags.EPHEMERAL);

    const message = interaction.data.components.getTextInput("ticket-message", true);

    let channel: PrivateThreadChannel;
    try {
        channel = await interaction.client.rest.channels.startThreadWithoutMessage<PrivateThreadChannel>(interaction.channel.id, {
            type:      ChannelTypes.PRIVATE_THREAD,
            name:      `${interaction.member.tag}'s Ticket`,
            invitable: false
        });
    } catch (err) {
        Logger.getLogger("SubmitTicket").error("Failed to create ticket thread:");
        Logger.getLogger("SubmitTicket").error(err);
        await Redis.del(`ticket-timeout:${interaction.user.id}`);
        await interaction.reply({ content: "Failed to create a ticket. Please report this to a staff member.", flags: MessageFlags.EPHEMERAL });
        return;
    }

    try {
        await channel.createMessage({
            content:    `${interaction.member.mention} feel free to direct your questions at any <@&${config.roles.privateHelpHelper}>. Only you and staff members can see this channel.\n\n**Reason for contact:**\n${message}`,
            components: [
                {
                    type:       ComponentTypes.ACTION_ROW,
                    components: [
                        {
                            type:     ComponentTypes.BUTTON,
                            customID: "close-ticket",
                            label:    "Click here if you no longer need help",
                            style:    ButtonStyles.DANGER
                        }
                    ]
                }
            ],
            flags: MessageFlags.EPHEMERAL
        });
    } catch (err) {
        Logger.getLogger("SubmitTicket").error("Failed to create ticket message:");
        Logger.getLogger("SubmitTicket").error(err);
        try {
            await channel.addMember(interaction.user.id);
        } catch (err2) {
            Logger.getLogger("SubmitTicket").error("Failed to add user to thread:");
            Logger.getLogger("SubmitTicket").error(err2);
            await Redis.del(`ticket-timeout:${interaction.user.id}`);
            await interaction.reply({ content: "Failed to create a ticket. Please report this to a staff member.", flags: MessageFlags.EPHEMERAL });
            return;
        }
    }

    await interaction.reply({ content: `Your ticket has been created: ${channel.mention}`, flags: MessageFlags.EPHEMERAL });
}
