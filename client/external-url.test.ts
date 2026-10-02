import { describe, expect, test } from "bun:test";
import { openExternalHttpUrl } from "./external-url";

describe("DevSpace links", () => {
  test("prefers Paseo desktop system-browser bridge", async () => {
    const calls: string[] = [];

    await openExternalHttpUrl("http://api.futhub.localhost:8080/", {
      platform: "web",
      desktopOpen: (url) => { calls.push(`desktop:${url}`); },
      browserOpen: (url) => { calls.push(`browser:${url}`); },
      nativeOpen: (url) => { calls.push(`native:${url}`); },
    });

    expect(calls).toEqual(["desktop:http://api.futhub.localhost:8080/"]);
  });

  test("uses native opener on mobile", async () => {
    const calls: string[] = [];

    await openExternalHttpUrl("https://example.com", {
      platform: "android",
      browserOpen: (url) => { calls.push(`browser:${url}`); },
      nativeOpen: (url) => { calls.push(`native:${url}`); },
    });

    expect(calls).toEqual(["native:https://example.com"]);
  });

  test("rejects non-HTTP protocols", async () => {
    await expect(openExternalHttpUrl("file:///etc/passwd", {
      platform: "web",
      browserOpen: () => undefined,
      nativeOpen: () => undefined,
    })).rejects.toThrow("Only HTTP and HTTPS links can be opened");
  });
});
