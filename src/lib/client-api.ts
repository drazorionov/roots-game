export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function api(
  path: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
) {
  let response: Response;
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 20000);
  try {
    response = await fetch(`/api/${path}`, {
      method,
      signal: controller.signal,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Unable to connect. Please try again.");
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Something went wrong. Please retry.");
  }
  if (!response.ok)
    throw new ApiError(
      data.error || "Something went wrong. Please retry.",
      response.status,
    );
  return data;
}
