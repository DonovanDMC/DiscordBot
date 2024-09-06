import config from "../config.js";
import ClientEvent from "../util/ClientEvent.js";

export default new ClientEvent("voiceChannelLeave", async function(member, channel) {
    // if the previous voice state was not cached, we will not know the channel they were in
    await this.rest.channels.createMessage(config.channels.voiceLog, {
        content:         `${member.mention} left ${channel === null ? "a channel" : `<#${channel.id}>`}`,
        allowedMentions: {
            users: false
        }
    });
});
