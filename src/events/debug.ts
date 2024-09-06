import ClientEvent from "../util/ClientEvent.js";
import Logger from "../Logger.js";

export default new ClientEvent("debug", async function(info) {
    Logger.getLogger("Client").debug(info);
});
