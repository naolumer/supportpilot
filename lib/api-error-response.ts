type Handler<TArgs extends unknown[]> = (...args: TArgs) => Promise<Response>;

export function withApiErrors<TArgs extends unknown[]>(handler: Handler<TArgs>): Handler<TArgs> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      const errorCode = typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : "";
      const message = error instanceof Error ? error.message : "";
      const databaseUnavailable = errorCode === "P1001" || errorCode === "ETIMEDOUT" || /database server|connection timed out/i.test(message);

      console.error("API request failed:", error);
      return Response.json(
        { error: databaseUnavailable
          ? "The database is unreachable. Check that your Neon project is active and DATABASE_URL is current."
          : "The server could not complete this request. Check the server logs and retry." },
        { status: databaseUnavailable ? 503 : 500 },
      );
    }
  };
}
