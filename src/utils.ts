import { Error } from "./types";

/**
 * A function to stream response
 *
 * @param body - The response body to be streamed.
 *
 * @returns A response with the streamed body.
 */
export async function streamResponse(body: ReadableStream<Uint8Array> | null) {
  if (!body) {
    return Response.json(<Error>{ error: "No body to stream!" }, { status: 500 });
  }

  const { readable, writable } = new TransformStream();
  await body.pipeTo(writable);

  return new Response(readable, {
    headers: {
      "Content-Type": "application/json",
      "Transfer-Encoding": "chunked",
    },
  });
}

/**
 * A function to convert a string to an environment variable key.
 *
 * @param str - The string to convert to an environment variable key.
 *
 * @returns The environment variable key.
 */
export function toEnvKey(str: string) {
  return `${str.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase()}_API_KEY`;
}
