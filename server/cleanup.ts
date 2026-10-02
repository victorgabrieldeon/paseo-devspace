export function createCleanup(serverCleanup: (() => Promise<void>) | undefined): () => Promise<void> {
  return async () => {
    await serverCleanup?.();
  };
}
