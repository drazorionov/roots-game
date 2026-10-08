export async function api(path: string, method = "GET", body?: unknown) {
  let response: Response;
  try {
    response = await fetch(`/api/${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Unable to connect. Please try again.");
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Something went wrong. Please retry.");
  }
  if (!response.ok)
    throw new Error(data.error || "Something went wrong. Please retry.");
  return data;
}
