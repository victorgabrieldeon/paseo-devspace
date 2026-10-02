import type { PluginClientContext } from "@getpaseo/plugin/client";
import { DevSpaceManagerSurface } from "./client/manager";

export default function contribute(client: PluginClientContext) {
  client.addSurface("manager", DevSpaceManagerSurface);
  client.addSidebarItem({ id: "manager", title: "DevSpace", icon: "Rocket", surface: "manager" });
  return () => {};
}
