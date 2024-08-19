import "dotenv/config";
const env = <R extends boolean = false>(key: string, required?: R): R extends true ? string : string | undefined => {
    const v = process.env[key];
    if (!v && required) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return v as never;
};
const config = {
    discordToken:  env("DISCORD_TOKEN", true),
    redis:         env("REDIS_URL") || "redis://localhost:6379",
    redisChannels: {
        tickets: env("REDIS_CHANNEL_TICKETS") || "ticket_updates"
    },
    guildID: env("GUILD_ID", true),
    roles:   {
        member:            env("MEMBER_ROLE_ID", true),
        privateHelpHelper: env("PRIVATE_HELP_HELPER_ROLE_ID", true),
        staff:             env("STAFF_ROLE_ID", true),
    },
    channels: {
        auditLog:  env("AUDIT_LOG_CHANNEL_ID", true),
        event:     env("EVENT_CHANNEL_ID", true),
        general:  env("GENERAL_CHANNEL_ID", true),
        newMember: env("NEW_MEMBER_CHANNEL_ID", true),
        ticket:    env("TICKET_CHANNEL_ID", true),
        voiceLog:  env("VOICE_LOG_CHANNEL_ID", true),
    },
    baseURL:                env("BASE_URL", true),
    fetchURL:               env("FETCH_URL", true),
    fetchSecret:            env("FETCH_SECRET", true),
    blacklistedTags:        env("BLACKLISTED_TAGS")?.split(",") || [],
    blacklistedNonSafeTags: env("BLACKLISTED_NON_SAFE_TAGS")?.split(",") || [],
    staffCategories:        env("STAFF_CATEGORIES")?.split(",") || [],
    safeChannels:           env("SAFE_CHANNELS")?.split(",") || [],
    phraseRoles:            env("PHRASE_ROLES")?.split(",") || []
};
export default config;
