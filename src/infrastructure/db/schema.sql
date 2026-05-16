CREATE TABLE IF NOT EXISTS stories (
    id          TEXT PRIMARY KEY,
    video_url   TEXT NOT NULL,
    created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS comments (
    id          TEXT PRIMARY KEY,
    story_id    TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    ip_address  TEXT NOT NULL,
    created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS likes (
    story_id    TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    ip_address  TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    PRIMARY KEY (story_id, ip_address)
);

CREATE TABLE IF NOT EXISTS admins (
    username        TEXT PRIMARY KEY,
    password_hash   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS banned_ips (
    ip_address  TEXT PRIMARY KEY,
    reason      TEXT,
    banned_at   TEXT NOT NULL
);