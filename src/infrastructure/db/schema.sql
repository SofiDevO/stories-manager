CREATE TABLE IF NOTEXIST stories(
    id TEXT primary key,
    video_url TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXIST comments(
    id TEXT PRIMARY KEY,

)