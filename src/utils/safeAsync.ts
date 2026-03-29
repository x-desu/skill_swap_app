export async function safeAsync(fn: Function) {
  try {
    const result = await fn();
    return [result, null];
  } catch (error) {
    return [null, error];
  }
}
