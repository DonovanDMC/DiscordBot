import ClientEvent from "../util/ClientEvent.js";
import config from "../config.js";
import { idToName, normalizeName } from "../util/util.js";
import { getAllFromDiscord } from "../util/userFetcher.js";
import Logger from "../Logger.js";

export default new ClientEvent("guildMemberAdd", async function(member) {
    if (member.guildID !== config.guildID) {
        return;
    }


    // get all of the user's discord and e6 accounts
    const { discord, e6 } = await getAllFromDiscord(member.id);
    // bulk fetch the usernames of the e6 accounts
    const userNames = await idToName(...e6);

    let text = `${member.mention}'s site and discord accounts:\n`;

    for (const uid of e6) {
        text += `• ${config.baseURL}/users/${uid} (\`${userNames[uid]}\`)\n`;
    }

    for (const did of discord) {
        text += `•• <@${did}>\n`;
    }

    await member.client.rest.channels.createMessage(config.channels.newMember, {
        content:         text,
        allowedMentions: {
            everyone:    false,
            repliedUser: false,
            roles:       false,
            users:       false
        }
    });

    // set the user's nickname to the name of their first e6 account
    await member.edit({ nick: normalizeName(userNames[e6[0]]) })
        .catch(err => {
            Logger.getLogger("GuildMemberAdd").error("Failed to set nickname:");
            Logger.getLogger("GuildMemberAdd").error(err);
        });
});
