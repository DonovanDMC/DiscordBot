import ClientEvent from "../util/ClientEvent.js";
import config from "../config.js";
import { idToName } from "../util/util.js";
import { getAllFromDiscord } from "../util/userFetcher.js";

export default new ClientEvent("guildMemberAdd", async function(member) {
    if (member.guildID !== config.guildID) {
        return;
    }


    const { discord, e6 } = await getAllFromDiscord(member.id);
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
});
