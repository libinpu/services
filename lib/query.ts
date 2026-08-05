/** Shared safeguards for requests that may be triggered by focus, auth, or Realtime. */
const inFlight = new Map<string, Promise<unknown>>();

export async function dedupeRequest<T>(key: string, request: () => PromiseLike<T>): Promise<T> {
  const current = inFlight.get(key) as Promise<T> | undefined;
  if (current) return current;

  const promise = Promise.resolve(request()).finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

export async function retryRequest<T>(request: () => Promise<T>, attempts = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= attempts; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
    }
  }
  throw lastError;
}
