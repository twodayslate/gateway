# gateway

* Run the development `server npm run start``
* Deploy your application `npm run deploy``
* Read the documentation https://developers.cloudflare.com/workers
* Stuck? Join us at https://discord.gg/cloudflaredev

## Configuration

| Header  | Description |
| ------------- | ------------- |
| `x-gateway-service-host` | The host for the API request|
| `x-gateway-service-token` | The API token to use if not in the environment variables|
| `x-gateway-service-auth-key` | The authorization key for the request. This is used in combined with `x-gateway-service-auth-type`. If `x-gateway-service-auth-type` is `HEADER` then this value will be used as the HTTP header; if  `x-gateway-service-auth-type` then this value will be the query field. |
| `x-gateway-service-auth-type` | The authorization type. This is either `HEADER` to add the token to the requests header or `QUERY` to add it to the requests parameters.|
| `x-gateway-service-auth-prefix` | Any prefix for the token. A space is appeneded after this prefix. |

### Example

If you want to use [Bearer/token authentication](https://swagger.io/docs/specification/authentication/bearer-authentication/) then you will need to set the following headers appropriately:

| Header | Value |
| ------ | ----- |
| `x-gateway-service-auth-key` | `Authorization` |
| `x-gateway-service-auth-type` | `HEADER` |
| `x-gateway-service-auth-prefix` | `Bearer` |

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
