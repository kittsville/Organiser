CREATE TABLE IF NOT EXISTS user_state (
    uuid uuid PRIMARY KEY,
    encrypted_raw_state bytea NOT NULL,
    expires timestamp NOT NULL
);
