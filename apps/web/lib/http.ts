// One shape for every API route: logic lives in lib/, a route only parses, calls and answers.

/** An error the caller should see, with the HTTP status that explains it. */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

/**
 * Runs a route's work and turns failures into JSON. Expected failures (HttpError) keep their
 * status and message; anything else is logged for us and shown to the caller as a plain 500.
 */
export async function handle(work: () => Promise<Response>): Promise<Response> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof HttpError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

/** Parses a JSON body with a Zod-like schema, or answers 400. */
export async function readJson<T>(
  request: Request,
  schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } },
): Promise<T> {
  const body: unknown = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new HttpError(400, "That request was not in the expected shape.");
  return parsed.data;
}
