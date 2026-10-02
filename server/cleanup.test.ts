import { describe, expect, test } from "bun:test";
import { createCleanup } from "./cleanup";

describe("plugin cleanup", () => {
  test("is safe when server-only cleanup was stripped from client bundle", async () => {
    await expect(createCleanup(undefined)()).resolves.toBeUndefined();
  });

  test("runs cleanup inside server plugin process", async () => {
    let called = false;
    await createCleanup(async () => { called = true; })();
    expect(called).toBe(true);
  });
});
