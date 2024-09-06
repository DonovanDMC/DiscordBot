import config from "../config.js";
import ClientEvent from "../util/ClientEvent.js";

export default new ClientEvent("voiceChannelSwitch", async function(member, channel, oldChannel) {
    // if the previous voice state was not cached, we will not know the channel they were previously in
    await this.rest.channels.createMessage(config.channels.voiceLog, {
        content:         `${member.mention} moved from ${oldChannel === null ? "a channel" : `<#${oldChannel.id}>`} to <#${channel.id}>`,
        allowedMentions: {
            users: false
        }
    });
});
