import ClientEvent from "../util/ClientEvent.js";
import config from "../config.js";
import Logger from "../Logger.js";

export default new ClientEvent("threadCreate", async function(thread) {
    if (thread.guildID !== config.guildID) {
        return;
    }

    // We join all threads so we can ensure we get message events
    // eslint-disable-next-line unicorn/require-array-join-separator
    await thread.join()
        .catch(err => {
            Logger.getLogger("ThreadCreate").error("Failed to join thread:");
            Logger.getLogger("ThreadCreate").error(err);
        });
});
