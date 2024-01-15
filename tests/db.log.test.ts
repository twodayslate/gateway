import { BINDINGS, getMockOpenAI, setInMemoryD1Database } from "./utils";
import { app } from "../src";
import { RequestModel } from "../src/d1/models";


describe("it should have all the request logged to the requests table", () => {
  // This is a hack to make sure that the database is initialized before the tests are run
  beforeAll(async () => {
    BINDINGS["DB"] = await setInMemoryD1Database();
  });

  it("should have all the successful request logged in the database", async () => {
    const { DB } = BINDINGS;
    const context = new ExecutionContext();

    for (let i = 0; i < 10; i++) {
      const status = i % 2 === 0 ? 200 : 400;
      const body = i % 2 === 0 ? "Hello World!" : "Bad Request!";

      getMockOpenAI()
        .intercept({
          method: "POST",
          path: `/v1/chat/completions?temperature=${0.1 * i}`,
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${BINDINGS["API_OPENAI_COM_API_KEY"]}`,
          },
          body: undefined,
        })
        .reply(status, body);

      await app.request(
        `/v1/chat/completions?temperature=${0.1 * i}`,
        {
          method: "POST",
          headers: {
            "x-gateway-service-host": "api.openai.com",
            "x-gateway-service-token": BINDINGS["API_OPENAI_COM_API_KEY"],
            "x-gateway-service-auth-type": "HEADER",
            "x-gateway-service-auth-key": "Authorization",
            "x-gateway-service-auth-prefix": "Bearer",
            "content-type": "application/json",
            "x-gateway-identifier-for-vendor": "logging-successful-requests",
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: `This is a test for ${i}!` }],
            temperature: 0.1 * i,
          }),
        },
        BINDINGS,
        context,
      );
    }

    await getMiniflareWaitUntil(context);

    const { results }: { results: RequestModel[] } = await DB.prepare(
      `
        SELECT *
        FROM requests
        WHERE identifier_for_vendor = ?1
    `,
    )
      .bind("logging-successful-requests")
      .all();

    // Test if the requests are logged in the database
    expect(results.length).toBeGreaterThanOrEqual(10);
    expect(results.filter((request) => request.status_code === 200).length).toBeGreaterThanOrEqual(5);

    // Test if the error is logged in the database
    const failed = results.filter((request) => request.status_code === 400);
    expect(failed.length).toBeGreaterThanOrEqual(5);
    expect(failed.map((request) => request.error)).toStrictEqual(Array.from({ length: 5 }, () => "Bad Request!"));
  });
});
