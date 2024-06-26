# gateway

* Run the development `server npm run start``
* Deploy your application `npm run deploy``
* Read the documentation https://developers.cloudflare.com/workers
* Stuck? Join us at https://discord.gg/cloudflaredev

## Configuration

| Header                          | Description                                                                                                                                                                                                                                                                                                                                                                                 |
|---------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `x-gateway-service-host`        | The host for the API request                                                                                                                                                                                                                                                                                                                                                                |
| `x-gateway-service-token`       | The API token to use if not in the environment variables                                                                                                                                                                                                                                                                                                                                    |
| `x-gateway-service-auth-key`    | The authorization key for the request. This is used in combined with `x-gateway-service-auth-type`. If `x-gateway-service-auth-type` is `HEADER` then this value will be used as the HTTP header; if  `x-gateway-service-auth-type` then this value will be the query field.                                                                                                                |
| `x-gateway-service-auth-type`   | The authorization type. This is either `HEADER` to add the token to the requests header or `QUERY` to add it to the requests parameters.                                                                                                                                                                                                                                                    |
| `x-gateway-service-auth-prefix` | Any prefix for the token. A space is appeneded after this prefix.                                                                                                                                                                                                                                                                                                                           |
| `x-gateway-service-type`        | Indicates if the downstream service is `GATEWAY` or `DIRECT`.                                                                                                                                                                                                                                                                                                                               |
| `x-gateway-service-proxy`       | Needed only when `x-gateway-service-type` is `GATEWAY`. The format should be `GATEWAY;SERVICE`, for example, if the GATEWAY is `CLOUDFLARE AI` and the service is `MISTRAL`, then it should be `CLOUDFLARE AI;MISTRAL`. Note that this proxy header will be used to resolve the Cloudflare secret in the environment by replacing all non-alphanumeric characters with an underscore (`_`). |

### Example

* If you want to use [Bearer/token authentication](https://swagger.io/docs/specification/authentication/bearer-authentication/) then you will need to set the following headers appropriately:

| Header | Value |
| ------ | ----- |
| `x-gateway-service-auth-key` | `Authorization` |
| `x-gateway-service-auth-type` | `HEADER` |
| `x-gateway-service-auth-prefix` | `Bearer` |

* If you want to use a gateway service where the host remains constant but different API keys are used depending on the specific service within the gateway, follow these steps.
For example, if you're using the Cloudflare AI gateway with the OpenAI service, and you have the Cloudflare secret for this service set as `CLOUDFLARE_AI_OPEN_AI_API_KEY = sk-your-api-key`, then make a request with the following headers:

| Header                          | Value                       |
|---------------------------------|-----------------------------|
| `x-gateway-service-auth-key`    | `Authorization`             |
| `x-gateway-service-auth-type`   | `HEADER`                    |
| `x-gateway-service-auth-prefix` | `Bearer`                    |
| `x-gateway-service-type`        | `GATEWAY`                   |
| `x-gateway-service-host`        | `gateway.ai.cloudflare.com` |
| `x-gateway-service-proxy`       | `CLOUDFLARE AI;OPEN AI`     |

```http request
POST https://gateway.your-subdomain.workers.dev/v1/{account_id}/{gateway_id}/openai/chat/completions
x-gateway-service-auth-key: Authorization
x-gateway-service-auth-type: HEADER
x-gateway-service-auth-prefix: Bearer
x-gateway-service-type: GATEWAY
x-gateway-service-proxy: CLOUDFLARE AI;OPEN AI
x-gateway-service-host: gateway.ai.cloudflare.com
Content-Type: application/json

{
  "model": "gpt-3.5-turbo",
  "messages": [
    {
      "role": "user",
      "content": "What is AI?"
    }
  ]
}
```


## Errors

If configured incorrectly a HTTP 400 JSON response will be returned. The format will be `{ "error": "<error message>" }`.

## Logging

Metadata is collected for every request. This metadata is used to detect abuse and to help prevent unauthorized access.

All headers are recorded as a JSON blob. Known sensitive headers are stripped from the blob. In addition, the following request header fields are recorded separately:

| Header | Description |
| ------ | ----------- |
| `user-agent` | The user agent. |
| [`cf-connecting-ip`](https://developers.cloudflare.com/fundamentals/reference/http-request-headers/#cf-connecting-ip) | The client IP address connecting to Cloudflare to the origin web server. |
| [`cf-ipcountry`](https://developers.cloudflare.com/fundamentals/reference/http-request-headers/#cf-ipcountry) | The two-character country code of the originating visitor’s country. |
| `x-gateway-service-id` | The requested service's identifier. |
| `x-gateway-service-name` | The requested service's human readable name. |
| `x-gateway-identifier-for-vendor` | An alphanumeric string that uniquely identifies a device to the connecting application’s vendor. |
| `x-gateway-bundle-identifier` | The connecting application's bundle identifier. |
| `x-gateway-bundle-version` | The connecting applications version number. |

The following is also recorded:
* Full URL of the request
* Responses status code
* Any server specific errors

## Data Retention

All metadata is kept for a configured amount of period. Beyond this timeframe, the metadata undergoes permanent deletion with **no backup procedures in place.**

To achieve this, a cron job executes every Sunday 12:00 AM(configurable), targeting metadata older than configured period for deletion. The configuration for this cron job is stored in the [`wrangler.toml`](./wrangler.toml) file, specifically under the `triggers` section.

The cron job is designed to respect the `DELETE_OLD_DATA_BEFORE` environment variable. If this variable is not set, the cron job will intentionally **generate an SQL error**, preventing the deletion of any data.

#### DELETE_OLD_DATA_BEFORE variable Format

```
[sign] quantity unit
```

- `sign`: Optional. Use `+` for addition and `-` for subtraction.
- `quantity`: Numeric value.
- `unit`: Time unit (`year(s)`, `month(s)`, `day(s)`, `hour(s)`, `minute(s)`, `second(s)`).

