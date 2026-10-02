import { afterEach, describe, expect, test } from "bun:test";
import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getDevSpaceStatus, shutdownAll, startDevSpace, stopDevSpace } from "./devspace";

const originalPath = process.env["PATH"];

afterEach(async () => {
  await shutdownAll();
  process.env["PATH"] = originalPath;
});

describe("DevSpace process manager", () => {
  test("detects, starts, reports links, and stops a project session", async () => {
    const root = await mkdtemp(join(tmpdir(), "paseo-devspace-test-"));
    const bin = join(root, "bin");
    await Bun.write(join(root, "devspace.yaml"), "version: v2beta1\nname: test\ndev:\n  caddy:\n    ports:\n      - port: '8080:80'\n");
    await Bun.write(join(root, "Caddyfile"), "http://api.test.localhost {\n  reverse_proxy api:3000\n}\n");
    await Bun.write(join(root, "create-bin.sh"), `#!/bin/sh\nmkdir -p "${bin}"\n`);
    await Bun.$`sh ${join(root, "create-bin.sh")}`.quiet();
    const executable = join(bin, "devspace");
    await writeFile(executable, `#!/bin/sh
if [ "$1" = "list" ]; then
  printf '{"forwards":[{"localPort":4321}]}\\n'
  exit 0
fi
printf 'Ready at http://localhost:3210\\n'
trap 'exit 0' INT TERM
while true; do sleep 1; done
`);
    await chmod(executable, 0o755);
    process.env["PATH"] = `${bin}:${originalPath ?? ""}`;

    expect((await getDevSpaceStatus(root)).detected).toBe(true);
    expect((await startDevSpace(root)).state).toBe("starting");
    await Bun.sleep(100);
    const running = await getDevSpaceStatus(root);
    expect(running.state).toBe("running");
    expect(running.links).toEqual(["http://api.test.localhost:8080/"]);
    expect(running.logs).toContain("Ready at http://localhost:3210");
    expect((await stopDevSpace(root)).state).toBe("stopped");
  });
});
