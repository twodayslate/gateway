-- Migration number: 0001 	 2023-12-27T04:07:34.039Z


CREATE TABLE temp_requests
(
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    user_agent            TEXT,
    cf_connecting_ip      TEXT,
    cf_ip_country         TEXT,
    service_id            TEXT,
    service_name          TEXT,
    identifier_for_vendor TEXT,
    bundle_identifier     TEXT,
    url                   TEXT,
    headers               JSON,
    status_code           INTEGER,
    error                 TEXT,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO temp_requests
(user_agent,
 cf_connecting_ip,
 cf_ip_country,
 service_id,
 service_name,
 identifier_for_vendor,
 bundle_identifier,
 url,
 headers,
 status_code)
SELECT user_agent,
       cf_connecting_ip,
       cf_ip_country,
       CAST(service_id as TEXT),
       service_name,
       identifier_for_vendor,
       bundle_identifier,
       url,
       headers,
       status_code
FROM requests;

DROP TABLE requests;

ALTER TABLE temp_requests
    RENAME TO requests;

