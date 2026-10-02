import { execFile, spawn, type ChildProcess } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import type { output as ZodOutput } from "zod";
import { DevSpaceStatusSchema } from "../shared/contracts";
import { extractCaddySiteUrls, extractHttpUrls, extractLocalPorts, extractPortForwards, resolveCaddyUrls } from "./discovery";

const execFileAsync = promisify(execFile);
const CONFIG_NAMES = ["devspace.yaml", "devspace.yml"] as const;
const MAX_LOG_LINES = 80;

type DevSpaceStatus = ZodOutput<typeof DevSpaceStatusSchema>;

/** Mutable runtime session; process lifecycle is its purpose. */
type Session = {
  child: ChildProcess;
  state: "starting" | "running" | "stopping" | "failed";
  links: Set<string>;
  logs: string[];
  message: string | null;
};

const sessions = new Map<string, Session>();

export async function getDevSpaceStatus(directory: string): Promise<DevSpaceStatus> {
  const cwd = resolve(directory);
  const configFile = await findConfig(cwd);
  const session = sessions.get(cwd);
  if (session !== undefined && isAlive(session.child)) {
    if (session.state === "starting" && session.logs.length > 0) session.state = "running";
    await addPortLinks(cwd, session);
    return snapshot(configFile, session, await discoverCaddyLinks(cwd, configFile, session.logs));
  }
  if (session !== undefined && session.state === "failed") return snapshot(configFile, session);
  sessions.delete(cwd);
  return idle(configFile);
}

export async function startDevSpace(directory: string): Promise<DevSpaceStatus> {
  const cwd = resolve(directory);
  const configFile = await findConfig(cwd);
  if (configFile === null) return idle(null, "Nenhum devspace.yaml ou devspace.yml encontrado neste projeto.");
  const current = sessions.get(cwd);
  if (current !== undefined && isAlive(current.child)) return snapshot(configFile, current);

  const child = spawn("devspace", ["dev", "--no-colors"], {
    cwd,
    env: { ...process.env, NO_COLOR: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const session: Session = { child, state: "starting", links: new Set(), logs: [], message: "DevSpace está iniciando." };
  sessions.set(cwd, session);
  collectOutput(child.stdout, session);
  collectOutput(child.stderr, session);
  child.once("spawn", () => { session.message = "DevSpace iniciou; aguardando serviços e port forwards."; });
  child.once("error", (error) => {
    session.state = "failed";
    session.message = `Falha ao iniciar DevSpace: ${error.message}`;
    appendLog(session, error.message);
  });
  child.once("exit", (code, signal) => {
    if (session.state === "stopping") {
      session.message = "DevSpace parado.";
      sessions.delete(cwd);
      return;
    }
    if (code === 0) {
      sessions.delete(cwd);
      return;
    }
    session.state = "failed";
    session.message = `DevSpace encerrou com ${signal === null ? `código ${code ?? "desconhecido"}` : `sinal ${signal}`}.`;
  });
  return snapshot(configFile, session);
}

export async function stopDevSpace(directory: string): Promise<DevSpaceStatus> {
  const cwd = resolve(directory);
  const configFile = await findConfig(cwd);
  const session = sessions.get(cwd);
  if (session === undefined || !isAlive(session.child)) {
    sessions.delete(cwd);
    return idle(configFile, "DevSpace já está parado.");
  }
  session.state = "stopping";
  session.message = "Parando DevSpace e port forwards...";
  session.child.kill("SIGINT");
  const stopped = await waitForExit(session.child, 8_000);
  if (!stopped) session.child.kill("SIGTERM");
  if (!stopped && !(await waitForExit(session.child, 3_000))) {
    session.state = "failed";
    session.message = "DevSpace não respondeu a SIGINT ou SIGTERM; verifique o processo manualmente.";
    return snapshot(configFile, session);
  }
  sessions.delete(cwd);
  return idle(configFile, "DevSpace parado.");
}

export async function shutdownAll(): Promise<void> {
  await Promise.all([...sessions.keys()].map(stopDevSpace));
}

async function findConfig(directory: string): Promise<string | null> {
  for (const name of CONFIG_NAMES) {
    try {
      await access(join(directory, name));
      return name;
    } catch (error) {
      if (!isMissingFile(error)) throw error;
    }
  }
  return null;
}

function collectOutput(stream: NodeJS.ReadableStream | null, session: Session): void {
  if (stream === null) return;
  stream.setEncoding("utf8");
  stream.on("data", (chunk: string) => {
    for (const line of chunk.split(/\r?\n/u).filter(Boolean)) appendLog(session, line);
    for (const url of extractHttpUrls(chunk)) session.links.add(url);
  });
}

function appendLog(session: Session, line: string): void {
  session.logs.push(line.replace(/\u001b\[[0-9;]*m/gu, ""));
  if (session.logs.length > MAX_LOG_LINES) session.logs.splice(0, session.logs.length - MAX_LOG_LINES);
}

async function addPortLinks(directory: string, session: Session): Promise<void> {
  try {
    const { stdout } = await execFileAsync("devspace", ["list", "ports", "--output", "json", "--no-colors"], {
      cwd: directory,
      timeout: 3_000,
      maxBuffer: 512_000,
    });
    const value: unknown = JSON.parse(stdout);
    for (const port of extractLocalPorts(value)) session.links.add(`http://localhost:${port}`);
  } catch (error) {
    if (!(error instanceof Error)) throw error;
  }
}

async function discoverCaddyLinks(directory: string, configFile: string | null, logs: readonly string[]): Promise<readonly string[]> {
  if (configFile === null) return [];
  try {
    const [caddyfile, config] = await Promise.all([
      readFile(join(directory, "Caddyfile"), "utf8"),
      readFile(join(directory, configFile), "utf8"),
    ]);
    return resolveCaddyUrls(extractCaddySiteUrls(caddyfile), extractPortForwards(`${config}\n${logs.join("\n")}`));
  } catch (error) {
    if (isMissingFile(error)) return [];
    throw error;
  }
}

function snapshot(configFile: string | null, session: Session, preferredLinks: readonly string[] = []): DevSpaceStatus {
  return {
    detected: configFile !== null,
    configFile,
    state: session.state,
    pid: session.child.pid ?? null,
    links: preferredLinks.length > 0 ? [...preferredLinks] : [...session.links].sort(),
    message: session.message,
    logs: session.logs.slice(-20),
  };
}

function idle(configFile: string | null, message: string | null = null): DevSpaceStatus {
  return { detected: configFile !== null, configFile, state: "stopped", pid: null, links: [], message, logs: [] };
}

function isAlive(child: ChildProcess): boolean {
  return child.pid !== undefined && child.exitCode === null && child.signalCode === null;
}

function waitForExit(child: ChildProcess, timeoutMs: number): Promise<boolean> {
  if (!isAlive(child)) return Promise.resolve(true);
  return new Promise((resolvePromise) => {
    const timer = setTimeout(() => resolvePromise(false), timeoutMs);
    child.once("exit", () => {
      clearTimeout(timer);
      resolvePromise(true);
    });
  });
}

function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
