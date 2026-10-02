import { describe, expect, test } from "bun:test";
import { extractCaddySiteUrls, extractHttpUrls, extractLocalPorts, extractPortForwards, resolveCaddyUrls } from "./discovery";

describe("DevSpace discovery", () => {
  test("extracts and deduplicates HTTP links from logs", () => {
    expect(extractHttpUrls("Open http://localhost:3000, then https://app.test/path. http://localhost:3000")).toEqual([
      "http://localhost:3000/",
      "https://app.test/path",
    ]);
  });

  test("finds local ports in nested DevSpace JSON", () => {
    expect(extractLocalPorts({ ports: [{ localPort: 3000 }, { local_port: "8080" }, { remotePort: 80 }] })).toEqual([3000, 8080]);
  });

  test("resolves Caddy hosts through DevSpace port forwards", () => {
    const caddyfile = `http://admin.futhub.localhost {
  reverse_proxy admin:3000
}

http://api.futhub.localhost {
  reverse_proxy api:3000
}`;
    const devspace = `ports:
  - port: '8080:80'`;

    expect(resolveCaddyUrls(extractCaddySiteUrls(caddyfile), extractPortForwards(devspace))).toEqual([
      "http://admin.futhub.localhost:8080/",
      "http://api.futhub.localhost:8080/",
    ]);
  });
});
