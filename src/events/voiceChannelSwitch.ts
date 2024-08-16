import config from "../config.js";
import ClientEvent from "../util/ClientEvent.js";

export default new ClientEvent("voiceChannelSwitch", async function(member, channel, oldChannel) {
    await this.rest.channels.createMessage(config.channels.voiceLog, {
        content:         `<@${member.id}> moved from ${oldChannel === null ? "a channel" : `<#${oldChannel.id}>`} to <#${channel.id}>`,
        allowedMentions: {
            users: false
        }
    });
});
