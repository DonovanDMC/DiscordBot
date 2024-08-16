import config from "../config.js";
import ClientEvent from "../util/ClientEvent.js";

export default new ClientEvent("voiceChannelLeave", async function(member, channel) {
    await this.rest.channels.createMessage(config.channels.voiceLog, {
        content:         `<@${member.id}> left ${channel === null ? "a channel" : `<#${channel.id}>`}`,
        allowedMentions: {
            users: false
        }
    });
});
