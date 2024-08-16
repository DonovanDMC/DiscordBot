import "dotenv/config.js";
import DiscordBot from "./client.js";

const bot = new DiscordBot();
await bot.connect();
