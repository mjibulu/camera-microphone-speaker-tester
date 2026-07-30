export interface ExternalRequestGuard {
  inspect(url: string): void;
  assertNoExternalRequests(): void;
  requests(): readonly string[];
}

export function createExternalRequestGuard(
  applicationOrigin: string,
): ExternalRequestGuard {
  const allowedOrigin = new URL(applicationOrigin).origin;
  const externalRequests = new Set<string>();

  return {
    inspect(url) {
      const parsed = new URL(url);
      if (parsed.origin !== allowedOrigin) {
        externalRequests.add(parsed.toString());
      }
    },
    assertNoExternalRequests() {
      const requests = [...externalRequests];
      if (requests.length > 0) {
        throw new Error(
          `Unexpected external request${requests.length === 1 ? "" : "s"}:\n${requests.join("\n")}`,
        );
      }
    },
    requests() {
      return [...externalRequests];
    },
  };
}
