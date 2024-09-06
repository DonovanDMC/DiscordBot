import ClientEvent from "../util/ClientEvent.js";
import Logger from "../Logger.js";

export default new ClientEvent("error", async function(info) {
    Logger.getLogger("Client").error(info);
});
