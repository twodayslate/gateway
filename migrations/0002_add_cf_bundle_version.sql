-- Migration number: 0002 	 2024-01-03T01:58:44.126Z

ALTER TABLE requests ADD COLUMN cf_bundle_version TEXT;
