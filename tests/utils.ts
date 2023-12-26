import Database from "better-sqlite3";
import { D1Database, D1DatabaseAPI } from "@miniflare/d1";
import * as fs from "fs";

export const BINDINGS = getMiniflareBindings();

export function getMockOpenAI() {
  const fetchMock = getMiniflareFetchMock();
  fetchMock.disableNetConnect();

  return fetchMock.get("http://api.openai.com");
}

export function getMockShodan() {
  const fetchMock = getMiniflareFetchMock();
  fetchMock.disableNetConnect();

  return fetchMock.get("http://api.shodan.io");
}

export async function setInMemoryD1Database() {
  const db = new Database(":memory:");
  const migrations = fs.opendirSync("./migrations");

  for await (const file of migrations) {
    db.exec(fs.readFileSync(`./migrations/${file.name}`, "utf-8"));
  }

  return new D1Database(new D1DatabaseAPI(db));
}
