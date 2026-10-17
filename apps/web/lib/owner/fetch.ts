// How the owner's screens call the API. The session is an httpOnly cookie set by the PIN, so
// every call is a plain fetch; a 401 sends the owner back to the PIN screen.

/** The owner's PIN has expired or was never entered. */
export class SignedOutError extends Error {
  constructor() {
    super("The owner is not signed in.");
    this.name = "SignedOutError";
  }
}

/** A request the shop refused, with its HTTP status, so a screen can say why in the owner's words. */
export class RequestError extends Error {
  readonly status: number;

  constructor(url: string, status: number) {
    super(`${url} failed: HTTP ${status}`);
    this.name = "RequestError";
    this.status = status;
  }
}

export async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  if (response.status === 401) throw new SignedOutError();
  if (!response.ok) throw new RequestError(url, response.status);
  return (await response.json()) as T;
}

export function post<T>(url: string, body: unknown): Promise<T> {
  return call<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** A recording or a photo, as the one file of a form. */
export function upload<T>(url: string, field: string, file: Blob, name: string): Promise<T> {
  const form = new FormData();
  form.append(field, file, name);
  return call<T>(url, { method: "POST", body: form });
}
