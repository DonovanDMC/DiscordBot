CREATE TABLE IF NOT EXISTS messages (
    id          INTEGER PRIMARY KEY ON CONFLICT REPLACE,
    author_id   INTEGER NOT NULL,
    author_name TEXT NOT NULL,
    channel_id  INTEGER NOT NULL,
    attachments TEXT NOT NULL,
    stickers    TEXT NOT NULL,
    content     TEXT NOT NULL
)
