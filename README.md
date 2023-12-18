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
| `x-gateway-service-auth-key` | The authorization key for the request. This is used in combined with `x-gateway-service-auth-type`. If `authorization` and `x-gateway-service-auth-type` is `HEADER` then the standard bearer token format will be used.|
| `x-gateway-service-auth-type` | The authorization type. This is either `HEADER` to add the token to the requests header or `QUERY` to add it to the requests parameters.|

## Errors

If configured incorrectly a HTTP 400 JSON response will be returned. The format will be `{ "error": "<error message>" }`.