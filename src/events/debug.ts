import ClientEvent from "../util/ClientEvent.js";
import Logger from "@uwu-codes/logger";

export default new ClientEvent("debug", async function(info) {
    Logger.getLogger("Client").debug(info);
});
