import type { PluginServerContext } from "@getpaseo/plugin/server";
import { GetDevSpaceStatusRpc, StartDevSpaceRpc, StopDevSpaceRpc } from "./shared/contracts";
import { createCleanup } from "./server/cleanup";
import { getDevSpaceStatus, shutdownAll, startDevSpace, stopDevSpace } from "./server/devspace";

export default function contribute(server: PluginServerContext) {
  server.handle(GetDevSpaceStatusRpc, ({ directory }) => getDevSpaceStatus(directory));
  server.handle(StartDevSpaceRpc, ({ directory }) => startDevSpace(directory));
  server.handle(StopDevSpaceRpc, ({ directory }) => stopDevSpace(directory));
  return createCleanup(shutdownAll);
}
