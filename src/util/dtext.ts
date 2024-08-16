import config from "../config.js";

const replacements: Array<[RegExp, (match: string, ...args: Array<string>) => string]> = [
    [/post changes #(\d+)/gi, (_match: string, id: string) => `<${config.baseURL}/post_versions?search[post_id]=${id}>`],
    [/flag #(\d+)/gi, (_match: string, id: string) => `<${config.baseURL}/post_flags/${id}>`],
    [/note #(\d+)/gi, (_match: string, id: string) => `<${config.baseURL}/notes/${id}>`],
    // TODO: post # catching " post" & "post" here
    [/forum(?: ?post)? #(\d+)/gi, (_match: string, id: string) => `<${config.baseURL}/forum_posts/${id}>`],
    //  [/(?:forum )?topic #(\d+)\/p(\d+)/gi, (_match: string, id: string, page: string) => `<${config.baseURL}/forum_topics/${id}?page=${page}>`],
    [/(?:forum )?topic #(\d+)/gi, (_match: string, id: string) => `<${config.baseURL}/forum_topics/${id}>`],
    [/comment #(\d+)/gi, (_match: string, id: string) => `<${config.baseURL}/comments/${id}>`],
    [/pool #(\d+)/gi, (_match: string, id: string) => `<${config.baseURL}/pools/${id}>`],
    [/user #(\d+)/gi, (_match: string, id: string) => `<${config.baseURL}/users/${id}>`],
    [/artist #(\d+)/gi, (_match: string, id: string) => `<${config.baseURL}/artists/${id}>`],
    [/ban #(\d+)/gi, (_match: string, id: string) => `<${config.baseURL}/bans/${id}>`],
    [/bur #(\d+)/gi, (_match: string, id: string) => `<${config.baseURL}/bulk_update_requests/${id}>`],
    [/alias #(\d+)/gi, (_match: string, id: string) => `<${config.baseURL}/tag_aliases/${id}>`],
    [/implication #(\d+)/gi, (_match: string, id: string) => `<${config.baseURL}/tag_implications/${id}>`],
    [/mod action #(\d+)/gi, (_match: string, id: string) => `<${config.baseURL}/mod_actions/${id}>`],
    [/record #(\d+)/gi, (_match: string, id: string) => `<${config.baseURL}/user_feedbacks/${id}>`],
    [/wiki(?: ?page)? #(\d+)/gi, (_match: string, id: string) => `<${config.baseURL}/wiki_pages/${id}>`],
    [/set #(\d+)/gi, (_match: string, id: string) => `<${config.baseURL}/post_sets/${id}>`],
    [/ticket #(\d+)/gi, (_match: string, id: string) => `<${config.baseURL}/tickets/${id}>`],
    [/take ?down(?: request)? #(\d+)/gi, (_match: string, id: string) => `<${config.baseURL}/takedowns/${id}>`],
    [/\[\[(\d+)]]/gi, (_match: string, id: string) => `<${config.baseURL}/wiki_pages/${id}>`],
    [/\[\[([\S ]+)]]/gi, (_match: string, title: string) => `<${config.baseURL}/wiki_pages/show_or_new?title=${title.replaceAll(" ", "_")}>`],
    [/{{([\S ]+)}}/gi, (_match: string, tags: string) => `<${config.baseURL}/posts?tags=${tags.replaceAll(" ", "%20")}>`]
];

export function formatDtext(text: string) {
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
