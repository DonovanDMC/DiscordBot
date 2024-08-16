import config from "../config.js";
import ClientEvent from "../util/ClientEvent.js";

export default new ClientEvent("voiceChannelJoin", async function(member, channel) {
    await this.rest.channels.createMessage(config.channels.voiceLog, {
        content:         `<@${member.id}> joined <#${channel.id}>`,
        allowedMentions: {
            users: false
        }
    });
});
