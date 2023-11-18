export const BINDINGS = getMiniflareBindings();

export function getMockOpenAI() {
  const fetchMock = getMiniflareFetchMock();
  fetchMock.disableNetConnect();

  return fetchMock.get("http://api.openai.com");
}
