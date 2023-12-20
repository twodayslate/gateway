-- Migration number: 0000 	 2023-12-20T02:07:03.645Z

DROP TABLE IF EXISTS requests;

CREATE TABLE requests
(
    id                    SERIAL PRIMARY KEY,
    user_agent            TEXT,
    cf_connecting_ip      TEXT,
    cf_ip_country         TEXT,
    service_id            INTEGER,
    service_name          TEXT,
    identifier_for_vendor TEXT,
    bundle_identifier     TEXT,
    url                   TEXT,
    headers               JSON,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

