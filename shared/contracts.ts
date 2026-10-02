import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const DevSpaceStateSchema = z.enum(["stopped", "starting", "running", "stopping", "failed"]);

export const DevSpaceStatusSchema = z.object({
  detected: z.boolean(),
  configFile: z.string().nullable(),
  state: DevSpaceStateSchema,
  pid: z.number().int().positive().nullable(),
  links: z.array(z.url()),
  message: z.string().nullable(),
  logs: z.array(z.string()),
});

const ProjectInputSchema = z.object({ directory: z.string().min(1) });

export const GetDevSpaceStatusRpc = defineRpc({
  name: "devspace.status",
  input: ProjectInputSchema,
  output: DevSpaceStatusSchema,
});

export const StartDevSpaceRpc = defineRpc({
  name: "devspace.start",
  input: ProjectInputSchema,
  output: DevSpaceStatusSchema,
});

export const StopDevSpaceRpc = defineRpc({
  name: "devspace.stop",
  input: ProjectInputSchema,
  output: DevSpaceStatusSchema,
});
