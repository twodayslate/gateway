import { TError } from "./types";

/**
 * A function to stream response
 *
 * @param body - The response body to be streamed.
 *
 * @returns A response with the streamed body.
 */
export async function streamResponse(body: ReadableStream<Uint8Array> | null) {
  if (!body) {
    return Response.json(<TError>{ error: "No body to stream!" }, { status: 500 });
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
 * check if the value is not null or undefined in typesafe way.
 * @param value - The value to check
 * @returns the value.
 */
export function isNotNullOrUndefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * A function to convert a string to an environment variable key.
 *
 * @param str - The string to convert to an environment variable key.
 * @param suffix - The suffixes to add
 *
 * @returns The environment variable key.
 */
export function toEnvKey(str: string, ...suffix: (string | null | undefined)[]) {
  const s = `${str.replace(/[^a-zA-Z0-9]/g, "_")}_API_KEY`;

  return suffix
    .filter(isNotNullOrUndefined)
    .reduce((a, c) => a + `_${c}`, s)
    .toUpperCase();
}
