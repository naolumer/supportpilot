export async function readApiResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) {
    throw new Error(`The server returned an empty response (HTTP ${response.status}). Check the server and database connection, then retry.`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`The server returned an invalid response (HTTP ${response.status}). Check the server logs and database connection, then retry.`);
  }
}
