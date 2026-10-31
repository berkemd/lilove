export function withCredentialDeadline<T>(
  operation: () => Promise<T>,
  timeoutError: () => Error
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => {
      reject(timeoutError());
    }, 15000);
  });

  const operationPromise = Promise.resolve().then(operation);

  const race = Promise.race([operationPromise, timeoutPromise]);

  return (async () => {
    try {
      return await race;
    } finally {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    }
  })();
}
