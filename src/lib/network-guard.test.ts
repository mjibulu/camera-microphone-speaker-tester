import { createExternalRequestGuard } from "./network-guard";

describe("external request guard", () => {
  it("permits the application origin", () => {
    const guard = createExternalRequestGuard("https://tool.example/");
    guard.inspect("https://tool.example/assets/app.js");
    expect(() => guard.assertNoExternalRequests()).not.toThrow();
  });

  it("fails a request to another origin", () => {
    const guard = createExternalRequestGuard("https://tool.example/");
    guard.inspect("https://external.example/collect");
    expect(() => guard.assertNoExternalRequests()).toThrow(
      /Unexpected external request/u,
    );
  });
});
