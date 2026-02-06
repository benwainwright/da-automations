type WaitForOptions = {
  intervalMs?: number;
  timeoutMs?: number;
};

export async function waitFor<T>(
  fn: () => Promise<T> | T,
  { intervalMs = 100, timeoutMs = 10_000 }: WaitForOptions = {},
): Promise<T> {
  const start = Date.now();
  let lastError: unknown;

  while (true) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (Date.now() - start >= timeoutMs) {
        throw lastError;
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
}
