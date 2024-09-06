import config from "../config.js";

const replacements: Array<[RegExp, (match: string, ...args: Array<string>) => string]> = [
    // post changes #1
    [/post changes #(\d+)/gi, (_match: string, id: string): string => `<${config.baseURL}/post_versions?search[post_id]=${id}>`],
    // flag #1
    [/flag #(\d+)/gi, (_match: string, id: string): string => `<${config.baseURL}/post_flags/${id}>`],
    // note #1
    [/note #(\d+)/gi, (_match: string, id: string): string => `<${config.baseURL}/notes/${id}>`],
    // forum post #1, forumpost #1, forum #1
    [/forum(?: ?post)? #(\d+)/gi, (_match: string, id: string): string => `<${config.baseURL}/forum_posts/${id}>`],
    // forum topic #1, topic #1
    [/(?:forum )?topic #(\d+)/gi, (_match: string, id: string): string => `<${config.baseURL}/forum_topics/${id}>`],
    // comment #1
    [/comment #(\d+)/gi, (_match: string, id: string): string => `<${config.baseURL}/comments/${id}>`],
    // pool #1
    [/pool #(\d+)/gi, (_match: string, id: string): string => `<${config.baseURL}/pools/${id}>`],
    // user #1
    [/user #(\d+)/gi, (_match: string, id: string): string => `<${config.baseURL}/users/${id}>`],
    // artist #1
    [/artist #(\d+)/gi, (_match: string, id: string): string => `<${config.baseURL}/artists/${id}>`],
    // ban #1
    [/ban #(\d+)/gi, (_match: string, id: string): string => `<${config.baseURL}/bans/${id}>`],
    // bur #1
    [/bur #(\d+)/gi, (_match: string, id: string): string => `<${config.baseURL}/bulk_update_requests/${id}>`],
    // alias #1
    [/alias #(\d+)/gi, (_match: string, id: string): string => `<${config.baseURL}/tag_aliases/${id}>`],
    // implication #1
    [/implication #(\d+)/gi, (_match: string, id: string): string => `<${config.baseURL}/tag_implications/${id}>`],
    // mod action #1
    [/mod action #(\d+)/gi, (_match: string, id: string): string => `<${config.baseURL}/mod_actions/${id}>`],
    // record #1
    [/record #(\d+)/gi, (_match: string, id: string): string => `<${config.baseURL}/user_feedbacks/${id}>`],
    // wiki page #1, wikipage #1, wiki #1
    [/wiki(?: ?page)? #(\d+)/gi, (_match: string, id: string): string => `<${config.baseURL}/wiki_pages/${id}>`],
    // set #1
    [/set #(\d+)/gi, (_match: string, id: string): string => `<${config.baseURL}/post_sets/${id}>`],
    // ticket #1
    [/ticket #(\d+)/gi, (_match: string, id: string): string => `<${config.baseURL}/tickets/${id}>`],
    // take down request #1, takedown request #1, take down #1, takedown #1
    [/take ?down(?: request)? #(\d+)/gi, (_match: string, id: string): string => `<${config.baseURL}/takedowns/${id}>`],
    // [[title]]
    [/\[\[([\S ]+?)(?:\|[\S ]+)?]]/gi, (_match: string, title: string): string => `<${config.baseURL}/wiki_pages/show_or_new?title=${title.replaceAll(" ", "_")}>`],
    // {{tags}}
    [/{{([\S ]+?)(?:\|[\S ]+)?}}/gi, (_match: string, tags: string): string => `<${config.baseURL}/posts?tags=${tags.replaceAll(" ", "%20")}>`]
];

export function formatDtext(text: string): string {
    let result = "";
    // Don't parse the same text twice, give priority to earlier entries
    const ignore: Array<string> = [];
    for (const [regex, replacement] of replacements) {
        inner: for (const match of text.matchAll(regex)) {
            if (ignore.includes(match[0])) {
                continue inner;
            }
            ignore.push(match[0]);
            result += `${match[0].replaceAll(regex, replacement)}\n`;
        }
    }

    return result;
}
