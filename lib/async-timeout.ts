/** Evita colgar el request si Supabase Auth no responde (red lenta en tienda). */
export async function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race<T | null>([
      Promise.resolve(promise),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
