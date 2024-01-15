import { BINDINGS, setInMemoryD1Database } from "./utils";
import delete_old_data_cron from "../src/crons/delete_old_data_cron";
import { Bindings } from "../src/bindings";
import { D1ResultMeta } from "../src/types";

describe("Test all the cron jobs", () => {
  beforeAll(async () => {
    BINDINGS["DB"] = await setInMemoryD1Database();
  });

  // seed the database with 100 rows to test cron jobs
  beforeEach(async () => {
    const db = BINDINGS["DB"];
    const stmt = db.prepare(`
      INSERT INTO requests(user_agent,
                           created_at,
                           cf_connecting_ip,
                           cf_ip_country,
                           service_id,
                           service_name,
                           identifier_for_vendor,
                           bundle_identifier,
                           url,
                           headers,
                           status_code,
                           error,
                           bundle_version)
      VALUES ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
              datetime('now', '-1 day'),
              '192.168.1.1',
              'US',
              'com.apple.assistant.assistantd',
              'Assistant',
              'com.apple.assistant.assistantd.00000000-0000-0000-0000-000000000000',
              'com.apple.assistant.assistantd',
              'https://www.open_ai.com',
              '{
                "Accept": "*/*",
                "Accept-Encoding": "gzip, deflate, br",
                "Accept-Language": "en-US,en;q=0.9",
                "Connection": "keep-alive"
              }',
              200,
              null,
              'unknown version')
  `);

    await db.batch(Array(100).fill(stmt));
  });

  it("should test delete_old_data_cron to delete data older than X days", async () => {
    // Change the value of DELETE_OLD_DATA_BEFORE to delete data older than 12 hours
    BINDINGS["DELETE_OLD_DATA_BEFORE"] = "-12 hours";

    const meta: D1ResultMeta = await delete_old_data_cron(<Bindings>BINDINGS);

    expect(meta.changes).toBe(100);
  });

  it("should not delete data that is not older than X days", async () => {
    // Change the value of DELETE_OLD_DATA_BEFORE to delete data older than 7 days
    BINDINGS["DELETE_OLD_DATA_BEFORE"] = "-7 day";

    const meta: D1ResultMeta = await delete_old_data_cron(<Bindings>BINDINGS);

    expect(meta.changes).toBe(0);
  });

});
