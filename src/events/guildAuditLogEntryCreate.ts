import ClientEvent from "../util/ClientEvent.js";
import config from "../config.js";
import { formatJumpLink, is, ucwords } from "../util/util.js";
import type DiscordBot from "../client.js";
import {
    AuditLogActionTypes,
    type AuditLogChange,
    type AuditLogEntry,
    type AuditLogEntryOptions,
    DiscordRESTError,
    type EmbedOptions,
    JSONErrorCodes,
    OverwriteTypes,
    Permission,
    type PermissionName,
    type RoleAuditLogChange,
    RoleFlags,
    type StandardAuditLogChange
} from "oceanic.js";
import assert from "node:assert";

export default new ClientEvent("guildAuditLogEntryCreate", async function(guild, entry) {
    if (guild.id !== config.guildID || !shouldLog(this, entry)) {
        return;
    }

    const embed: EmbedOptions = {
        title:  ucwords(AuditLogActionTypes[entry.actionType].replaceAll("_", " ").toLowerCase()),
        fields: [{
            name:   "Actor",
            value:  `<@${entry.userID!}>`,
            inline: true
        }]
    };

    if (entry.targetID !== null) {
        embed.fields!.push({
            name:   "Target",
            value:  formatTarget(entry.actionType, entry.targetID),
            inline: true
        });
    }

    if (entry.reason !== undefined) {
        embed.fields!.push({
            name:   "Reason",
            value:  entry.reason,
            inline: true
        });
    }

    if (entry.changes !== undefined && entry.changes.length !== 0) {
        embed.fields!.push({
            name:  "Changes",
            value: formatChanges(entry.changes)
        });
    }

    if (entry.options !== undefined) {
        embed.fields!.push({
            name:  "Options",
            value: formatOptions(entry.actionType, entry.options)
        });
    }


    await this.rest.channels.createMessage(config.channels.auditLog, {
        embeds: [embed]
    })
        .catch(async err => {
            // if the message failed to send because it was too large, attempt to send it again but as an attached text file
            if (err instanceof DiscordRESTError && err.code === JSONErrorCodes.INVALID_FORM_BODY) {
                let full = "";
                for (const field of embed.fields!) {
                    if (!["Actor", "Target", "Reason"].includes(field.name)) {
                        embed.fields!.splice(embed.fields!.indexOf(field), 1);
                        full += `==${field.name}==\n${field.value}\n\n`;
                    }

                    await this.rest.channels.createMessage(config.channels.auditLog, {
                        embeds: [embed],
                        files:  full === "" ? [] : [
                            {
                                name:     "auditlog.txt",
                                contents: Buffer.from(full)
                            }
                        ]
                    });
                }
            }
        });
});

function formatTarget(action: AuditLogActionTypes, target: string): string {
    switch (action) {
        case AuditLogActionTypes.MEMBER_UPDATE:
        case AuditLogActionTypes.MEMBER_KICK:
        case AuditLogActionTypes.MEMBER_BAN_ADD:
        case AuditLogActionTypes.MEMBER_BAN_REMOVE:
        case AuditLogActionTypes.MEMBER_ROLE_UPDATE:
        case AuditLogActionTypes.MESSAGE_DELETE:
        case AuditLogActionTypes.MESSAGE_PIN:
        case AuditLogActionTypes.MESSAGE_UNPIN:
            return `<@${target}>`;

        case AuditLogActionTypes.CHANNEL_CREATE:
        case AuditLogActionTypes.CHANNEL_UPDATE:
        case AuditLogActionTypes.CHANNEL_DELETE:
        case AuditLogActionTypes.THREAD_CREATE:
        case AuditLogActionTypes.THREAD_UPDATE:
        case AuditLogActionTypes.THREAD_DELETE:
        case AuditLogActionTypes.CHANNEL_OVERWRITE_CREATE:
        case AuditLogActionTypes.CHANNEL_OVERWRITE_UPDATE:
        case AuditLogActionTypes.CHANNEL_OVERWRITE_DELETE:
        case AuditLogActionTypes.VOICE_CHANNEL_STATUS_CREATE:
        case AuditLogActionTypes.VOICE_CHANNEL_STATUS_DELETE:
            return `<#${target}>`;

        case AuditLogActionTypes.ROLE_CREATE:
        case AuditLogActionTypes.ROLE_UPDATE:
        case AuditLogActionTypes.ROLE_DELETE:
            return `<@&${target}>`;

        default:
            return target;
    }
}

const IgnoredActions = new Set([
    AuditLogActionTypes.MEMBER_MOVE,
    AuditLogActionTypes.AUTO_MODERATION_FLAG_TO_CHANNEL
]);

// determine if we should log an audit log entry
function shouldLog(client: DiscordBot, entry: AuditLogEntry): boolean {
    // if the entry has no blamed user, ignore it
    if (entry.userID === null) {
        return true;
    }

    // there's a few actions we don't care about regardless
    if (IgnoredActions.has(entry.actionType)) {
        return false;
    }

    // if the action is a role update, we do further checks
    if (entry.actionType === AuditLogActionTypes.MEMBER_ROLE_UPDATE) {
        return shouldLogRoleChanges(client, entry.changes as Array<RoleAuditLogChange>);
    }

    return true;
}

function formatChanges(changes: Array<AuditLogChange>): string {
    let result = "";
    for (const change of changes) {
        const fmt = formatChange(change);
        if (fmt) {
            result += `${fmt}\n`;
        }
    }

    return result.slice(0, -1);
}

function formatChange(change: AuditLogChange): string {
    if (["$add", "$remove"].includes(change.key)) {
        return formatMemberRoleChange(change as RoleAuditLogChange);
    }

    assert(is<StandardAuditLogChange>(change));

    // timeout
    if (change.key === "communication_disabled_until") {
        return formatTimeoutChange(change);
    }

    // role permissions/channel overwrites
    if (["permissions", "allow", "deny"].includes(change.key)) {
        return formatPermissionOrOverwrites(change.key, new Permission(change.old_value as string || "0"), new Permission(change.new_value as string || "0"));
    }

    // generic changes
    if (change.new_value !== undefined && change.old_value === undefined) {
        return `Set ${change.key} to ${String(change.new_value)}`;
    } else if (change.new_value === undefined && change.old_value !== undefined) {
        return `Changed ${change.key} from ${String(change.old_value)} to default/null`;
    } else {
        return `Changed ${change.key} from ${String(change.old_value)} to ${String(change.new_value)}`;
    }
}

function formatMemberRoleChange(change: RoleAuditLogChange): string {
    let result = "";
    for (const { id: role } of change.new_value) {
        if (change.key === "$add") {
            result += `Added role <@&${role}>\n`;
        } else {
            result += `Removed role <@&${role}>\n`;
        }
    }

    return result.slice(0, -1);
}

function formatTimeoutChange(change: StandardAuditLogChange): string {
    // old value will be null if the timeout has been removed
    if ("old_value" in change) {
        return "Timeout removed";
    } else {
        const d = new Date(change.new_value as string);
        return `Timeout until <t:${Math.floor(d.getTime() / 1000)}:F>`;
    }
}

function formatPermissionOrOverwrites(key: string, oldPermissions: Permission, newPermissions: Permission): string {
    switch (key) {
        // role
        case "permissions": return formatPermissionChange(oldPermissions, newPermissions, "Removed", "Added");
        // channel overwrite
        case "allow": return formatPermissionChange(oldPermissions, newPermissions, "Allow removed", "Allow added");
        case "deny": return formatPermissionChange(oldPermissions, newPermissions, "Deny removed", "Deny added");
        default: return formatPermissionChange(oldPermissions, newPermissions, `${key} removed`, `${key} added`);
    }
}

function formatPermissionChange(oldPermissions: Permission, newPermissions: Permission, oldDescription: string, newDescription: string): string {
    const added: Array<PermissionName> = [],
        removed: Array<PermissionName> = [],
        oldPermNames = Object.entries(oldPermissions.json).filter(([,v]) => v).map(([v]) => v) as Array<PermissionName>,
        newPermNames = Object.entries(newPermissions.json).filter(([,v]) => v).map(([v]) => v) as Array<PermissionName>;

    // get all removed permissions
    for (const perm of oldPermNames) {
        if (!newPermNames.includes(perm)) {
            removed.push(perm);
        }
    }

    // get all added permissions
    for (const perm of newPermNames) {
        if (!oldPermNames.includes(perm)) {
            added.push(perm);
        }
    }

    let result = "";
    if (added.length !== 0) {
        result += `${newDescription}: ${added.join(", ")}\n`;
    }
    if (removed.length !== 0) {
        result += `${oldDescription}: ${removed.join(", ")}\n`;
    }

    return result.slice(0, -1);
}

// we ignore roles which are in boarding
function shouldLogRoleChanges(client: DiscordBot, changes: Array<RoleAuditLogChange>): boolean {
    const changedRoleIDs = changes.flatMap(r => r.new_value.map(v => v.id));
    for (const id of changedRoleIDs) {
        const role = client.guilds.get(config.guildID)?.roles.get(id);
        console.log(role);
        if (role === undefined || (role.flags & RoleFlags.IN_PROMPT) === 0) {
            return true;
        }
    }

    return false;
}

function formatOptions(action: AuditLogActionTypes, options: AuditLogEntryOptions): string {
    if ([AuditLogActionTypes.MESSAGE_PIN, AuditLogActionTypes.MESSAGE_UNPIN].includes(action)) {
        return formatMessagePin(options.channelID!, options.messageID!);
    }

    if ([AuditLogActionTypes.CHANNEL_OVERWRITE_CREATE, AuditLogActionTypes.CHANNEL_OVERWRITE_UPDATE, AuditLogActionTypes.CHANNEL_OVERWRITE_DELETE].includes(action)) {
        return formatChannelOverwrite(options.id!, options.type!);
    }

    let result = "";
    for (const [key, value] of Object.entries(options)) {
        if (value === undefined) {
            continue;
        }
        if (key === "channelID") {
            result += `channel: <#${value}>\n`;
        } else {
            result += `${key}: ${value}\n`;
        }
    }

    return result.slice(0, -1);
}

function formatMessagePin(channelID: string, messageID: string): string {
    return `message: ${formatJumpLink(config.guildID, channelID, messageID)}`;
}

function formatChannelOverwrite(id: string, targetType: `${OverwriteTypes}`): string {
    switch (targetType) {
        case `${OverwriteTypes.ROLE}`: return `<@&${id}>`;
        case `${OverwriteTypes.MEMBER}`: return `<@${id}>`;
        default: return id;
    }
}
